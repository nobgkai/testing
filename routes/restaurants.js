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

//=====================================================
//          get all restaurants
//=====================================================
/**
 * @openapi
 * /api/restaurants:
 *   get:
 *     tags:
 *       - Restaurants
 *     summary: 🍽️ Get all restaurants
 *     description: |
 *       ดึงรายการร้านอาหารทั้งหมด
 *       รองรับ pagination
 *       🔒 Requires authentication
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
 *                   restaurant_name: "Boom Restaurant"
 *                   address: "Chiang Mai"
 *                   phone: "0812345678"
 *                   menu_description: "Thai food"
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
    let { limit, page } = req.query;

    limit = parseInt(limit ?? "10", 10);
    page = parseInt(page ?? "1", 10);

    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "limit must be a positive number",
      });
    }

    if (isNaN(page) || page <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "page must be a positive number",
      });
    }

    limit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `
      SELECT
        id,
        restaurant_name,
        address,
        phone,
        menu_description,
        created_at,
        updated_at
      FROM tbl_restaurants
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    const [[totalRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM tbl_restaurants"
    );

    res.json({
      status: "ok",
      count: rows.length,
      data: rows,
      total: totalRow.total,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});

//=====================================================
//          get by id restaurants
//=====================================================
/**
 * @openapi
 * /api/restaurants/{id}:
 *   get:
 *     tags:
 *       - Restaurants
 *     summary: 🍽️ Get restaurant by ID
 *     description: |
 *       ดึงข้อมูลร้านอาหารตาม ID
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
 *         description: Restaurant ID
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
 *                 restaurant_name: "Boom Restaurant"
 *                 address: "Chiang Mai"
 *                 phone: "0812345678"
 *                 menu_description: "Thai food"
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
 *         description: ❌ Restaurant not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Restaurant not found
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

    // query database
    const [rows] = await db.query(
      `
      SELECT
        id,
        restaurant_name,
        address,
        phone,
        menu_description,
        created_at,
        updated_at
      FROM tbl_restaurants
      WHERE id = ?
      `,
      [id]
    );

    // 404: ไม่พบข้อมูล
    if (rows.length === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Restaurant not found",
      });
    }

    // 200: success
    res.json({
      status: "ok",
      data: rows[0],
    });
  } catch (err) {
    console.error("[GET /api/restaurants/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});
//=====================================================
//          post restaurants
//=====================================================
/**
 * @openapi
 * /api/restaurants:
 *   post:
 *     tags:
 *       - Restaurants
 *     summary: ➕ Create restaurant
 *     description: |
 *       ใช้สำหรับสร้างร้านอาหารใหม่
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
 *               - restaurant_name
 *             properties:
 *               restaurant_name:
 *                 type: string
 *                 example: "Boom Restaurant"
 *               address:
 *                 type: string
 *                 example: "Chiang Mai"
 *               phone:
 *                 type: string
 *                 example: "0812345678"
 *               menu_description:
 *                 type: string
 *                 example: "Thai food"
 *
 *     responses:
 *       201:
 *         description: ✅ Restaurant created successfully
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
 *               message: restaurant_name is required
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
    const { restaurant_name, address, phone, menu_description } = req.body;

    // 400: missing required field
    if (!restaurant_name || restaurant_name.trim() === "") {
      return res.status(400).json({
        status: "bad_request",
        message: "restaurant_name is required",
      });
    }

    // insert database
    const [result] = await db.query(
      `
      INSERT INTO tbl_restaurants
      (restaurant_name, address, phone, menu_description)
      VALUES (?, ?, ?, ?)
      `,
      [
        restaurant_name,
        address ?? null,
        phone ?? null,
        menu_description ?? null,
      ]
    );

    // 201: created
    res.status(201).json({
      status: "ok",
      id: result.insertId,
    });
  } catch (err) {
    console.error("[POST /api/restaurants ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});
//=====================================================
//          put restaurants
//=====================================================
/**
 * @openapi
 * /api/restaurants/{id}:
 *   put:
 *     tags:
 *       - Restaurants
 *     summary: ✏️ Update restaurant by ID
 *     description: |
 *       ใช้สำหรับแก้ไขข้อมูลร้านอาหารตาม ID
 *       สามารถส่งมาเฉพาะ field ที่ต้องการแก้ไขได้
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
 *         description: Restaurant ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurant_name:
 *                 type: string
 *                 example: "Boom Restaurant"
 *               address:
 *                 type: string
 *                 example: "Chiang Mai"
 *               phone:
 *                 type: string
 *                 example: "0812345678"
 *               menu_description:
 *                 type: string
 *                 example: "Thai food"
 *
 *     responses:
 *       200:
 *         description: ✅ Restaurant updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Restaurant updated successfully
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
 *         description: ❌ Restaurant not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Restaurant not found
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
    const { restaurant_name, address, phone, menu_description } = req.body;

    // 400: id ไม่ถูกต้อง
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "id must be a number",
      });
    }

    // เตรียม field ที่จะอัปเดต
    const fields = [];
    const params = [];

    if (restaurant_name !== undefined) {
      fields.push("restaurant_name = ?");
      params.push(restaurant_name);
    }
    if (address !== undefined) {
      fields.push("address = ?");
      params.push(address);
    }
    if (phone !== undefined) {
      fields.push("phone = ?");
      params.push(phone);
    }
    if (menu_description !== undefined) {
      fields.push("menu_description = ?");
      params.push(menu_description);
    }

    // 400: ไม่มี field ให้แก้
    if (fields.length === 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "No fields to update",
      });
    }

    // update database
    const [result] = await db.query(
      `
      UPDATE tbl_restaurants
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [...params, id]
    );

    // 404: ไม่พบข้อมูล
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Restaurant not found",
      });
    }

    // 200: success
    res.json({
      status: "ok",
      message: "Restaurant updated successfully",
    });
  } catch (err) {
    console.error("[PUT /api/restaurants/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});
//=====================================================
//          deleate restaurants
//=====================================================
/**
 * @openapi
 * /api/restaurants/{id}:
 *   delete:
 *     tags:
 *       - Restaurants
 *     summary: 🗑️ Delete restaurant by ID
 *     description: |
 *       ใช้สำหรับลบข้อมูลร้านอาหารตาม ID
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
 *         description: Restaurant ID
 *
 *     responses:
 *       200:
 *         description: ✅ Restaurant deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: ok
 *               message: Restaurant deleted successfully
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
 *         description: ❌ Restaurant not found
 *         content:
 *           application/json:
 *             example:
 *               status: not_found
 *               message: Restaurant not found
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

    // delete database
    const [result] = await db.query(
      "DELETE FROM tbl_restaurants WHERE id = ?",
      [id]
    );

    // 404: ไม่พบข้อมูล
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Restaurant not found",
      });
    }

    // 200: success
    res.json({
      status: "ok",
      message: "Restaurant deleted successfully",
    });
  } catch (err) {
    console.error("[DELETE /api/restaurants/:id ERROR]", err);
    res.status(500).json({
      status: "error",
      message: "Database error",
    });
  }
});

//=====================================================
export default router;
