import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";

// ===============================
// ทำ __dirname สำหรับ ES Module
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// Swagger Options
// ===============================
const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "BackEnd API",
      version: "1.0.0",
      description: `
ยินดีต้อนรับสู่เอกสาร API  
API นี้ให้บริการจัดการผู้ใช้และระบบยืนยันตัวตนอย่างครบครัน

---

## 🔐 วิธีการยืนยันตัวตน

### ขั้นตอนที่ 1: สมัครสมาชิก (ถ้ายังไม่มีบัญชี)
ใช้ **POST /api/users**

\`\`\`json
{
  "firstname": "ทดสอบ",
  "fullname": "ผู้ใช้ทดสอบ",
  "lastname": "ระบบ",
  "username": "testuser",
  "password": "password123"
}
\`\`\`

---

### ขั้นตอนที่ 2: เข้าสู่ระบบ
ใช้ **POST /login**

\`\`\`json
{
  "username": "testuser",
  "password": "password123"
}
\`\`\`

---

### ขั้นตอนที่ 3: ยืนยันสิทธิ์
1. คัดลอก **token** จากผลลัพธ์การเข้าสู่ระบบ  
2. คลิกปุ่ม 🔓 **Authorize** (มุมขวาบน)  
3. วาง token (**ไม่ต้องใส่ Bearer**)  
4. คลิก **Authorize**

🎉 ตอนนี้คุณสามารถเรียก API ที่ต้องยืนยันตัวตนได้แล้ว

---

## 📚 อ้างอิงด่วน

| การกระทำ | Endpoint | ต้องยืนยันตัวตน |
|--------|---------|----------------|
| สมัครสมาชิก | POST /api/users | ❌ |
| เข้าสู่ระบบ | POST /login | ❌ |
| ออกจากระบบ | POST /logout | ✅ |
| ดูผู้ใช้ทั้งหมด | GET /api/users | ✅ |
| ดูผู้ใช้ตาม ID | GET /api/users/:id | ✅ |
| แก้ไขผู้ใช้ | PUT /api/users/:id | ✅ |
| ลบผู้ใช้ | DELETE /api/users/:id | ✅ |
`,
    },
    tags: [
      { name: "Auth", description: "ระบบยืนยันตัวตน" },
      { name: "Users", description: "จัดการผู้ใช้งาน" },
      { name: "Menus", description: "จัดการเมนูอาหาร" },
      { name: "Orders", description: "จัดการคำสั่งซื้อ" },
      { name: "Payments", description: "การชำระเงิน" },
      { name: "Restaurants", description: "ข้อมูลร้านอาหาร" },
      { name: "Shippings", description: "การจัดส่ง" },
    ],

    // ===============================
    // 🔐 Security (JWT Bearer)
    // ===============================
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      // ===============================
      // Schemas กลาง
      // ===============================
      schemas: {
        Customer: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            username: { type: "string", example: "john123" },
            firstname: { type: "string", example: "Mr." },
            fullname: { type: "string", example: "John Smith" },
            lastname: { type: "string", example: "Smith" },
            address: {
              type: "string",
              example: "101/5 Main Street, London",
            },
            phone: { type: "string", example: "0812345678" },
            email: {
              type: "string",
              example: "john.smith@example.com",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },

        CustomerInput: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "john123" },
            password: { type: "string", example: "123456" },
            firstname: { type: "string", example: "Mr." },
            fullname: { type: "string", example: "John Smith" },
            lastname: { type: "string", example: "Smith" },
            address: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },

    // ===============================
    // 🔐 ค่า default: API ต้อ�