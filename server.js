import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import auth from "./middleware/auth.js";
import { swaggerUi, specs } from "./swagger.js";

const app = express();
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Test
app.get("/ping", async (req, res) => {
  const [rows] = await db.query("SELECT NOW() AS now");
  res.json({ status: "ok", time: rows[0].now });
});


// GET users
app.get("/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tbl_customers");
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Query failed" });
  }
});

// Register
app.post("/auth/register", async (req, res) => {
  const {
    username,
    password,
    firstname,
    fullname,
    lastname,
    address,
    phone,
    email,
  } = req.body;

  if (!password) {
    return res.status(400).json({ error: "รหัสผ่านห้ามว่าง" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await db.query(
    `INSERT INTO tbl_customers 
     (username, password, firstname, fullname, lastname, address, phone, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      hashedPassword,
      firstname,
      fullname,
      lastname,
      address,
      phone,
      email,
    ]
  );

  res.json({
    id: result.insertId,
    username,
    firstname,
    fullname,
    lastname,
    address,
    phone,
    email,
    message: "สมัครสมาชิกสำเร็จ",
  });
});

// Login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM tbl_customers WHERE username = ?",
    [username]
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: "ไม่พบบัญชีนี้" });
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// Profile
app.get("/profile", auth, (req, res) => {
  res.json({ message: "เข้าถึงข้อมูลสำเร็จ", user: req.user });
});

// Start server
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
}

export default app;
