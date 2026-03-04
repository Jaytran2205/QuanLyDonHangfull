import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { seedDefaultAdmin } from "./controllers/authController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/order_internal_db";
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "..", "client")));

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "QuanLyDonHangBackend" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Lỗi máy chủ" });
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    await seedDefaultAdmin();
    const server = app.listen(PORT, () => {
      console.log(`Server chạy tại http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.error(`Cổng ${PORT} đã được sử dụng`);
      } else {
        console.error("Không thể khởi động server:", error.message);
      }

      process.exit(1);
    });
  } catch (error) {
    console.error("Không thể kết nối MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
