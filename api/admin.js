import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";

const admin = new Hono();

// gunakan middleware
admin.use("*", authMiddleware, adminOnly);

// contoh endpoint
admin.get("/dashboard", (c) => {
    return c.json({
        message: "Selamat datang admin",
    });
});

export default admin;