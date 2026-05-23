import { Hono } from 'hono';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createToken, verifyToken } from '../lib/jwt.js';

const auth = new Hono();


// ================= LOGIN =================
auth.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password } = body;

        if (!email || !password) {
            return c.json(
                { message: 'Email dan password wajib diisi' },
                400
            );
        }

        // Ambil user dari database
        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        const user = result[0];

        // Cek user
        if (!user) {
            return c.json(
                { message: 'Email atau password salah' },
                401
            );
        }

        // Cek status akun
        if (!user.is_active) {
            return c.json(
                { message: 'Akun tidak aktif' },
                403
            );
        }

        // Cek password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return c.json(
                { message: 'Email atau password salah' },
                401
            );
        }

        // Buat token JWT
        const token = await createToken({
            id: user.id,
            name: user.name,
            role: user.role,
        });

        // Simpan token ke cookie
        setCookie(c, 'session_token', token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24, // 1 hari
            sameSite: 'Lax',
            path: '/',
            // secure: true // aktifkan saat HTTPS
        });

        return c.json({
            message: 'Login berhasil',
            role: user.role,
        });

    } catch (err) {
        console.error('Login Error:', err);

        return c.json(
            { message: 'Terjadi kesalahan server' },
            500
        );
    }
});


// ================= LOGOUT =================
auth.post('/logout', async (c) => {
    deleteCookie(c, 'session_token', {
        path: '/',
    });

    return c.json({
        message: 'Logout berhasil',
    });
});


// ================= CEK SESSION =================
auth.get('/me', async (c) => {
    try {
        const token = getCookie(c, 'session_token');

        if (!token) {
            return c.json(
                { message: 'Unauthorized' },
                401
            );
        }

        const user = await verifyToken(token);

        return c.json({
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        });

    } catch (err) {
        console.error('JWT Verification Error:', err);

        return c.json(
            { message: 'Session tidak valid atau expired' },
            401
        );
    }
});

export { auth };