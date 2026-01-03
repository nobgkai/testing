import jwt from "jsonwebtoken";

export default function verifyToken(req, res, next) {
  try {
    // ดึง header Authorization
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "ไม่มี Token" });
    }

    // ต้องมีรูปแบบ Bearer <token>
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "รูปแบบ Token ไม่ถูกต้อง" });
    }

    // ตรวจสอบ token ด้วย JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ error: "Token ไม่ถูกต้อง" });
      }

      // เก็บข้อมูล user ไว้ใน req
      req.user = user;

      next(); // ไปยัง API ถัดไป
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
