const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const cookieName = 'leetclass_session';
const usersFile = path.join(__dirname, '..', 'data', 'users.json');

const SESSION_DAYS = 7;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

// Make sure data/users.json exists
async function ensureUsersFile() {
    const dir = path.dirname(usersFile);

    await fs.mkdir(dir, { recursive: true });

    try {
        await fs.access(usersFile);
    } catch {
        await fs.writeFile(usersFile, '[]', 'utf8');
    }
}

async function readUsers() {
    await ensureUsersFile();

    try {
        const text = await fs.readFile(usersFile, 'utf8');
        const users = JSON.parse(text);

        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

async function writeUsers(users) {
    await ensureUsersFile();

    await fs.writeFile(
        usersFile,
        JSON.stringify(users, null, 2),
        'utf8'
    );
}

/* =====================================================
   PASSWORD HASHING
===================================================== */

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');

        crypto.scrypt(
            password,
            salt,
            64,
            (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(
                    `${salt}:${derivedKey.toString('hex')}`
                );
            }
        );
    });
}

function verifyPassword(password, storedHash) {
    return new Promise((resolve, reject) => {
        try {
            const [salt, key] = storedHash.split(':');

            if (!salt || !key) {
                resolve(false);
                return;
            }

            crypto.scrypt(
                password,
                salt,
                64,
                (error, derivedKey) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    const storedBuffer =
                        Buffer.from(key, 'hex');

                    const suppliedBuffer = derivedKey;

                    if (
                        storedBuffer.length !==
                        suppliedBuffer.length
                    ) {
                        resolve(false);
                        return;
                    }

                    resolve(
                        crypto.timingSafeEqual(
                            storedBuffer,
                            suppliedBuffer
                        )
                    );
                }
            );
        } catch {
            resolve(false);
        }
    });
}

/* =====================================================
   COOKIE HELPERS
===================================================== */

function parseCookies(req) {
    const cookies = {};

    const header = req.headers.cookie || '';

    for (const part of header.split(';')) {
        const index = part.indexOf('=');

        if (index === -1) continue;

        const key = part
            .slice(0, index)
            .trim();

        const value = part
            .slice(index + 1)
            .trim();

        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    }

    return cookies;
}

/* =====================================================
   SESSION ENCRYPTION
===================================================== */

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET;

    if (!secret) {
        throw new Error(
            'SESSION_SECRET is missing. Add it to your environment variables.'
        );
    }

    return crypto
        .createHash('sha256')
        .update(secret)
        .digest();
}

function encryptSession(data) {
    const key = getSessionSecret();

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(
            JSON.stringify(data),
            'utf8'
        ),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return [
        iv.toString('base64url'),
        tag.toString('base64url'),
        encrypted.toString('base64url')
    ].join('.');
}

function decryptSession(value) {
    try {
        const parts = value.split('.');

        if (parts.length !== 3) {
            return null;
        }

        const iv = Buffer.from(
            parts[0],
            'base64url'
        );

        const tag = Buffer.from(
            parts[1],
            'base64url'
        );

        const encrypted = Buffer.from(
            parts[2],
            'base64url'
        );

        const decipher =
            crypto.createDecipheriv(
                'aes-256-gcm',
                getSessionSecret(),
                iv
            );

        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return JSON.parse(
            decrypted.toString('utf8')
        );
    } catch {
        return null;
    }
}

/* =====================================================
   SESSION
===================================================== */

function setSession(res, user) {
    const session = encryptSession({
        user,
        createdAt: Date.now()
    });

    const secure =
        process.env.SESSION_COOKIE_SECURE === 'true'
            ? '; Secure'
            : '';

    res.setHeader(
        'Set-Cookie',
        `${cookieName}=${encodeURIComponent(session)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`
    );
}

function currentUser(req) {
    try {
        const cookies = parseCookies(req);

        if (!cookies[cookieName]) {
            return null;
        }

        const session =
            decryptSession(cookies[cookieName]);

        if (!session) {
            return null;
        }

        const maxAge =
            SESSION_MAX_AGE * 1000;

        if (
            Date.now() - session.createdAt >
            maxAge
        ) {
            return null;
        }

        return session.user || null;
    } catch {
        return null;
    }
}

function clearSession(req, res) {
    res.setHeader(
        'Set-Cookie',
        `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
    );
}

/* =====================================================
   REGISTER
===================================================== */

async function register(name, email, password) {
    name = String(name || '').trim();
    email = String(email || '')
        .trim()
        .toLowerCase();

    password = String(password || '');

    if (!name) {
        throw new Error(
            'Please enter your name.'
        );
    }

    if (!email) {
        throw new Error(
            'Please enter your email.'
        );
    }

    if (!email.includes('@')) {
        throw new Error(
            'Please enter a valid email address.'
        );
    }

    if (password.length < 6) {
        throw new Error(
            'Password must be at least 6 characters.'
        );
    }

    const users = await readUsers();

    const existing =
        users.find(
            user =>
                user.email.toLowerCase() ===
                email
        );

    if (existing) {
        throw new Error(
            'An account with this email already exists.'
        );
    }

    const passwordHash =
        await hashPassword(password);

    const user = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash,
        createdAt: new Date().toISOString()
    };

    users.push(user);

    await writeUsers(users);

    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
}

/* =====================================================
   LOGIN
===================================================== */

async function login(email, password) {
    email = String(email || '')
        .trim()
        .toLowerCase();

    password = String(password || '');

    if (!email || !password) {
        throw new Error(
            'Please enter your email and password.'
        );
    }

    const users = await readUsers();

    const user =
        users.find(
            item =>
                item.email.toLowerCase() ===
                email
        );

    if (!user) {
        throw new Error(
            'Invalid email or password.'
        );
    }

    const valid =
        await verifyPassword(
            password,
            user.passwordHash
        );

    if (!valid) {
        throw new Error(
            'Invalid email or password.'
        );
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
}

module.exports = {
    currentUser,
    setSession,
    clearSession,
    register,
    login
};