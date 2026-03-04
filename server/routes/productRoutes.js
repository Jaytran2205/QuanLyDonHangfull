import express from "express";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { authRequired, permissionRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired, permissionRequired("products"));

router.get("/", listProducts);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
