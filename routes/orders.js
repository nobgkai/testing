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
//=======================================================
// get all orders
//=======================================================
/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: 📦 Get all orders
 *     description: |
 *       ดึงรายการคำสั่งซื้อ (Orders) ทั้งหมดจากระบบ
 *
 *       🔹 ใช้สำหรับ:
 *       - แสดงรายการออเดอร์ทั้งหมดในหน้า Admin
 *       - ตรวจสอบสถานะคำสั่งซื้อ
 *       - ทำรายงานหรือสรุปยอดขาย
 *
 *       📄 รองรับการแบ่งหน้า (Pagination)
 *       🔒 ต้องผ่านการยืนยันตัวตน (Authentication)
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: |
 *           หมายเลขหน้าที่ต้องการดึงข้อมูล
 *           ตัวอย่าง: `1`
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: |
 *           จำนวนรายการต่อหน้า
 *           ตัวอย่าง: `10`
 *
 *     responses:
 *       200:
 *         description: ✅ ดึงรายการออเดอร์สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               page: 1
 *               limit: 10
 *               total: 25
 *               data:
 *                 - id: 1
 *                   user_id: 3
 *                   total_price: 250
 *                   status: "paid"
 *                   created_at: "2026-01-01T10:30:00Z"
 *
 *       401:
 *         description: 🔒 Unauthorized – ไม่มี Token หรือ Token ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Unauthorized"
 *
 *       500:
 *         description: 💥 Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */

router.get("/", auth, async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit ?? "", 10);
    const limit =
      Number.isNaN(limitParam) || limitParam <= 0
        ? null
        : Math.min(limitParam, MAX_PAGE_SIZE);

    const pageParam = parseInt(req.query.page ?? "", 10);
    const page = Number.isNaN(pageParam) || pageParam <= 0 ? 1 : pageParam;
    const offset = limit !== null ? (page - 1) * limit : 0;

    let sql = `
      SELECT
        id,
        customer_id,
        restaurant_id,
        menu_id,
        quantity,
        price,
        total_price,
        status,
        created_at,
        updated_at
      FROM tbl_orders
    `;

    if (limit !== null) {
      sql += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const rows = await runQuery(sql);

    const response = {
      status: "ok",
      count: rows.length,
      data: rows,
    };

    if (limit !== null) {
      const total = await runQuery("SELECT COUNT(*) AS total FROM tbl_orders");
      response.total = total[0].total;
      response.page = page;
      response.limit = limit;
    }

    res.json(response);
  } catch (err) {
    return sendDbError(res, err);
  }
});

// ===============================
// GET /api/orders/{id}
// ===============================
/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: 📦 Get order by ID
 *     description: |
 *       ดึงข้อมูลคำสั่งซื้อ 1 รายการตาม Order ID
 *
 *       🔹 ใช้สำหรับ:
 *       - ดูรายละเอียดออเดอร์แบบเจาะจง
 *       - แสดงหน้า Order Detail
 *       - ตรวจสอบรายการอาหารในออเดอร์
 *
 *       🔒 ต้องผ่านการยืนยันตัวตน (Authentication)
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
 *         description: |
 *           รหัสคำสั่งซื้อ (Order ID)
 *           ตัวอย่าง: `5`
 *
 *     responses:
 *       200:
 *         description: ✅ ดึงข้อมูลออเดอร์สำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 id: 5
 *                 user_id: 3
 *                 total_price: 320
 *                 status: paid
 *                 created_at: "2026-01-02T14:20:00Z"
 *                 items:
 *                   - menu_id: 1
 *                     name: "ผัดกะเพรา"
 *                     price: 50
 *                     quantity: 2
 *                   - menu_id: 3
 *                     name: "ไข่ดาว"
 *                     price: 20
 *                     quantity: 1
 *
 *       400:
 *         description: ⚠️ Bad Request – รูปแบบ Order ID ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Invalid order ID"
 *
 *       401:
 *         description: 🔒 Unauthorized – ไม่มี Token หรือ Token ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Unauthorized"
 *
 *       404:
 *         description: ❌ ไม่พบคำสั่งซื้อที่ระบุ
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Order not found"
 *
 *       500:
 *         description: 💥 Internal Server Error – ระบบมีปัญหา
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await runQuery(`
      SELECT
        id,
        customer_id,
        restaurant_id,
        menu_id,
        quantity,
        price,
        total_price,
        status,
        created_at,
        updated_at
      FROM tbl_orders
      WHERE id = ${id}
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Order not found",
      });
    }

    res.json({
      status: "ok",
      data: rows[0],
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});

// ===============================
// POST /api/orders
// ===============================
/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: ➕ Create order
 *     description: |
 *       Create a new order.
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
 *               - customer_id
 *               - restaurant_id
 *               - menu_id
 *               - quantity
 *               - price
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               restaurant_id:
 *                 type: integer
 *                 example: 1
 *               menu_id:
 *                 type: integer
 *                 example: 5
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 60.00
 *
 *     responses:
 *       201:
 *         description: ✅ Order created
 *       400:
 *         description: ⚠️ Missing required fields
 *       401:
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Unauthorized"
 *
 *       500:
 *         description: 💥 Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */
router.post("/", auth, async (req, res) => {
  try {
    const { customer_id, restaurant_id, menu_id, quantity, price } = req.body;

    if (!customer_id || !restaurant_id || !menu_id || !quantity || !price) {
      return res.status(400).json({
        status: "bad_request",
        message: "Missing required fields",
      });
    }

    const total_price = quantity * price;

    await db.query(
      `
      INSERT INTO tbl_orders
      (customer_id, restaurant_id, menu_id, quantity, price, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [customer_id, restaurant_id, menu_id, quantity, price, total_price]
    );

    res.status(201).json({
      status: "ok",
      message: "Order created successfully",
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});

// ===============================
// PUT /api/orders/{id}
// ===============================
/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     tags:
 *       - Orders
 *     summary: ✏️ Update order status
 *     description: |
 *       Update order status by order ID.
 *       สามารถอัปเดตสถานะเป็น
 *       - processing
 *       - completed
 *       - cancelled
 *
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
 *         description: Order ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - processing
 *                   - completed
 *                   - cancelled
 *                 example: completed
 *
 *     responses:
 *       400:
 *         description: ⚠️ Missing or invalid status
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Missing or invalid status"
 *
 *       401:
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Unauthorized"
 *
 *       404:
 *         description: ❌ Order not found
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Order not found"
 *
 *       500:
 *         description: 💥 Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */

router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        status: "bad_request",
        message: "Missing status",
      });
    }

    const [result] = await db.query(
      `
      UPDATE tbl_orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Order not found",
      });
    }

    res.json({
      status: "ok",
      message: "Order updated successfully",
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});

// ===============================
// DELETE /api/orders/{id}
// ===============================
/**
 * @openapi
 * /api/orders/{id}:
 *   delete:
 *     tags:
 *       - Orders
 *     summary: 🗑️ Delete order
 *     description: |
 *       Delete an order by ID.
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
 *         description: Order ID
 *
 *     responses:
 *       200:
 *         description: ✅ Order deleted
 *
 *       401:
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Unauthorized"
 *
 *       404:
 *         description: ❌ Order not found
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Order not found"
 *
 *       500:
 *         description: 💥 Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM tbl_orders WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Order not found",
      });
    }

    res.json({
      status: "ok",
      message: "Order deleted successfully",
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});
// ===============================
export default router;
