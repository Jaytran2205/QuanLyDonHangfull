import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "order_management_secret_key";

export function signAuthToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      username: user.username,
      role: user.role,
      permissions: user.permissions || {}
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Bạn chưa đăng nhập" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (_error) {
    res.status(401).json({ error: "Phiên đăng nhập không hợp lệ" });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Bạn không có quyền quản trị" });
    return;
  }
  next();
}

export function permissionRequired(permissionKey) {
  return (req, res, next) => {
    if (req.user?.role === "admin") {
      next();
      return;
    }

    const permissions = req.user?.permissions || {};
    if (!permissions[permissionKey]) {
      res.status(403).json({ error: "Bạn không có quyền truy cập chức năng này" });
      return;
    }

    next();
  };
}
