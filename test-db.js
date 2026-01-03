import { db } from "./config/db.js";

try {
  const [rows] = await db.query("SELECT 1 + 1 AS result");
  console.log("DB CONNECT OK:", rows);
} catch (err) {
  console.error("DB CONNECT FAIL:", err.message);
} finally {
  process.exit(0);
}
