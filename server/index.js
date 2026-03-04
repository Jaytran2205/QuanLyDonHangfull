import cors from "cors";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { all, get, init, run } from "./db.js";

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const safeBase = base || "invoice";
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/customers", async (_req, res) => {
  try {
    const customers = await all("SELECT * FROM customers ORDER BY id DESC");
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy khách hàng" });
  }
});

app.post("/customers", async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    res.status(400).json({ error: "Thiếu tên khách hàng" });
    return;
  }

  try {
    const result = await run(
      "INSERT INTO customers (name, created_at) VALUES (?, datetime('now'))",
      [String(name).trim()]
    );
    const customer = await get("SELECT * FROM customers WHERE id = ?", [
      result.lastID
    ]);
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: "Khách hàng đã tồn tại" });
  }
});

app.get("/products", async (_req, res) => {
  try {
    const products = await all(
      "SELECT * FROM products ORDER BY id DESC"
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy sản phẩm" });
  }
});

app.post("/products", async (req, res) => {
  const { name, cost_price, sale_price, stock } = req.body;
  if (!name || cost_price == null || sale_price == null || stock == null) {
    res.status(400).json({ error: "Thiếu thông tin sản phẩm" });
    return;
  }

  try {
    const result = await run(
      "INSERT INTO products (name, cost_price, sale_price, stock) VALUES (?, ?, ?, ?)",
      [name, cost_price, sale_price, stock]
    );
    const product = await get("SELECT * FROM products WHERE id = ?", [
      result.lastID
    ]);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Không thể tạo sản phẩm" });
  }
});

app.put("/products/:id", async (req, res) => {
  const { name, cost_price, sale_price, stock } = req.body;
  const { id } = req.params;
  if (!name || cost_price == null || sale_price == null || stock == null) {
    res.status(400).json({ error: "Thiếu thông tin cập nhật" });
    return;
  }

  try {
    await run(
      "UPDATE products SET name = ?, cost_price = ?, sale_price = ?, stock = ? WHERE id = ?",
      [name, cost_price, sale_price, stock, id]
    );
    const product = await get("SELECT * FROM products WHERE id = ?", [id]);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Không thể cập nhật sản phẩm" });
  }
});

app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await run("DELETE FROM products WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Không thể xóa sản phẩm" });
  }
});

app.post("/orders", upload.single("invoice"), async (req, res) => {
  try {
    let items = req.body.items;

    // Parse items if it's a string (from FormData)
    if (typeof items === "string") {
      items = JSON.parse(items);
    }

    // Validate items is an array
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Đơn hàng trống" });
      return;
    }

    const customerIdRaw = req.body.customer_id;
    const customerId = customerIdRaw ? Number(customerIdRaw) : null;
    let customerName = req.body.customer_name
      ? String(req.body.customer_name).trim()
      : null;

    if (customerId != null) {
      if (Number.isNaN(customerId) || customerId <= 0) {
        res.status(400).json({ error: "Khách hàng không hợp lệ" });
        return;
      }
      const customer = await get("SELECT * FROM customers WHERE id = ?", [
        customerId
      ]);
      if (!customer) {
        res.status(400).json({ error: "Khách hàng không tồn tại" });
        return;
      }
      customerName = customer.name;
    }

    const invoiceImage = req.file ? `/uploads/${req.file.filename}` : null;

    await run("BEGIN");

    let total = 0;
    const prepared = [];

    for (const item of items) {
      const quantity = Number(item.quantity);
      const product = await get(
        "SELECT * FROM products WHERE id = ?",
        [item.product_id]
      );

      if (!product) {
        throw new Error("Sản phẩm không tồn tại");
      }
      if (Number.isNaN(quantity) || quantity <= 0) {
        throw new Error("Số lượng không hợp lệ");
      }
      if (product.stock < quantity) {
        throw new Error("Không đủ tồn kho");
      }

      const lineTotal = product.sale_price * quantity;
      total += lineTotal;
      prepared.push({
        product,
        quantity,
        cost_price: product.cost_price,
        price: product.sale_price,
        total: lineTotal
      });
    }

    const orderResult = await run(
      "INSERT INTO orders (total, created_at, customer_id, customer_name, invoice_image) VALUES (?, datetime('now'), ?, ?, ?)",
      [total, customerId, customerName, invoiceImage]
    );

    for (const line of prepared) {
      await run(
        "INSERT INTO order_items (order_id, product_id, quantity, cost_price, price, total) VALUES (?, ?, ?, ?, ?, ?)",
        [
          orderResult.lastID,
          line.product.id,
          line.quantity,
          line.cost_price,
          line.price,
          line.total
        ]
      );
      await run("UPDATE products SET stock = stock - ? WHERE id = ?", [
        line.quantity,
        line.product.id
      ]);
    }

    await run("COMMIT");
    res.json({ id: orderResult.lastID, total });
  } catch (err) {
    await run("ROLLBACK");
    res.status(400).json({ error: err.message || "Không thể tạo đơn hàng" });
  }
});

app.get("/orders", async (_req, res) => {
  try {
    const orders = await all("SELECT * FROM orders ORDER BY created_at DESC");
    const items = await all(
      "SELECT oi.id, oi.order_id, oi.quantity, oi.price, oi.total, p.name as product_name FROM order_items oi JOIN products p ON p.id = oi.product_id ORDER BY oi.id ASC"
    );

    const grouped = orders.map((order) => ({
      ...order,
      items: items.filter((item) => item.order_id === order.id)
    }));

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy đơn hàng" });
  }
});

app.get("/reports/customer-profit", async (_req, res) => {
  try {
    const rows = await all(
      `SELECT
        COALESCE(o.customer_name, 'Khách lẻ') AS customer_name,
        SUM(oi.total) AS revenue,
        SUM(oi.cost_price * oi.quantity) AS cost,
        SUM(oi.total - (oi.cost_price * oi.quantity)) AS profit,
        COUNT(DISTINCT o.id) AS order_count
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      GROUP BY COALESCE(o.customer_name, 'Khách lẻ')
      ORDER BY profit DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Không thể lấy báo cáo lợi nhuận" });
  }
});

async function start() {
  await init();
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

start();
