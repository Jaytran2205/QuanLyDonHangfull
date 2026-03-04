const API_BASE = "/api";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (_error) {
    return null;
  }
}

export function hasPermission(permissionKey, user = getCurrentUser()) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return Boolean(user.permissions?.[permissionKey]);
}

export function requireAuth(permissionKey) {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = "/login.html";
    return false;
  }

  if (permissionKey && !hasPermission(permissionKey, user)) {
    window.location.href = "/index.html";
    return false;
  }

  return true;
}

export function logout() {
  clearAuthSession();
  window.location.href = "/login.html";
}

// Ensure modal exists
function ensureModal() {
  if (!document.getElementById("modal-backdrop")) {
    const modal = document.createElement("div");
    modal.id = "modal-backdrop";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-title" id="modal-title">Thông báo</div>
        <div class="modal-message" id="modal-message">Tin nhắn</div>
        <div class="modal-buttons" id="modal-buttons">
          <button class="modal-btn modal-btn-secondary" onclick="closeModal()">Hủy</button>
          <button class="modal-btn modal-btn-primary" id="modal-confirm-btn" onclick="confirmModal()">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

window.closeModal = function() {
  const modal = document.getElementById("modal-backdrop");
  if (modal) {
    modal.classList.remove("active");
  }
};

window.confirmModal = function() {
  if (window._modalResolve) {
    window._modalResolve(true);
    window._modalResolve = null;
  }
  window.closeModal();
};

export function showAlert(title, message) {
  ensureModal();
  const modal = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;
  
  const buttons = document.getElementById("modal-buttons");
  buttons.innerHTML = `<button class="modal-btn modal-btn-primary" onclick="closeModal()">OK</button>`;
  
  modal.classList.add("active");
  
  return new Promise((resolve) => {
    window._modalResolve = () => {
      resolve();
      window.closeModal();
    };
    buttons.querySelector("button").onclick = window._modalResolve;
  });
}

export function showConfirm(title, message) {
  ensureModal();
  const modal = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;
  
  const buttons = document.getElementById("modal-buttons");
  buttons.innerHTML = `
    <button class="modal-btn modal-btn-secondary" onclick="rejectModal()">Hủy</button>
    <button class="modal-btn modal-btn-danger" onclick="confirmModal()">Xác nhận</button>
  `;
  
  modal.classList.add("active");
  
  return new Promise((resolve) => {
    window._modalResolve = resolve;
    buttons.querySelector(".modal-btn-secondary").onclick = () => {
      resolve(false);
      window.closeModal();
      window._modalResolve = null;
    };
    buttons.querySelector(".modal-btn-danger").onclick = () => {
      resolve(true);
      window.closeModal();
      window._modalResolve = null;
    };
  });
}

window.rejectModal = function() {
  if (window._modalResolve) {
    window._modalResolve(false);
    window._modalResolve = null;
  }
  window.closeModal();
};

export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `app-toast app-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearAuthSession();
    if (!window.location.pathname.endsWith("/login.html")) {
      window.location.href = "/login.html";
    }
    throw new Error(data.error || "Phiên đăng nhập đã hết hạn");
  }

  if (!response.ok) {
    throw new Error(data.error || "Yêu cầu thất bại");
  }
  return data;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(value || 0);
}

export function layoutTemplate(content, activePage) {
  const user = getCurrentUser();
  const nav = [
    { href: "/index.html", key: "dashboard", label: "Dashboard", permission: "dashboard" },
    { href: "/customers.html", key: "customers", label: "Khách hàng", permission: "customers" },
    { href: "/products.html", key: "products", label: "Sản phẩm", permission: "products" },
    { href: "/orders.html", key: "orders", label: "Đơn xuất hàng", permission: "orders" },
    { href: "/users.html", key: "users", label: "Tài khoản", permission: "users" }
  ];

  const allowedNav = nav.filter((item) => hasPermission(item.permission, user));

  const theme = localStorage.getItem("theme") || "dark";
  const themeIcon = theme === "light" ? "🌙" : "☀️";

  document.body.classList.toggle("light-mode", theme === "light");

  return `
    <button class="theme-toggle" onclick="toggleTheme()" title="Đổi chế độ">${themeIcon}</button>
    <div class="min-h-screen lg:flex">
      <aside class="w-full lg:w-72 p-4 lg:p-6">
        <div class="panel p-4">
          <div class="gradient-header rounded-xl p-4">
            <h1 class="text-2xl font-bold">Quản Lý Nội Bộ</h1>
            <p class="mt-1 text-sm text-indigo-100">${user?.username || "Người dùng"} | ${user?.role || "user"}</p>
          </div>
          <nav class="mt-4 space-y-2">
            ${allowedNav
              .map(
                (item) => `<a class="sidebar-link ${
                  item.key === activePage ? "active" : ""
                }" href="${item.href}">${item.label}</a>`
              )
              .join("")}
          </nav>
          <button class="btn-muted w-full mt-4" onclick="logout()">Đăng xuất</button>
        </div>
      </aside>
      <main class="flex-1 p-4 lg:p-6">${content}</main>
    </div>
  `;
}

export function toggleTheme() {
  const body = document.body;
  const button = document.querySelector(".theme-toggle");
  const isDark = !body.classList.contains("light-mode");
  
  if (isDark) {
    // Switch to light mode
    body.classList.add("light-mode");
    button.textContent = "🌙";
    localStorage.setItem("theme", "light");
  } else {
    // Switch to dark mode
    body.classList.remove("light-mode");
    button.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  }
}

export function initTheme() {
  const body = document.body;
  const button = document.querySelector(".theme-toggle");
  const theme = localStorage.getItem("theme") || "dark";
  
  if (theme === "light") {
    body.classList.add("light-mode");
    if (button) button.textContent = "🌙";
  } else {
    body.classList.remove("light-mode");
    if (button) button.textContent = "☀️";
  }
}

window.toggleTheme = toggleTheme;
window.logout = logout;
