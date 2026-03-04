import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createOrder, getDashboard, listOrders, deleteOrder } from "../controllers/orderController.js";
import { authRequired, permissionRequired } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${Date.now()}-${base || "invoice"}${ext}`);
  }
});

const upload = multer({ storage });

const router = Router();

router.get("/dashboard/summary", authRequired, permissionRequired("dashboard"), getDashboard);
router.get("/", authRequired, permissionRequired("orders"), listOrders);
router.post("/", authRequired, permissionRequired("orders"), upload.single("invoice"), createOrder);
router.delete("/:id", authRequired, permissionRequired("orders"), deleteOrder);

export default router;
