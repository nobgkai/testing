import express from "express";
import { db } from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const MAX_PAGE_SIZE = 100;

async function runQuery(sql) {
  const [rows] = await db.query(sql);
  return rows;
}

function sendDbError(res, err) {
  console.error(err);
  return res.status(500).json({
    status: "error",
    message: err.message,
  });
}
//===========================================
//   get all Shipping
//===========================================
/**
 * @openapi
 * /api/shippings:
 *   get:
 *     tags:
 *       - Shippings
 *     summary: 🚚 Get all shippings
 *     description: |
 *       ดึงข้อมูลการจัดส่งทั้งหมดจากระบบ
 *       รองรับ pagination
 *       🔒 Requires authentication
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
 *           example: 10
 *         description: จำนวนข้อมูลต่อหน้า (สูงสุด 100)
 *
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: หน้าที่ต้องการดู
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
 *                   order_id: 10
 *                   receiver_name: "Somchai"
 *                   shipping_address: "Chiang Mai"
 *                   phone: "0812345678"
 *                   shipping_status: pending
 *                   created_at: "2026-01-02T10:00:00.000Z"
 *                   updated_at: "2026-01-02T10:00:00.000Z"
 *               total: 1
 *               page: 1
 *               limit: 10
 *
 *       400:
 *         description: ❌ Invalid query parameters
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: limit must be a positive number
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
router.get("/", auth, async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit ?? "", 10);
    const limit =
      Number.isNaN(limitParam) || limitParam <= 0
        ? null
        : Math.min(limitParam, 100);

    const pageParam = parseInt(req.query.page ?? "", 10);
    const page = Number.isNaN(pageParam) || pageParam <= 0 ? 1 : pageParam;
    const offset = limit !== null ? (page - 1) * limit : 0;

    let sql = `
      SELECT
        id,
        order_id,
        receiver_name,
        shipping_address,
        phone,
        shipping_status,
        created_at,
        updated_at
      FROM tbl_shippings
    `;

    if (limit !== null) {
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const [rows] = await db.query(sql);

    const response = {
      status: "ok",
      count: rows.length,
      data: rows,
    };

    if (limit !== null) {
      const [total] = await db.query(
        "SELECT COUNT(*) AS total FROM tbl_shippings"
      );
      response.total = total[0].total;
      response.page = page;
      response.limit = limit;
    }

    res.json(response);
  } catch (err) {
    console.error("[GET /api/shippings ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});

//==============================================
// get by id shipping
//==============================================
/**
 * @openapi
 * /api/shippings/{id}:
 *   get:
 *     tags:
 *       - Shippings
 *     summary: 🚚 Get shipping by ID
 *     description: |
 *       ดึงข้อมูลการจัดส่งตาม ID
 *       🔒 Requires authentication
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
 *         description: Shipping ID
 *
 *     responses:
 *       200:
 *         description: ✅ Success
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               data:
 *                 id: 1
 *                 order_id: 10
 *                 receiver_name: "Somchai"
 *                 shipping_address: "Chiang Mai"
 *                 phone: "0812345678"
 *                 shipping_status: pending
 *                 created_at: "2026-01-02T10:00:00.000Z"
 *                 updated_at: "2026-01-02T10:00:00.000Z"
 *
 *       400:
 *         description: ❌ Invalid ID
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: id must be a number
 *
 *       401:
 *         description: 🔒 Unauthorized - Please login and use Authorize button first
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Shipping not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Shipping not found
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // 400: id ไม่ถูกต้อง
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a number",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        order_id,
        receiver_name,
        shipping_address,
        phone,
        shipping_status,
        created_at,
        updated_at
      FROM tbl_shippings
      WHERE id = ?
      `,
      [id]
    );

    // 404: ไม่พบข้อมูล
    if (rows.length === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Shipping not found",
      });
    }

    // 200: success
    res.json({
      status: "ok",
      data: rows[0],
    });
  } catch (err) {
    console.error("[GET /api/shippings/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});
//==============================================
//              post shippings
//==============================================
/**
 * @openapi
 * /api/shippings:
 *   post:
 *     tags:
 *       - Shippings
 *     summary: ➕ Create shipping
 *     description: |
 *       สร้างข้อมูลการจัดส่งใหม่
 *       🔒 Requires authentication
 *
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - receiver_name
 *               - shipping_address
 *               - phone
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 10
 *               receiver_name:
 *                 type: string
 *                 example: "Somchai"
 *               shipping_address:
 *                 type: string
 *                 example: "Chiang Mai"
 *               phone:
 *                 type: string
 *                 example: "0812345678"
 *
 *     responses:
 *       201:
 *         description: ✅ Shipping created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               id: 1
 *
 *       400:
 *         description: ❌ Missing or invalid input
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: Missing required fields
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
router.post("/", auth, async (req, res) => {
  try {
    const { order_id, receiver_name, shipping_address, phone } = req.body;

    // 400: ตรวจ field ที่จำเป็น
    if (!order_id || !receiver_name || !shipping_address || !phone) {
      return res.status(400).json({
        status: "bad_request",
        message: "Missing required fields",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO tbl_shippings
      (order_id, receiver_name, shipping_address, phone)
      VALUES (?, ?, ?, ?)
      `,
      [order_id, receiver_name, shipping_address, phone]
    );

    // 201: created
    res.status(201).json({
      status: "ok",
      id: result.insertId,
    });
  } catch (err) {
    console.error("[POST /api/shippings ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});
//==============================================
//             put by id shipping
//==============================================
/**
 * @openapi
 * /api/shippings/{id}:
 *   put:
 *     tags:
 *       - Shippings
 *     summary: ✏️ Update shipping by ID
 *     description: |
 *       ใช้สำหรับแก้ไขข้อมูลการจัดส่งตาม ID
 *       สามารถอัปเดตสถานะการจัดส่งได้
 *       (pending, delivering, delivered, cancelled)
 *       🔒 Requires authentication
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
 *         description: Shipping ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiver_name:
 *                 type: string
 *                 example: "Somchai"
 *               shipping_address:
 *                 type: string
 *                 example: "Chiang Mai"
 *               phone:
 *                 type: string
 *                 example: "0812345678"
 *               shipping_status:
 *                 type: string
 *                 enum:
 *                   - pending
 *                   - delivering
 *                   - delivered
 *                   - cancelled
 *                 example: delivered
 *
 *     responses:
 *       200:
 *         description: ✅ Shipping updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Shipping updated successfully
 *
 *       400:
 *         description: ❌ Invalid input
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: No fields to update
 *
 *       401:
 *         description: 🔒 Unauthorized - Please login and use Authorize button first
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Shipping not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Shipping not found
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { receiver_name, shipping_address, phone, shipping_status } =
      req.body;

    // 400: id ไม่ถูกต้อง
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a number",
      });
    }

    const fields = [];
    const params = [];

    if (receiver_name !== undefined) {
      fields.push("receiver_name = ?");
      params.push(receiver_name);
    }
    if (shipping_address !== undefined) {
      fields.push("shipping_address = ?");
      params.push(shipping_address);
    }
    if (phone !== undefined) {
      fields.push("phone = ?");
      params.push(phone);
    }
    if (shipping_status !== undefined) {
      fields.push("shipping_status = ?");
      params.push(shipping_status);
    }

    // 400: ไม่มี field ให้แก้
    if (fields.length === 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "No fields to update",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tbl_shippings
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [...params, id]
    );

    // 404: ไม่พบข้อมูล
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Shipping not found",
      });
    }

    // 200: success
    res.json({
      status: "ok",
      message: "Shipping updated successfully",
    });
  } catch (err) {
    console.error("[PUT /api/shippings/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});
//==============================================
//             deleate id shipping
//==============================================

/**
 * @openapi
 * /api/shippings/{id}:
 *   delete:
 *     tags:
 *       - Shippings
 *     summary: 🗑️ Delete shipping by ID
 *     description: |
 *       ลบข้อมูลการจัดส่งตาม ID
 *       🔒 Requires authentication
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
 *         description: Shipping ID
 *
 *     responses:
 *       200:
 *         description: ✅ Shipping deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Shipping deleted successfully
 *
 *       400:
 *         description: ❌ Invalid ID
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: id must be a number
 *
 *       401:
 *         description: 🔒 Unauthorized - Please login and use Authorize button first
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Shipping not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Shipping not found
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Database error
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // 400: id ไม่ถูกต้อง
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a number",
      });
    }

    const [result] = await db.query("DELETE FROM tbl_shippings WHERE id = ?", [
      id,
    ]);

    // 404: ไม่พบข้อมูล
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Shipping not found",
      });
    }

    // 200: success
    res.json({
      status: "ok",
      message: "Shipping deleted successfully",
    });
  } catch (err) {
    console.error("[DELETE /api/shippings/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});

//==============================================
export default router;
