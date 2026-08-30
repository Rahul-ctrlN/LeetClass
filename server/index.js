const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { readStudents, writeStudents } = require('./store');
const { usernameFrom, fetchProfile } = require('./leetcodeService');
const auth = require('./auth');
const publicDir = path.join(__dirname, '..', 'public');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml' };
const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type });
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
};
async function body(req) { let text=''; for await (const part of req) text += part; try { return JSON.parse(text || '{}'); } catch { throw new Error('Invalid request body.'); } }
function ranked(students) { return [...students].sort((a,b) => (b.statistics.totalSolved-a.statistics.totalSolved) || ((b.statistics.acceptanceRate||0)-(a.statistics.acceptanceRate||0)) || ((b.statistics.mediumSolved+b.statistics.hardSolved)-(a.statistics.mediumSolved+a.statistics.hardSolved))).map((s,index) => ({...s, rank:index+1})); }
function requireUser(req, res) { const user = auth.currentUser(req); if (!user) { send(res, 401, { error:'Please sign in to access your classroom.' }); return null; } return user; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/auth/me' && req.method === 'GET') { const user = auth.currentUser(req); return send(res, 200, { authenticated:Boolean(user), user, googleConfigured:auth.configured() }); }
    if (url.pathname === '/auth/google' && req.method === 'GET') return auth.beginGoogle(res);
    if (url.pathname === '/auth/google/callback' && req.method === 'GET') return auth.finishGoogle(url, req, res);
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') { auth.clearSession(req, res); return send(res, 204, ''); }
    if (url.pathname === '/api/students' && req.method === 'GET') { const user=requireUser(req,res); if(!user)return; return send(res, 200, ranked(await readStudents(user.id))); }
    if (url.pathname === '/api/students' && req.method === 'POST') {
      const user=requireUser(req,res); if(!user)return; const input = await body(req); const username = usernameFrom(input.profileUrl); const students = await readStudents(user.id);
      if (students.some(s => s.leetcodeUsername.toLowerCase() === username.toLowerCase())) return send(res, 409, { error:'This LeetCode profile is already in your classroom.' });
      if (!String(input.name||'').trim()) return send(res, 400, { error:'Please enter a student name.' });
      const statistics = await fetchProfile(input.profileUrl); const now = new Date().toISOString();
      const record = { id: crypto.randomUUID(), name: input.name.trim(), leetcodeUsername: statistics.username, leetcodeProfileUrl: `https://leetcode.com/u/${statistics.username}`, statistics, createdAt:now, updatedAt:now };
      students.push(record); await writeStudents(user.id, students); return send(res, 201, record);
    }
    const match = url.pathname.match(/^\/api\/students\/([^/]+)(\/refresh)?$/);
    if (match && req.method === 'DELETE') { const user=requireUser(req,res); if(!user)return; const students = await readStudents(user.id); const next=students.filter(s=>s.id!==match[1]); if(next.length===students.length)return send(res,404,{error:'Student not found.'}); await writeStudents(user.id,next); return send(res,204,''); }
    if (match && match[2] && req.method === 'POST') { const user=requireUser(req,res); if(!user)return; const students=await readStudents(user.id); const student=students.find(s=>s.id===match[1]); if(!student)return send(res,404,{error:'Student not found.'}); student.statistics=await fetchProfile(student.leetcodeProfileUrl); student.updatedAt=new Date().toISOString(); await writeStudents(user.id,students); return send(res,200,student); }
    if (url.pathname === '/api/refresh' && req.method === 'POST') { const user=requireUser(req,res); if(!user)return; const students=await readStudents(user.id); const results=[]; for(const student of students){ try{student.statistics=await fetchProfile(student.leetcodeProfileUrl);student.updatedAt=new Date().toISOString();results.push({id:student.id,ok:true});}catch(error){results.push({id:student.id,ok:false,error:error.message});} } await writeStudents(user.id,students);return send(res,200,{students:ranked(students),results}); }
    const appRoutes = new Set(['/', '/classroom', '/leaderboard', '/students']);
    const filePath = path.join(publicDir, appRoutes.has(url.pathname) ? 'index.html' : url.pathname);
    if (!filePath.startsWith(publicDir)) return send(res,403,'Forbidden','text/plain');
    let content = await fs.readFile(filePath);
    if (appRoutes.has(url.pathname) || url.pathname === '/index.html') content = Buffer.from(content.toString().replace('</body>', '<script src="/app-extra.js"></script></body>'));
    return send(res,200,content,types[path.extname(filePath)] || 'application/octet-stream');
  } catch (error) { if (error.code === 'ENOENT') return send(res,404,'Not found','text/plain'); send(res,400,{error:error.message || 'Something went wrong.'}); }
});
server.listen(process.env.PORT || 3000, () => console.log(`LeetClass is running at http://localhost:${process.env.PORT || 3000}`));
