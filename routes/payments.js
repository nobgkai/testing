import express from "express";
import { db } from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const MAX_PAGE_SIZE = 100;

// ===============================
// GET /api/payments
// ===============================
/**
 * @openapi
 * /api/payments:
 *   get:
 *     tags:
 *       - Payments
 *     summary: 💰 Get all payments
 *     description: |
 *       ใช้สำหรับดึงข้อมูลการชำระเงินทั้งหมด
 *       รองรับ pagination
 *       🔒 ต้อง login และส่ง Bearer Token
 *
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: จำนวนข้อมูลต่อหน้า (สูงสุด 100)
 *
 *       - in: query
 *         name: page
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
 *                   order_id: 5
 *                   payment_method: cash
 *                   payment_status: paid
 *                   amount: 120.00
 *                   paid_at: "2026-01-02T14:30:00.000Z"
 *                   created_at: "2026-01-02T14:23:55.228Z"
 *                   updated_at: "2026-01-02T14:30:00.000Z"
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
    // ===============================
    // 1️⃣ ตรวจ query parameters
    // ===============================
    let { limit, page } = req.query;

    if (limit !== undefined) {
      limit = parseInt(limit, 10);
      if (Number.isNaN(limit) || limit <= 0) {
        return res.status(400).json({
          status: "bad_request",
          message: "limit must be a positive number",
        });
      }
      if (limit > MAX_PAGE_SIZE) {
        limit = MAX_PAGE_SIZE;
      }
    }

    if (page !== undefined) {
      page = parseInt(page, 10);
      if (Number.isNaN(page) || page <= 0) {
        return res.status(400).json({
          status: "bad_request",
          message: "page must be a positive number",
        });
      }
    }

    // ค่า default
    limit = limit ?? 10;
    page = page ?? 1;
    const offset = (page - 1) * limit;

    // ===============================
    // 2️⃣ Query ข้อมูล
    // ===============================
    const [rows] = await db.query(
      `
      SELECT
        id,
        order_id,
        payment_method,
        payment_status,
        amount,
        paid_at,
        created_at,
        updated_at
      FROM tbl_payments
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    // ===============================
    // 3️⃣ Query จำนวนทั้งหมด
    // ===============================
    const [[totalRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM tbl_payments"
    );

    // ===============================
    // 4️⃣ ส่ง response
    // ===============================
    res.json({
      status: "ok",
      count: rows.length,
      data: rows,
      total: totalRow.total,
      page,
      limit,
    });
  } catch (err) {
    // ===============================
    // 5️⃣ Database / Server Error
    // ===============================
    console.error("[GET /api/payments ERROR]", err);

    res.status(500).json({
      status: "error",
      message: "Database error",
      detail: err.message,
    });
  }
});
//====================================================================================
//              get by id payments
//====================================================================================
/**
 * @openapi
 * /api/payments/{id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: 💳 Get payment by ID
 *     description: |
 *       ใช้สำหรับดึงข้อมูลการชำระเงินตาม ID
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
 *         description: Payment ID
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
 *                 order_id: 5
 *                 payment_method: cash
 *                 payment_status: paid
 *                 amount: 120.00
 *                 paid_at: "2026-01-02T14:30:00.000Z"
 *                 created_at: "2026-01-02T14:23:55.228Z"
 *                 updated_at: "2026-01-02T14:30:00.000Z"
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
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Payment not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Payment not found
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
    const { id } = req.params;

    // 1️⃣ validate id
    const paymentId = parseInt(id, 10);
    if (Number.isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a number",
      });
    }

    // 2️⃣ query database
    const [rows] = await db.query(
      `
      SELECT
        id,
        order_id,
        payment_method,
        payment_status,
        amount,
        paid_at,
        created_at,
        updated_at
      FROM tbl_payments
      WHERE id = ?
      `,
      [paymentId]
    );

    // 3️⃣ not found
    if (rows.length === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Payment not found",
      });
    }

    // 4️⃣ success
    res.json({
      status: "ok",
      data: rows[0],
    });
  } catch (err) {
    console.error("[GET /api/payments/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
      detail: err.message,
    });
  }
});
//====================================================================================
//              funtion post payments
//====================================================================================
/**
 * @openapi
 * /api/payments:
 *   post:
 *     tags:
 *       - Payments
 *     summary: ➕ Create payment
 *     description: |
 *       ใช้สำหรับสร้างข้อมูลการชำระเงิน
 *       หาก payment_status = paid ระบบจะตั้ง paid_at ให้อัตโนมัติ
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
 *               - payment_method
 *               - amount
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 10
 *               payment_method:
 *                 type: string
 *                 enum:
 *                   - cash
 *                   - CQ_code
 *                   - prompay
 *                 example: cash
 *               payment_status:
 *                 type: string
 *                 enum:
 *                   - paid
 *                   - unpaid
 *                 example: paid
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 120.00
 *
 *     responses:
 *       201:
 *         description: ✅ Payment created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               id: 1
 *
 *       400:
 *         description: ❌ Invalid input
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: Missing required fields
 *
 *       401:
 *         description: 🔒 Unauthorized
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
    const {
      order_id,
      payment_method,
      payment_status = "unpaid",
      amount,
    } = req.body;

    // ===============================
    // 1️⃣ validate required fields
    // ===============================
    if (!order_id || !payment_method || !amount) {
      return res.status(400).json({
        status: "bad_request",
        message: "Missing required fields",
      });
    }

    // ===============================
    // 2️⃣ validate enum values
    // ===============================
    const validMethods = ["cash", "CQ_code", "prompay"];
    const validStatus = ["paid", "unpaid"];

    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        status: "bad_request",
        message: "Invalid payment_method",
      });
    }

    if (!validStatus.includes(payment_status)) {
      return res.status(400).json({
        status: "bad_request",
        message: "Invalid payment_status",
      });
    }

    // ===============================
    // 3️⃣ set paid_at
    // ===============================
    const paid_at = payment_status === "paid" ? new Date() : null;

    // ===============================
    // 4️⃣ insert database
    // ===============================
    const [result] = await db.query(
      `
      INSERT INTO tbl_payments
      (order_id, payment_method, payment_status, amount, paid_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [order_id, payment_method, payment_status, amount, paid_at]
    );

    // ===============================
    // 5️⃣ response
    // ===============================
    res.status(201).json({
      status: "ok",
      id: result.insertId,
    });
  } catch (err) {
    console.error("[POST /api/payments ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
      detail: err.message,
    });
  }
});
//====================================================================================
//              funtion put payments
//====================================================================================
/**
 * @openapi
 * /api/payments/{id}:
 *   put:
 *     tags:
 *       - Payments
 *     summary: ✏️ Update payment
 *     description: |
 *       ใช้สำหรับอัปเดตข้อมูลการชำระเงินตาม Payment ID
 *       - paid  → ระบบจะตั้ง paid_at ให้อัตโนมัติ
 *       - unpaid → ระบบจะล้างค่า paid_at
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
 *         description: Payment ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method:
 *                 type: string
 *                 enum:
 *                   - cash
 *                   - CQ_code
 *                   - prompay
 *                 example: cash
 *               payment_status:
 *                 type: string
 *                 enum:
 *                   - paid
 *                   - unpaid
 *                 example: paid
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 120.00
 *
 *     responses:
 *       200:
 *         description: ✅ Payment updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Payment updated successfully
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
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Payment not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Payment not found
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
    const { id } = req.params;
    const { payment_method, payment_status, amount } = req.body;

    // ===============================
    // 1️⃣ validate id
    // ===============================
    const paymentId = parseInt(id, 10);
    if (Number.isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a positive number",
      });
    }

    // ===============================
    // 2️⃣ prepare update fields
    // ===============================
    const fields = [];
    const params = [];

    const validMethods = ["cash", "CQ_code", "prompay"];
    const validStatus = ["paid", "unpaid"];

    if (payment_method !== undefined) {
      if (!validMethods.includes(payment_method)) {
        return res.status(400).json({
          status: "bad_request",
          message: "Invalid payment_method",
        });
      }
      fields.push("payment_method = ?");
      params.push(payment_method);
    }

    if (payment_status !== undefined) {
      if (!validStatus.includes(payment_status)) {
        return res.status(400).json({
          status: "bad_request",
          message: "Invalid payment_status",
        });
      }
      fields.push("payment_status = ?");
      params.push(payment_status);

      // paid_at logic
      if (payment_status === "paid") {
        fields.push("paid_at = ?");
        params.push(new Date());
      } else {
        fields.push("paid_at = NULL");
      }
    }

    if (amount !== undefined) {
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          status: "bad_request",
          message: "amount must be a positive number",
        });
      }
      fields.push("amount = ?");
      params.push(amount);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "No fields to update",
      });
    }

    // ===============================
    // 3️⃣ update database
    // ===============================
    const [result] = await db.query(
      `
      UPDATE tbl_payments
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [...params, paymentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Payment not found",
      });
    }

    // ===============================
    // 4️⃣ success response
    // ===============================
    res.json({
      status: "ok",
      message: "Payment updated successfully",
    });
  } catch (err) {
    console.error("[PUT /api/payments/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
      detail: err.message,
    });
  }
});
//====================================================================================
//              funtion deleat payments
//====================================================================================
/**
 * @openapi
 * /api/payments/{id}:
 *   delete:
 *     tags:
 *       - Payments
 *     summary: 🗑️ Delete payment
 *     description: |
 *       ใช้สำหรับลบข้อมูลการชำระเงินตาม Payment ID
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
 *         description: Payment ID
 *
 *     responses:
 *       200:
 *         description: ✅ Payment deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Payment deleted successfully
 *
 *       400:
 *         description: ❌ Invalid ID
 *         content:
 *           application/json:
 *             example:
 *               status: bad_request
 *               message: id must be a positive number
 *
 *       401:
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: Unauthorized
 *
 *       404:
 *         description: ❌ Payment not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Payment not found
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
    const { id } = req.params;

    // ===============================
    // 1️⃣ validate id
    // ===============================
    const paymentId = parseInt(id, 10);
    if (Number.isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a positive number",
      });
    }

    // ===============================
    // 2️⃣ delete from database
    // ===============================
    const [result] = await db.query("DELETE FROM tbl_payments WHERE id = ?", [
      paymentId,
    ]);

    // ===============================
    // 3️⃣ not found
    // ===============================
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Payment not found",
      });
    }

    // ===============================
    // 4️⃣ success
    // ===============================
    res.json({
      status: "ok",
      message: "Payment deleted successfully",
    });
  } catch (err) {
    console.error("[DELETE /api/payments/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
      detail: err.message,
    });
  }
});

//====================================================================================
export default router;
