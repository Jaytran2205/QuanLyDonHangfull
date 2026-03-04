import { Router } from "express";
import { exportReport } from "../controllers/reportController.js";
import { authRequired, permissionRequired } from "../middleware/auth.js";

const router = Router();

// Export system statistics to Excel file (.xlsx)
router.get("/export", authRequired, permissionRequired("dashboard"), exportReport);

export default router;
