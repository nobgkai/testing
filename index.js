import dotenv from "dotenv";
dotenv.config();

import express from "express";

import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import menusRouter from "./routes/menus.js";
import ordersRouter from "./routes/orders.js";
import payemntsRouter from "./routes/payments.js";
import restaurantsRouter from "./routes/restaurants.js";
import shippingsRouter from "./routes/shippings.js";

//import { swaggerUi, specs } from "./swagger.js";

const app = express();

app.use(express.json());

app.use(express.static("public"));
// Swagger
//app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/", authRouter); // ✅ login / logout
app.use("/api/users", usersRouter);
app.use("/api/menus", menusRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", payemntsRouter);
app.use("/api/restaurants", restaurantsRouter);
app.use("/api/shippings", shippingsRouter);

// test ping
app.get("/ping", (req, res) => {
  res.json({ message: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger → http://localhost:${PORT}/docs`);
});
