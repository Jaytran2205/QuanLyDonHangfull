import { Router } from "express";
import {
  createUser,
  listUsers,
  login,
  me,
  updatePermissions
} from "../controllers/authController.js";
import { adminOnly, authRequired } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", authRequired, me);
router.get("/users", authRequired, adminOnly, listUsers);
router.post("/users", authRequired, adminOnly, createUser);
router.put("/users/:id/permissions", authRequired, adminOnly, updatePermissions);

export default router;
