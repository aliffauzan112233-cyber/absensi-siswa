import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, attendances } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import { eq, and, gte, lt } from "drizzle-orm"; // 💡 Diubah lte menjadi lt sesuai logika bulan depan
import bcrypt from "bcryptjs";

const admin = new Hono();

// gunakan middleware
// authMiddleware = memastikan user login 
// adminOnly = memastikan role admin
// admin.use("*", ...) = berlaku untuk semua endpoint
admin.use("*", authMiddleware, adminOnly);

// contoh endpoint
admin.get("/dashboard", (c) => {
    return c.json({
        message: "Selamat datang admin",
    });
});

admin.get('/users', async (c) => {
    const data = await db 
    .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
    })
    .from(users)
    .orderBy(users.name);

    return c.json({ data });
});

admin.post('/users', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ message: 'JSON tidak valid atau kosong' }, 400);
    }
    
    const { name, email, password, role = 'user' } = body;

    if (!name || !email || !password) {
        return c.json({ message: 'name, email, dan password wajib diisi' }, 400);
    }

    if (!['user', 'admin'].includes(role)) {
        return c.json({ message: 'role harus user atau admin' }, 400);
    }

    if (password.length < 6) {
        return c.json({ message: 'Password minimal 6 karakter' }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const [created] = await db
            .insert(users)
            .values({ name, email, password: hashedPassword, role, is_active: true })
            .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

        return c.json({ message: 'User berhasil ditambahkan', data: created }, 201);
    } catch {
        return c.json({ message: 'Email sudah digunakan' }, 400);
    }
});

//  c.req.query('month'); = ambil query
admin.get('/attendances', async (c) => {
    const month = c.req.query('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return c.json({ message: 'Parameter month wajib diisi (format: YYYY-MM)' }, 400);
    }

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const data = await db
        .select({
            id: attendances.id,
            user_id: attendances.user_id,
            user_name: users.name,
            user_email: users.email,
            check_in: attendances.check_in,
            check_out: attendances.check_out,
            note: attendances.note,
        })
        .from(attendances)
        .leftJoin(users, eq(attendances.user_id, users.id))
        .where(and(gte(attendances.check_in, start), lt(attendances.check_in, end)))
        .orderBy(attendances.check_in);

    return c.json({ data });
});

// PERBAIKAN: Menggunakan admin.patch dan Sintaks Drizzle ORM yang Benar
admin.patch('/users/:id/status', async (c) => {
    // Karena ID di database biasanya bertipe Integer/Number, kita bungkus dengan Number()
    const userId = Number(c.req.param('id')); 
  
    let body;
    try {
        body = await c.req.json(); 
    } catch (error) {
        return c.json({ success: false, message: "JSON tidak valid" }, 400);
    }

    const { is_active } = body; 

    // Validasi input agar data yang masuk wajib boolean (true/false)
    if (typeof is_active !== "boolean") {
        return c.json({ success: false, message: "Field 'is_active' harus bernilai true atau false" }, 400);
    }

    try {
        // 🗄️ Menggunakan fungsi update bawaan Drizzle ORM
        await db
            .update(users)
            .set({ is_active: is_active })
            .where(eq(users.id, userId));

        return c.json({
            success: true,
            message: `Status user dengan ID ${userId} berhasil diperbarui menjadi ${is_active}`
        });

    } catch (dbError) {
        console.error("Gagal update database:", dbError.message);
        return c.json({ success: false, message: "Gagal memperbarui status di database" }, 500);
    }
});

export default admin;