export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Yêu cầu thất bại");
  }
  return res.json();
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  request(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) =>
  request(path, { method: "DELETE" });

export async function apiPostForm(path, formData) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Yêu cầu thất bại");
  }
  return res.json();
}
