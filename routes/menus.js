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
// get all menus
//=======================================================
/**
 * @openapi
 * /api/menus:
 *   get:
 *     tags:
 *       - Menus
 *     summary: 📋 Get all menus
 *     description: |
 *       Retrieve a paginated list of all menus.
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
 *         description: Number of menus per page (max 100)
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
 *                   restaurant_id: 1
 *                   menu_name: Pad Thai
 *                   description: Stir-fried rice noodles with shrimp
 *                   price: 60.00
 *                   category: main_dish
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

router.get("/", auth, async (req, res) => {
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
        restaurant_id,
        menu_name,
        description,
        price,
        category,
        created_at,
        updated_at
      FROM tbl_menus
    `;

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
        "SELECT COUNT(*) AS total FROM tbl_menus"
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
//=======================================================
// get by {id} menus
//=======================================================

/**
 * @openapi
 * /api/menus/{id}:
 *   get:
 *     tags:
 *       - Menus
 *     summary: 🍽️ Get menu by ID
 *     description: |
 *       ดึงข้อมูลเมนูอาหาร 1 รายการตาม Menu ID
 *
 *       🔹 ใช้สำหรับ:
 *       - ดูรายละเอียดเมนูแบบเจาะจง
 *       - แสดงข้อมูลหน้าแก้ไขเมนู
 *       - ใช้งานร่วมกับระบบสั่งอาหาร
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
 *           รหัสเมนู (Menu ID)
 *           ตัวอย่าง: `1`
 *
 *     responses:
 *       200:
 *         description: ✅ ดึงข้อมูลเมนูสำเร็จ
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 id: 1
 *                 name: "ผัดกะเพรา"
 *                 price: 50
 *                 category: "อาหารจานเดียว"
 *                 is_available: true
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
 *         description: ❌ ไม่พบเมนูที่ระบุ
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Menu not found"
 *
 *       500:
 *         description: 💥 Internal Server Error
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
        restaurant_id,
        menu_name,
        description,
        price,
        category,
        created_at,
        updated_at
      FROM tbl_menus
      WHERE id = ${id}
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Menu not found",
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
//=======================================================
// post menus
//=======================================================
/**
 * @openapi
 * /api/menus:
 *   post:
 *     tags:
 *       - Menus
 *     summary: ➕ Create menu
 *     description: |
 *       Create a new menu item.
 *       🔒 Requires authentication - Click **Authorize** button first!
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
 *               - restaurant_id
 *               - menu_name
 *               - price
 *               - category
 *             properties:
 *               restaurant_id:
 *                 type: integer
 *                 example: 1
 *               menu_name:
 *                 type: string
 *                 example: Pad Thai
 *               description:
 *                 type: string
 *                 example: Stir-fried rice noodles with shrimp
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 60.00
 *               category:
 *                 type: string
 *                 enum:
 *                   - main_dish
 *                   - dessert
 *                   - drink
 *                   - recommended
 *                 example: main_dish
 *
 *     responses:
 *       201:
 *         description: ✅ Menu created successfully
 *       400:
 *         description: ⚠️ Missing required fields
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Missing required fields"
 *
 *       401:
 *         description: 🔒 Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Unauthorized"
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */
router.post("/", auth, async (req, res) => {
  try {
    const { restaurant_id, menu_name, description, price, category } = req.body;

    if (!restaurant_id || !menu_name || !price || !category) {
      return res.status(400).json({
        status: "bad_request",
        message: "Missing required fields",
      });
    }

    await db.query(
      `
      INSERT INTO tbl_menus
      (restaurant_id, menu_name, description, price, category)
      VALUES (?, ?, ?, ?, ?)
      `,
      [restaurant_id, menu_name, description ?? null, price, category]
    );

    res.status(201).json({
      status: "ok",
      message: "Menu created successfully",
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});
//=======================================================
// put menus
//=======================================================
/**
 * @openapi
 * /api/menus/{id}:
 *   put:
 *     tags:
 *       - Menus
 *     summary: ✏️ Update menu
 *     description: |
 *       Update an existing menu.
 *       You can send only the fields you want to update.
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
 *         description: Menu ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurant_id:
 *                 type: integer
 *                 example: 1
 *               menu_name:
 *                 type: string
 *                 example: Pad Thai
 *               description:
 *                 type: string
 *                 example: Stir-fried rice noodles with shrimp
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 65.00
 *               category:
 *                 type: string
 *                 enum:
 *                   - main_dish
 *                   - dessert
 *                   - drink
 *                   - recommended
 *                 example: main_dish
 *
 *     responses:
 *       200:
 *         description: ✅ Menu updated successfully
 *       400:
 *         description: ⚠️ No fields to update
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "No fields to update"
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
 *         description: ❌ Menu not found
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Menu not found"
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */

router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id, menu_name, description, price, category } = req.body;

    const fields = [];
    const params = [];

    if (restaurant_id !== undefined) {
      fields.push("restaurant_id = ?");
      params.push(restaurant_id);
    }
    if (menu_name !== undefined) {
      fields.push("menu_name = ?");
      params.push(menu_name);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description);
    }
    if (price !== undefined) {
      fields.push("price = ?");
      params.push(price);
    }
    if (category !== undefined) {
      fields.push("category = ?");
      params.push(category);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        status: "bad_request",
        message: "No fields to update",
      });
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    const [result] = await db.query(
      `UPDATE tbl_menus SET ${fields.join(", ")} WHERE id = ?`,
      [...params, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Menu not found",
      });
    }

    res.json({
      status: "ok",
      message: "Menu updated successfully",
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});
//=======================================================
// DELETE menus
//=======================================================
/**
 * @openapi
 * /api/menus/{id}:
 *   delete:
 *     tags:
 *       - Menus
 *     summary: 🗑️ Delete menu
 *     description: |
 *       Delete a menu by ID.
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
 *         description: Menu ID
 *
 *     responses:
 *       200:
 *         description: ✅ Menu deleted successfully
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
 *         description: ❌ Menu not found
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Menu not found"
 *
 *       500:
 *         description: ❌ Server error
 *         content:
 *           application/json:
 *             example:
 *               status: error
 *               message: "Internal server error"
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM tbl_menus WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Menu not found",
      });
    }

    res.json({
      status: "ok",
      message: "Menu deleted successfully",
    });
  } catch (err) {
    return sendDbError(res, err);
  }
});

//=============== จุดจบไฟล์ ==============================
export default router;
