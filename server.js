require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const app = express();
const jwt = require("jsonwebtoken");

const auth = require("./middleware/auth");

app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Test
app.get("/ping", async (req, res) => {
  const [rows] = await db.query("SELECT NOW() AS now");
  res.json({ status: "ok", time: rows[0].now });
});

//get
app.get("/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tbl_customers");
    res.json(rows);
  } catch (err) {
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

  try {
    if (!password) return res.status(400).json({ error: "รหัสผ่านห้ามว่าง" });

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "การสมัครสมาชิกล้มเหลว" });
  }
});
//login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // ตรวจสอบว่ากรอกข้อมูลครบไหม
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "กรอก username และ password ให้ครบ" });
    }

    // ค้นหาผู้ใช้จาก database
    const [rows] = await db.query(
      "SELECT * FROM tbl_customers WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "ไม่พบบัญชีนี้" });
    }

    const user = rows[0];

    // ตรวจสอบ password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    // สร้าง JWT TOKEN อายุ 1 ชั่วโมง
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
});

app.get("/profile", auth, async (req, res) => {
  res.json({
    message: "เข้าถึงข้อมูลสำเร็จ",
    user: req.user,
  });
});
// get customer profile

app.get("/customers", auth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tbl_customers");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ดึงข้อมูลลูกค้าล้มเหลว" });
  }
});
//show menu
app.get("/menus", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         m.id AS menu_id,
         m.menu_name,
         m.description,
         m.price,
         m.category,

         r.id AS restaurant_id,
         r.restaurant_name,
         r.address,
         r.phone,
         r.menu_description
       FROM tbl_menus AS m
       INNER JOIN tbl_restaurants AS r
         ON m.restaurant_id = r.id`
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database join failed" });
  }
});

/// update คำสั่งสื่อ
app.post("/orders", auth, async (req, res) => {
  const { restaurant_id, menu_id, quantity } = req.body;

  try {
    // ตรวจสอบข้อมูล
    if (!restaurant_id || !menu_id || !quantity) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
    }

    // ดึง customer_id จาก token
    const customer_id = req.user.id;

    // 1. ดึงราคาเมนู
    const [menu] = await db.query("SELECT price FROM tbl_menus WHERE id = ?", [
      menu_id,
    ]);

    if (menu.length === 0) {
      return res.status(400).json({ error: "ไม่พบเมนูนี้" });
    }

    const price = parseFloat(menu[0].price);

    // 2. คำนวณราคารวม
    const total_price = price * quantity;

    // 3. บันทึกคำสั่งซื้อ
    const [result] = await db.query(
      `INSERT INTO tbl_orders
       (customer_id, restaurant_id, menu_id, quantity, price, total_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, restaurant_id, menu_id, quantity, price, total_price]
    );

    res.json({
      order_id: result.insertId,
      customer_id,
      restaurant_id,
      menu_id,
      quantity,
      price,
      total_price,
      status: "processing",
      message: "สร้างคำสั่งซื้อสำเร็จ",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสร้างคำสั่งซื้อได้" });
  }
});
//update ordee

app.get("/orders/summary", auth, async (req, res) => {
  try {
    // ดึง customer จาก token
    const customer_id = req.user.id;

    // Query join 3 ตาราง
    const [rows] = await db.query(
      `SELECT 
          c.fullname AS customer_name,
          SUM(o.total_price) AS total_amount
       FROM tbl_orders o
       INNER JOIN tbl_customers c ON o.customer_id = c.id
       INNER JOIN tbl_menus m ON o.menu_id = m.id
       WHERE o.customer_id = ?
       GROUP BY c.fullname`,
      [customer_id]
    );

    if (rows.length === 0) {
      return res.json({
        customer_name: null,
        total_amount: 0,
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถสรุปยอดคำสั่งซื้อได้" });
  }
});
////////////////////////////////
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
