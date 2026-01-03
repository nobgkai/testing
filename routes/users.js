import express from "express";
import bcrypt from "bcryptjs";
import verifyToken from "../middleware/auth.js";
import { db } from "../config/db.js";

const router = express.Router();

// จำนวนรอบในการ hash password
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

// จำนวนข้อมูลสูงสุดต่อหน้า
const MAX_PAGE_SIZE = parseInt(process.env.MAX_PAGE_SIZE || "100", 10);

// ==================================================
// UTIL FUNCTIONS
// ==================================================

async function runQuery(sql, params = []) {
  if (params.length === 0) {
    const [rows] = await db.query(sql);
    return rows;
  } else {
    const [rows] = await db.execute(sql, params);
    return rows;
  }
}

function sendDbError(res, err, httpCode = 500) {
  console.error("[DB ERROR]", err);
  return res.status(httpCode).json({
    status: "error",
    message: err?.message ?? "Database error",
    code: err?.code ?? null,
  });
}

function requireFields(obj, keys) {
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === "") {
      return k;
    }
  }
  return null;
}

// ==================================================
// ROUTES
// ==================================================

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: 📋 Get all users
 *     description: |
 *       Retrieve a paginated list of all users.
 *       🔒 Requires authentication - Click **Authorize** button first!
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page (max 100)
 *
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *
 *     responses:
 *       200:
 *         description: ✅ Success
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               count: 1
 *               data:
 *                 - id: 1
 *                   firstname: John
 *                   fullname: John Doe
 *                   lastname: Doe
 *                   username: johndoe
 *                   created_at: "2026-01-02T14:23:55.228Z"
 *                   updated_at: "2026-01-02T14:23:55.228Z"
 *               total: 1
 *               page: 1
 *               limit: 10
 *
 *       401:
 *         description: 🔒 Unauthorized - Please login and use Authorize button first
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */

router.get("/", verifyToken, async (req, res) => {
  try {
    const limitParam = Number.parseInt(req.query.limit ?? "", 10);
    const limit =
      Number.isNaN(limitParam) || limitParam <= 0
        ? null
        : Math.min(limitParam, MAX_PAGE_SIZE);

    const pageParam = Number.parseInt(req.query.page ?? "", 10);
    const page = Number.isNaN(pageParam) || pageParam <= 0 ? 1 : pageParam;
    const offset = limit !== null ? (page - 1) * limit : 0;

    let sql = `
      SELECT
        id,
        username,
        firstname,
        fullname,
        lastname,
        address,
        phone,
        email,
        created_at,
        updated_at
      FROM tbl_customers
    `;

    const params = [];
    if (limit !== null) {
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const rows = await runQuery(sql);

    const responseBody = {
      status: "ok",
      count: rows.length,
      data: rows,
    };

    if (limit !== null) {
      const totalRows = await runQuery(
        "SELECT COUNT(*) AS total FROM tbl_customers"
      );
      responseBody.total = totalRows[0].total;
      responseBody.page = page;
      responseBody.limit = limit;
    }

    res.json(responseBody);
  } catch (err) {
    return sendDbError(res, err);
  }
});
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: 👤 Get user by ID
 *     description: |
 *       ใช้สำหรับดึงข้อมูลลูกค้ารายบุคคลจากระบบ
 *       โดยระบุ **ID ของผู้ใช้** ผ่าน path parameter
 *
 *       🔒 ผู้เรียก API ต้องผ่านการ Login
 *       และต้องกดปุ่ม **Authorize** ใน Swagger ก่อนเรียกใช้งาน
 *
 *       ตัวอย่างการเรียกใช้งาน:
 *       - GET /api/users/1
 *       - GET /api/users/5
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: |
 *           รหัสประจำตัว (ID) ของผู้ใช้งาน
 *           ต้องเป็นตัวเลขที่มีอยู่ในระบบ
 *
 *     responses:
 *       200:
 *         description: ✅ Success – ดึงข้อมูลผู้ใช้สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               data:
 *                 id: 1
 *                 username: johndoe
 *                 firstname: John
 *                 fullname: John Doe
 *                 lastname: Doe
 *                 address: "123 Main Street"
 *                 phone: "0812345678"
 *                 email: "john.doe@example.com"
 *                 created_at: "2026-01-02T14:23:55.228Z"
 *                 updated_at: "2026-01-02T14:23:55.228Z"
 *
 *       401:
 *         description: 🔒 Unauthorized – กรุณา Login และใส่ JWT Token
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Not Found – ไม่พบผู้ใช้ตาม ID ที่ระบุ
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: User not found
 *
 *       500:
 *         description: ❌ Server Error – เกิดข้อผิดพลาดจากระบบหรือฐานข้อมูล
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await runQuery(
      `
      SELECT
        id,
        username,
        firstname,
        fullname,
        lastname,
        address,
        phone,
        email,
        created_at,
        updated_at
      FROM tbl_customers
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: "not_found", message: "User not found" });
    }

    res.json({ status: "ok", data: rows[0] });
  } catch (err) {
    return sendDbError(res, err);
  }
});
//=======================================================================
//                         post user
//=======================================================================
/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: ➕ Create new user
 *     description: |
 *       Create a new user (customer).
 *       ระบบจะทำการ hash รหัสผ่านก่อนบันทึกลงฐานข้อมูล
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
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: 123456
 *               firstname:
 *                 type: string
 *                 example: John
 *               fullname:
 *                 type: string
 *                 example: John Doe
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               address:
 *                 type: string
 *                 example: "123 Main Street"
 *               phone:
 *                 type: string
 *                 example: "0812345678"
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *
 *     responses:
 *       201:
 *         description: ✅ User created successfully
 *       400:
 *         description: ⚠️ Missing required fields
 *       409:
 *         description: ❌ Username or email already exists
 *       500:
 *         description: ❌ Server error
 */
router.post("/", async (req, res) => {
  try {
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

    // ตรวจ field ที่จำเป็น
    if (!username || !password) {
      return res.status(400).json({
        status: "bad_request",
        message: "Missing required fields",
      });
    }

    // ตรวจ username ซ้ำ
    const [exist] = await db.query(
      "SELECT id FROM tbl_customers WHERE username = ? OR email = ?",
      [username, email ?? null]
    );

    if (exist.length > 0) {
      return res.status(409).json({
        status: "conflict",
        message: "Username or email already exists",
      });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `
      INSERT INTO tbl_customers
      (username, password, firstname, fullname, lastname, address, phone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        username,
        hashed,
        firstname ?? null,
        fullname ?? null,
        lastname ?? null,
        address ?? null,
        phone ?? null,
        email ?? null,
      ]
    );

    res.status(201).json({
      status: "ok",
      id: result.insertId,
      username,
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});
/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: ✏️ Update user
 *     description: |
 *       ใช้สำหรับแก้ไขข้อมูลลูกค้าในระบบ
 *       สามารถส่งมาเฉพาะ field ที่ต้องการแก้ไขได้ (Partial Update)
 *
 *       🔒 ผู้เรียก API ต้องผ่านการ Login
 *       และต้องกดปุ่ม **Authorize** ใน Swagger ก่อนใช้งาน
 *
 *       ตัวอย่างการเรียกใช้งาน:
 *       - PUT /api/users/1
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: |
 *           รหัสประจำตัว (ID) ของผู้ใช้ที่ต้องการแก้ไข
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: newpassword123
 *               firstname:
 *                 type: string
 *                 example: John
 *               fullname:
 *                 type: string
 *                 example: John Doe
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               address:
 *                 type: string
 *                 example: "123 Main Street"
 *               phone:
 *                 type: string
 *                 example: "0812345678"
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *
 *     responses:
 *       200:
 *         description: ✅ Success – แก้ไขข้อมูลผู้ใช้สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: User updated successfully
 *
 *       400:
 *         description: ⚠️ Bad Request – ไม่มี field ที่ต้องการแก้ไข
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: No fields to update
 *
 *       401:
 *         description: 🔒 Unauthorized – กรุณา Login และใส่ JWT Token
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Not Found – ไม่พบผู้ใช้ตาม ID ที่ระบุ
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: User not found
 *
 *       500:
 *         description: ❌ Server Error – เกิดข้อผิดพลาดจากระบบหรือฐานข้อมูล
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
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

    const fields = [];
    const params = [];

    if (username !== undefined) {
      fields.push("username = ?");
      params.push(username);
    }
    if (firstname !== undefined) {
      fields.push("firstname = ?");
      params.push(firstname);
    }
    if (fullname !== undefined) {
      fields.push("fullname = ?");
      params.push(fullname);
    }
    if (lastname !== undefined) {
      fields.push("lastname = ?");
      params.push(lastname);
    }
    if (address !== undefined) {
      fields.push("address = ?");
      params.push(address);
    }
    if (phone !== undefined) {
      fields.push("phone = ?");
      params.push(phone);
    }
    if (email !== undefined) {
      fields.push("email = ?");
      params.push(email);
    }
    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      fields.push("password = ?");
      params.push(hashed);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "No fields to update",
      });
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    const [result] = await db.execute(
      `UPDATE tbl_customers SET ${fields.join(", ")} WHERE id = ?`,
      [...params, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "not_found", message: "User not found" });
    }

    res.json({ status: "ok", message: "User updated successfully" });
  } catch (err) {
    return sendDbError(res, err);
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: 🗑️ Delete user
 *     description: |
 *       ใช้สำหรับลบข้อมูลลูกค้าออกจากระบบอย่างถาวร
 *       โดยระบุ **ID ของผู้ใช้** ผ่าน path parameter
 *
 *       ⚠️ การลบเป็นการลบข้อมูลออกจากฐานข้อมูลโดยตรง
 *       ควรใช้งานด้วยความระมัดระวัง
 *
 *       🔒 ผู้เรียก API ต้องผ่านการ Login
 *       และต้องกดปุ่ม **Authorize** ใน Swagger ก่อนใช้งาน
 *
 *       ตัวอย่างการเรียกใช้งาน:
 *       - DELETE /api/users/1
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: |
 *           รหัสประจำตัว (ID) ของผู้ใช้ที่ต้องการลบ
 *           ต้องเป็น ID ที่มีอยู่ในระบบ
 *
 *     responses:
 *       200:
 *         description: ✅ Success – ลบข้อมูลผู้ใช้สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: User deleted successfully
 *
 *       401:
 *         description: 🔒 Unauthorized – กรุณา Login และใส่ JWT Token
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Not Found – ไม่พบผู้ใช้ตาม ID ที่ระบุ
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: User not found
 *
 *       500:
 *         description: ❌ Server Error – เกิดข้อผิดพลาดจากระบบหรือฐานข้อมูล
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "DELETE FROM tbl_customers WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "not_found", message: "User not found" });
    }

    res.json({ status: "ok", message: "User deleted successfully" });
  } catch (err) {
    return sendDbError(res, err);
  }
});

export default router;
