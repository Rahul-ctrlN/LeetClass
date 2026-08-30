const fs = require('fs/promises');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'classrooms.json');

async function readStudents(ownerId) {
  try { const db = JSON.parse(await fs.readFile(dataPath, 'utf8')); return (db.students || []).filter(student => student.ownerId === ownerId); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function writeStudents(ownerId, students) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  let db = { users: [], students: [] };
  try { db = JSON.parse(await fs.readFile(dataPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  db.students = (db.students || []).filter(student => student.ownerId !== ownerId).concat(students.map(student => ({ ...student, ownerId })));
  await fs.writeFile(dataPath, JSON.stringify(db, null, 2));
}

module.exports = { readStudents, writeStudents };
