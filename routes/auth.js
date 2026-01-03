import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import verifyToken from "../middleware/auth.js";
import { db } from "../config/db.js";

const router = express.Router();

/**
 * @openapi
 * /login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 🔐 Login
 *     description: |
 *       ใช้สำหรับเข้าสู่ระบบด้วย username และ password
 *       หากข้อมูลถูกต้อง ระบบจะส่ง JWT Token กลับไป
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: test001
 *               password:
 *                 type: string
 *                 example: 123456
 *
 *     responses:
 *       200:
 *         description: ✅ Login success
 *         content:
 *           application/json:
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *       401:
 *         description: ❌ Invalid username or password
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await db.execute(
      "SELECT * FROM tbl_customers WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid username or password",
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        status: "error",
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

/**
 * @openapi
 * /logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 🚪 Logout
 *     description: |
 *       ใช้สำหรับออกจากระบบ
 *       ระบบฝั่ง server จะตอบกลับว่าสำเร็จ
 *       ฝั่ง client ต้องลบ JWT Token ออกจาก storage เอง
 *
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: ✅ Logout success
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Logout successful
 *
 *       401:
 *         description: 🔒 Unauthorized
 */
router.post("/logout", verifyToken, (req, res) => {
  res.json({
    status: "ok",
    message: "Logout successful",
  });
});

export default router;
