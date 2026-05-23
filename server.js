import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { auth } from "./api/auth.js";

const app = new Hono();

app.route("/auth", auth);

serve({
    fetch: app.fetch,
    port: 3000,
});

console.log("Server running on http://localhost:3000");