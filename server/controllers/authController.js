import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signAuthToken } from "../middleware/auth.js";

function normalizePermissions(input = {}) {
  return {
    dashboard: Boolean(input.dashboard),
    customers: Boolean(input.customers),
    products: Boolean(input.products),
    orders: Boolean(input.orders),
    users: Boolean(input.users)
  };
}

function serializeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    role: user.role,
    permissions: user.permissions || {}
  };
}

export async function login(req, res) {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!username || !password) {
    res.status(400).json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu" });
    return;
  }

  const user = await User.findOne({ username });
  if (!user) {
    res.status(401).json({ error: "Tài khoản hoặc mật khẩu không đúng" });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Tài khoản hoặc mật khẩu không đúng" });
    return;
  }

  const token = signAuthToken(user);

  res.json({
    token,
    user: serializeUser(user)
  });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(401).json({ error: "Tài khoản không tồn tại" });
    return;
  }

  res.json({ user: serializeUser(user) });
}

export async function listUsers(_req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map(serializeUser));
}

export async function createUser(req, res) {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const permissions = normalizePermissions(req.body.permissions || {});

  if (!username || !password) {
    res.status(400).json({ error: "Tên đăng nhập và mật khẩu là bắt buộc" });
    return;
  }

  const exists = await User.findOne({ username });
  if (exists) {
    res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    passwordHash,
    role: "user",
    permissions
  });

  res.status(201).json(serializeUser(user));
}

export async function updatePermissions(req, res) {
  const { id } = req.params;
  const permissions = normalizePermissions(req.body.permissions || {});

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "Tài khoản không tồn tại" });
    return;
  }

  if (user.role === "admin") {
    res.status(400).json({ error: "Không thể thay đổi quyền của admin chính" });
    return;
  }

  user.permissions = permissions;
  await user.save();

  res.json(serializeUser(user));
}

export async function seedDefaultAdmin() {
  const adminUsername = "admin";
  const existing = await User.findOne({ username: adminUsername });
  if (existing) return;

  const passwordHash = await bcrypt.hash("123456", 10);
  await User.create({
    username: adminUsername,
    passwordHash,
    role: "admin",
    permissions: {
      dashboard: true,
      customers: true,
      products: true,
      orders: true,
      users: true
    }
  });

  console.log("Đã tạo tài khoản admin mặc định: admin / 123456");
}
