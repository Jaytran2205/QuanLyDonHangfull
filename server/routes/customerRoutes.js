import { Router } from "express";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer
} from "../controllers/customerController.js";
import { authRequired, permissionRequired } from "../middleware/auth.js";

const router = Router();

router.use(authRequired, permissionRequired("customers"));

router.get("/", listCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
