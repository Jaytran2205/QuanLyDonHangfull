import Customer from "../models/Customer.js";
import Order from "../models/Order.js";

export async function listCustomers(_req, res) {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json(customers);
}

export async function createCustomer(req, res) {
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();

  if (!name) {
    res.status(400).json({ error: "Tên khách hàng là bắt buộc" });
    return;
  }

  const customer = await Customer.create({ name, phone });
  res.status(201).json(customer);
}

export async function updateCustomer(req, res) {
  const { id } = req.params;
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();

  if (!name) {
    res.status(400).json({ error: "Tên khách hàng là bắt buộc" });
    return;
  }

  const customer = await Customer.findByIdAndUpdate(
    id,
    { name, phone },
    { new: true, runValidators: true }
  );

  if (!customer) {
    res.status(404).json({ error: "Không tìm thấy khách hàng" });
    return;
  }

  res.json(customer);
}

export async function deleteCustomer(req, res) {
  const { id } = req.params;

  const linkedOrder = await Order.findOne({ customer: id });
  if (linkedOrder) {
    res.status(400).json({ error: "Không thể xóa khách hàng đã có đơn" });
    return;
  }

  const deleted = await Customer.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ error: "Không tìm thấy khách hàng" });
    return;
  }

  res.json({ ok: true });
}
