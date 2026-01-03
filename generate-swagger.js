import swaggerJsdoc from "swagger-jsdoc";
import { specs } from "./swagger.js";
import fs from "fs";

fs.writeFileSync("./public/docs/swagger.json", JSON.stringify(specs, null, 2));

console.log("✅ swagger.json generated");
