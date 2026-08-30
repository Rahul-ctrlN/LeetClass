const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const { readStudents, writeStudents } = require('./store');
const { usernameFrom, fetchProfile } = require('./leetcodeService');
const auth = require('./auth');

const publicDir = path.join(__dirname, '..', 'public');

const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

function send(res, status, body, type = 'application/json') {
    res.writeHead(status, {
        'content-type': type
    });

    res.end(
        Buffer.isBuffer(body) || typeof body === 'string'
            ? body
            : JSON.stringify(body)
    );
}

async function body(req) {
    let text = '';

    for await (const part of req) {
        text += part;
    }

    try {
        return JSON.parse(text || '{}');
    } catch {
        throw new Error('Invalid request body.');
    }
}

function ranked(students) {
    return [...students]
        .sort(
            (a, b) =>
                (b.statistics.totalSolved - a.statistics.totalSolved) ||
                ((b.statistics.acceptanceRate || 0) -
                    (a.statistics.acceptanceRate || 0)) ||
                (
                    (b.statistics.mediumSolved + b.statistics.hardSolved) -
                    (a.statistics.mediumSolved + a.statistics.hardSolved)
                )
        )
        .map((student, index) => ({
            ...student,
            rank: index + 1
        }));
}

function requireUser(req, res) {
    const user = auth.currentUser(req);

    if (!user) {
        send(res, 401, {
            error: 'Please sign in to access your classroom.'
        });

        return null;
    }

    return user;
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(
            req.url,
            `http://${req.headers.host || 'localhost'}`
        );

        /* =========================
           CHECK LOGIN
        ========================= */

        if (
            url.pathname === '/api/auth/me' &&
            req.method === 'GET'
        ) {
            const user = auth.currentUser(req);

            return send(res, 200, {
                authenticated: Boolean(user),
                user
            });
        }

        /* =========================
           REGISTER
        ========================= */

        if (
            url.pathname === '/api/auth/register' &&
            req.method === 'POST'
        ) {
            const input = await body(req);

            const name = String(input.name || '').trim();
            const email = String(input.email || '').trim();
            const password = String(input.password || '');
            const confirmPassword =
                String(input.confirmPassword || '');

            if (!name) {
                return send(res, 400, {
                    error: 'Please enter your name.'
                });
            }

            if (!email || !email.includes('@')) {
                return send(res, 400, {
                    error: 'Please enter a valid email address.'
                });
            }

            if (password.length < 6) {
                return send(res, 400, {
                    error: 'Password must be at least 6 characters.'
                });
            }

            if (password !== confirmPassword) {
                return send(res, 400, {
                    error: 'Passwords do not match.'
                });
            }

            try {
                const user = await auth.register(
                    name,
                    email,
                    password
                );

                auth.setSession(res, user);

                return send(res, 201, {
                    user
                });
            } catch (error) {
                return send(res, 400, {
                    error:
                        error.message ||
                        'Unable to create account.'
                });
            }
        }

        /* =========================
           LOGIN
        ========================= */

        if (
            url.pathname === '/api/auth/login' &&
            req.method === 'POST'
        ) {
            const input = await body(req);

            const email = String(input.email || '').trim();
            const password = String(input.password || '');

            try {
                const user = await auth.login(
                    email,
                    password
                );

                auth.setSession(res, user);

                return send(res, 200, {
                    user
                });
            } catch (error) {
                return send(res, 401, {
                    error:
                        error.message ||
                        'Invalid email or password.'
                });
            }
        }

        /* =========================
           LOGOUT
        ========================= */

        if (
            url.pathname === '/api/auth/logout' &&
            req.method === 'POST'
        ) {
            auth.clearSession(req, res);

            return send(res, 204, '');
        }

        /* =========================
           GET STUDENTS
        ========================= */

        if (
            url.pathname === '/api/students' &&
            req.method === 'GET'
        ) {
            const user = requireUser(req, res);

            if (!user) return;

            const students =
                await readStudents(user.id);

            return send(
                res,
                200,
                ranked(students)
            );
        }

        /* =========================
           ADD STUDENT
        ========================= */

        if (
            url.pathname === '/api/students' &&
            req.method === 'POST'
        ) {
            const user = requireUser(req, res);

            if (!user) return;

            const input = await body(req);

            if (!String(input.name || '').trim()) {
                return send(res, 400, {
                    error: 'Please enter a student name.'
                });
            }

            if (!String(input.profileUrl || '').trim()) {
                return send(res, 400, {
                    error: 'Please enter a LeetCode profile URL.'
                });
            }

            let username;

            try {
                username = usernameFrom(
                    input.profileUrl
                );
            } catch {
                return send(res, 400, {
                    error: 'Invalid LeetCode profile URL.'
                });
            }

            const students =
                await readStudents(user.id);

            if (
                students.some(
                    student =>
                        student.leetcodeUsername.toLowerCase() ===
                        username.toLowerCase()
                )
            ) {
                return send(res, 409, {
                    error:
                        'This LeetCode profile is already in your classroom.'
                });
            }

            try {
                const statistics =
                    await fetchProfile(
                        input.profileUrl
                    );

                const now =
                    new Date().toISOString();

                const record = {
                    id: crypto.randomUUID(),

                    name: input.name.trim(),

                    leetcodeUsername:
                        statistics.username,

                    leetcodeProfileUrl:
                        `https://leetcode.com/u/${statistics.username}`,

                    statistics,

                    createdAt: now,

                    updatedAt: now
                };

                students.push(record);

                await writeStudents(
                    user.id,
                    students
                );

                return send(
                    res,
                    201,
                    record
                );
            } catch (error) {
                return send(res, 400, {
                    error:
                        error.message ||
                        'Unable to fetch LeetCode profile.'
                });
            }
        }

        /* =========================
           STUDENT ROUTES
        ========================= */

        const match = url.pathname.match(
            /^\/api\/students\/([^/]+)(\/refresh)?$/
        );

        /* DELETE */

        if (
            match &&
            req.method === 'DELETE'
        ) {
            const user =
                requireUser(req, res);

            if (!user) return;

            const students =
                await readStudents(user.id);

            const next =
                students.filter(
                    student =>
                        student.id !== match[1]
                );

            if (
                next.length ===
                students.length
            ) {
                return send(res, 404, {
                    error: 'Student not found.'
                });
            }

            await writeStudents(
                user.id,
                next
            );

            return send(res, 204, '');
        }

        /* REFRESH ONE */

        if (
            match &&
            match[2] &&
            req.method === 'POST'
        ) {
            const user =
                requireUser(req, res);

            if (!user) return;

            const students =
                await readStudents(user.id);

            const student =
                students.find(
                    item =>
                        item.id === match[1]
                );

            if (!student) {
                return send(res, 404, {
                    error: 'Student not found.'
                });
            }

            student.statistics =
                await fetchProfile(
                    student.leetcodeProfileUrl
                );

            student.updatedAt =
                new Date().toISOString();

            await writeStudents(
                user.id,
                students
            );

            return send(
                res,
                200,
                student
            );
        }

        /* =========================
           REFRESH ALL
        ========================= */

        if (
            url.pathname === '/api/refresh' &&
            req.method === 'POST'
        ) {
            const user =
                requireUser(req, res);

            if (!user) return;

            const students =
                await readStudents(user.id);

            const results = [];

            for (const student of students) {
                try {
                    student.statistics =
                        await fetchProfile(
                            student.leetcodeProfileUrl
                        );

                    student.updatedAt =
                        new Date().toISOString();

                    results.push({
                        id: student.id,
                        ok: true
                    });
                } catch (error) {
                    results.push({
                        id: student.id,
                        ok: false,
                        error: error.message
                    });
                }
            }

            await writeStudents(
                user.id,
                students
            );

            return send(res, 200, {
                students:
                    ranked(students),
                results
            });
        }

        /* =========================
           FRONTEND
        ========================= */

        const appRoutes = new Set([
            '/',
            '/classroom',
            '/leaderboard',
            '/students'
        ]);

        const requestedPath =
            decodeURIComponent(
                url.pathname
            );

        const filePath = path.join(
            publicDir,
            appRoutes.has(requestedPath)
                ? 'index.html'
                : requestedPath
        );

        if (!filePath.startsWith(publicDir)) {
            return send(
                res,
                403,
                'Forbidden',
                'text/plain'
            );
        }

        let content =
            await fs.readFile(filePath);

        if (
            appRoutes.has(requestedPath) ||
            requestedPath === '/index.html'
        ) {
            content = Buffer.from(
                content
                    .toString()
                    .replace(
                        '</body>',
                        '<script src="/app-extra.js"></script></body>'
                    )
            );
        }

        return send(
            res,
            200,
            content,
            types[
                path.extname(filePath)
            ] || 'application/octet-stream'
        );

    } catch (error) {
        console.error(error);

        if (error.code === 'ENOENT') {
            return send(
                res,
                404,
                'Not found',
                'text/plain'
            );
        }

        return send(
            res,
            500,
            {
                error:
                    error.message ||
                    'Something went wrong.'
            }
        );
    }
});


const PORT =
    process.env.PORT || 3000;

server.listen(
    PORT,
    () => {
        console.log(
            `LeetClass is running at http://localhost:${PORT}`
        );
    }
);