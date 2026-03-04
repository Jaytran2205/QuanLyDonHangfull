import { useEffect, useMemo, useState } from "react";
import { API_URL, apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "./api";

const MENU = [
  { key: "dashboard", label: "Dashboard" },
  { key: "customers", label: "Khách hàng" },
  { key: "products", label: "Sản phẩm" },
  { key: "sales", label: "Bán hàng" },
  { key: "history", label: "Lịch sử" }
];

const ADMIN = { username: "admin", password: "123456" };

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND"
});

function getGreeting(hour) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function App() {
  const [active, setActive] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerProfit, setCustomerProfit] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    id: null,
    name: "",
    cost_price: "",
    sale_price: "",
    stock: ""
  });
  const [order, setOrder] = useState({
    product_id: "",
    customer_id: "",
    quantity: 1,
    customer_name: "",
    invoiceFile: null
  });
  const [newCustomerName, setNewCustomerName] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [auth, setAuth] = useState({
    username: "",
    password: "",
    loggedIn: false,
    error: ""
  });
  const [showFinancial, setShowFinancial] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [productsData, ordersData, customersData, customerProfitData] = await Promise.all([
        apiGet("/products"),
        apiGet("/orders"),
        apiGet("/customers"),
        apiGet("/reports/customer-profit")
      ]);
      setProducts(productsData);
      setOrders(ordersData);
      setCustomers(customersData);
      setCustomerProfit(customerProfitData);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.loggedIn) {
      loadData();
    }
  }, [auth.loggedIn]);

  const handleLogin = (event) => {
    event.preventDefault();
    if (
      auth.username.trim() === ADMIN.username &&
      auth.password === ADMIN.password
    ) {
      setAuth((prev) => ({ ...prev, loggedIn: true, error: "" }));
    } else {
      setAuth((prev) => ({
        ...prev,
        error: "Sai tài khoản hoặc mật khẩu"
      }));
    }
  };

  const handleLogout = () => {
    setAuth({ username: "", password: "", loggedIn: false, error: "" });
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price),
        stock: Number(form.stock)
      };
      if (!payload.name) {
        throw new Error("Cần nhập tên sản phẩm");
      }
      if (Number.isNaN(payload.cost_price) || Number.isNaN(payload.sale_price)) {
        throw new Error("Giá không hợp lệ");
      }
      if (Number.isNaN(payload.stock)) {
        throw new Error("Tồn kho không hợp lệ");
      }

      if (form.id) {
        await apiPut(`/products/${form.id}`, payload);
      } else {
        await apiPost("/products", payload);
      }
      setForm({ id: null, name: "", cost_price: "", sale_price: "", stock: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể lưu sản phẩm");
    }
  };

  const handleEditProduct = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      stock: product.stock
    });
  };

  const handleDeleteProduct = async (productId) => {
    setError("");
    try {
      await apiDelete(`/products/${productId}`);
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể xóa sản phẩm");
    }
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const quantity = Number(order.quantity);
      if (!order.product_id) {
        throw new Error("Chọn sản phẩm trước khi thanh toán");
      }
      if (Number.isNaN(quantity) || quantity <= 0) {
        throw new Error("Số lượng không hợp lệ");
      }
      const items = [{ product_id: Number(order.product_id), quantity }];
      const customerName = order.customer_name.trim();
      const customerId = order.customer_id ? Number(order.customer_id) : null;

      if (customerId != null && Number.isNaN(customerId)) {
        throw new Error("Khách hàng không hợp lệ");
      }

      if (order.invoiceFile) {
        const formData = new FormData();
        formData.append("items", JSON.stringify(items));
        if (customerId != null) {
          formData.append("customer_id", String(customerId));
        }
        if (customerName) {
          formData.append("customer_name", customerName);
        }
        formData.append("invoice", order.invoiceFile);
        await apiPostForm("/orders", formData);
      } else {
        await apiPost("/orders", {
          items,
          customer_id: customerId,
          customer_name: customerName || null
        });
      }
      setOrder({
        product_id: "",
        customer_id: "",
        quantity: 1,
        customer_name: "",
        invoiceFile: null
      });
      setFileKey((prev) => prev + 1);
      await loadData();
      setActive("history");
    } catch (err) {
      setError(err.message || "Không thể tạo đơn hàng");
    }
  };

  const handleCreateCustomer = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const name = newCustomerName.trim();
      if (!name) {
        throw new Error("Cần nhập tên khách hàng");
      }
      const created = await apiPost("/customers", { name });
      setCustomers((prev) => [created, ...prev]);
      setNewCustomerName("");
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể thêm khách hàng");
    }
  };

  const activeProduct = products.find(
    (item) => String(item.id) === String(order.product_id)
  );
  const orderTotal = activeProduct
    ? activeProduct.sale_price * Number(order.quantity || 0)
    : 0;

  const revenue = useMemo(() => {
    const now = new Date();
    let totalToday = 0;
    let totalMonth = 0;

    orders.forEach((orderItem) => {
      const created = new Date(orderItem.created_at);
      if (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth()
      ) {
        totalMonth += orderItem.total;
        if (created.getDate() === now.getDate()) {
          totalToday += orderItem.total;
        }
      }
    });

    return { totalToday, totalMonth };
  }, [orders]);

  const historyRows = orders.flatMap((orderItem) =>
    orderItem.items.map((item) => ({
      id: `${orderItem.id}-${item.id}`,
      created_at: orderItem.created_at,
      product: item.product_name,
      quantity: item.quantity,
      total: item.total,
      customer_name: orderItem.customer_name,
      invoice_image: orderItem.invoice_image
    }))
  );

  const dashboardTotals = useMemo(() => {
    const totals = customerProfit.reduce(
      (acc, row) => {
        acc.revenue += Number(row.revenue || 0);
        acc.cost += Number(row.cost || 0);
        acc.profit += Number(row.profit || 0);
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0 }
    );

    return {
      ...totals,
      customerCount: customers.length
    };
  }, [customerProfit, customers.length]);

  const displayMoney = (value) =>
    showFinancial ? currency.format(value || 0) : "****";

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-slate-200/70 bg-white/70 backdrop-blur p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Quản lý nội bộ
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Đơn hàng nhanh cho cửa hàng nhỏ
          </p>

          <div className="mt-6 rounded-2xl bg-white p-4 shadow-soft">
            {!auth.loggedIn ? (
              <form className="space-y-3" onSubmit={handleLogin}>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Tài khoản
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={auth.username}
                    onChange={(event) =>
                      setAuth((prev) => ({
                        ...prev,
                        username: event.target.value
                      }))
                    }
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={auth.password}
                    onChange={(event) =>
                      setAuth((prev) => ({
                        ...prev,
                        password: event.target.value
                      }))
                    }
                    placeholder="123456"
                  />
                </div>
                {auth.error ? (
                  <p className="text-sm text-rose-500">{auth.error}</p>
                ) : null}
                <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white">
                  Đăng nhập
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Xin chào, admin</p>
                <button
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

          <nav className="mt-8 space-y-2">
            {MENU.map((item) => (
              <button
                key={item.key}
                className={`w-full rounded-xl px-4 py-2 text-left text-base font-medium transition ${
                  active === item.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setActive(item.key)}
                disabled={!auth.loggedIn}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {!auth.loggedIn ? (
            <div className="rounded-2xl bg-white/80 p-8 text-lg text-slate-600 shadow-soft">
              Vui lòng đăng nhập để bắt đầu quản lý.
            </div>
          ) : (
            <div className="space-y-8">
              {loading ? (
                <div className="rounded-2xl bg-white/80 p-6 shadow-soft">
                  Đang tải dữ liệu...
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-rose-700">
                  {error}
                </div>
              ) : null}

              {active === "dashboard" ? (
                <section className="space-y-6">
                  <div className="rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-600 p-8 text-white shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-5xl font-bold tracking-tight">{getGreeting(now.getHours())}</h2>
                        <p className="mt-3 text-xl text-indigo-100">
                          Lúc {now.toLocaleTimeString("vi-VN")}, {now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                      <button
                        className="rounded-full border border-white/40 px-5 py-2 text-base font-semibold text-white hover:bg-white/10"
                        onClick={() => setShowFinancial((prev) => !prev)}
                      >
                        {showFinancial ? "Ẩn thông tin tài chính" : "Hiện thông tin tài chính"}
                      </button>
                    </div>
                    <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5 text-2xl italic text-indigo-50">
                      “Mỗi ngày là một cơ hội mới để phát triển cửa hàng của bạn.”
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <p className="text-lg font-semibold text-slate-600">Tổng doanh thu</p>
                      <p className="mt-3 text-4xl font-bold">{displayMoney(dashboardTotals.revenue)}</p>
                      <p className="mt-2 text-base text-slate-500">Doanh thu toàn bộ đơn hàng</p>
                    </div>
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <p className="text-lg font-semibold text-slate-600">Tổng vốn</p>
                      <p className="mt-3 text-4xl font-bold">{displayMoney(dashboardTotals.cost)}</p>
                      <p className="mt-2 text-base text-slate-500">Chi phí giá nhập đã bán</p>
                    </div>
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <p className="text-lg font-semibold text-slate-600">Thu nhập</p>
                      <p className="mt-3 text-4xl font-bold">{displayMoney(dashboardTotals.profit)}</p>
                      <p className="mt-2 text-base text-slate-500">Lợi nhuận ròng</p>
                    </div>
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <p className="text-lg font-semibold text-slate-600">Tổng khách hàng</p>
                      <p className="mt-3 text-4xl font-bold">{dashboardTotals.customerCount}</p>
                      <p className="mt-2 text-base text-slate-500">Khách hàng đang lưu</p>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                    <h2 className="text-xl font-semibold">Lợi nhuận từng khách hàng</h2>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="pb-3">Khách hàng</th>
                            <th className="pb-3">Số đơn</th>
                            <th className="pb-3">Doanh thu</th>
                            <th className="pb-3">Lợi nhuận</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerProfit.length === 0 ? (
                            <tr>
                              <td className="py-3 text-slate-400" colSpan={4}>
                                Chưa có dữ liệu đơn hàng.
                              </td>
                            </tr>
                          ) : (
                            customerProfit.map((row) => (
                              <tr key={row.customer_name} className="border-t border-slate-100">
                                <td className="py-3 font-medium">{row.customer_name}</td>
                                <td className="py-3">{row.order_count}</td>
                                <td className="py-3">{displayMoney(row.revenue || 0)}</td>
                                <td className="py-3">{displayMoney(row.profit || 0)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <h3 className="text-lg font-semibold text-slate-700">Doanh thu hôm nay</h3>
                      <p className="mt-4 text-3xl font-bold">{displayMoney(revenue.totalToday)}</p>
                    </div>
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <h3 className="text-lg font-semibold text-slate-700">Doanh thu tháng này</h3>
                      <p className="mt-4 text-3xl font-bold">{displayMoney(revenue.totalMonth)}</p>
                    </div>
                  </div>
                </section>
              ) : null}

                {active === "customers" ? (
                  <section className="space-y-6">
                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <h2 className="text-xl font-semibold">Thêm khách hàng</h2>
                      <form className="mt-4 flex gap-3" onSubmit={handleCreateCustomer}>
                        <input
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-3"
                          placeholder="Tên khách hàng"
                          value={newCustomerName}
                          onChange={(event) => setNewCustomerName(event.target.value)}
                        />
                        <button className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                          Thêm
                        </button>
                      </form>
                    </div>

                    <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                      <h3 className="text-lg font-semibold">Danh sách khách hàng</h3>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="pb-3">Tên khách hàng</th>
                              <th className="pb-3">Ngày tạo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers.map((customer) => (
                              <tr key={customer.id} className="border-t border-slate-100">
                                <td className="py-3 font-medium">{customer.name}</td>
                                <td className="py-3">
                                  {new Date(customer.created_at).toLocaleString("vi-VN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                ) : null}

              {active === "products" ? (
                <section className="space-y-6">
                  <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                    <h2 className="text-xl font-semibold">Quản lý sản phẩm</h2>
                    <form
                      className="mt-4 grid gap-4 md:grid-cols-2"
                      onSubmit={handleProductSubmit}
                    >
                      <input
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        placeholder="Tên sản phẩm"
                        value={form.name}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            name: event.target.value
                          }))
                        }
                      />
                      <input
                        type="number"
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        placeholder="Giá nhập"
                        value={form.cost_price}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            cost_price: event.target.value
                          }))
                        }
                      />
                      <input
                        type="number"
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        placeholder="Giá bán"
                        value={form.sale_price}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            sale_price: event.target.value
                          }))
                        }
                      />
                      <input
                        type="number"
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        placeholder="Tồn kho"
                        value={form.stock}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            stock: event.target.value
                          }))
                        }
                      />
                      <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
                        {form.id ? "Cập nhật" : "Thêm sản phẩm"}
                      </button>
                      {form.id ? (
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 px-4 py-3"
                          onClick={() =>
                            setForm({
                              id: null,
                              name: "",
                              cost_price: "",
                              sale_price: "",
                              stock: ""
                            })
                          }
                        >
                          Hủy
                        </button>
                      ) : null}
                    </form>
                  </div>

                  <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                    <h3 className="text-lg font-semibold">Danh sách sản phẩm</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="pb-3">Tên</th>
                            <th className="pb-3">Giá nhập</th>
                            <th className="pb-3">Giá bán</th>
                            <th className="pb-3">Tồn kho</th>
                            <th className="pb-3">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => (
                            <tr
                              key={product.id}
                              className="border-t border-slate-100"
                            >
                              <td className="py-3 font-medium">
                                {product.name}
                              </td>
                              <td className="py-3">
                                {currency.format(product.cost_price)}
                              </td>
                              <td className="py-3">
                                {currency.format(product.sale_price)}
                              </td>
                              <td className="py-3">{product.stock}</td>
                              <td className="py-3 space-x-2">
                                <button
                                  className="rounded-lg border border-slate-200 px-3 py-1"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  Sửa
                                </button>
                                <button
                                  className="rounded-lg border border-rose-200 px-3 py-1 text-rose-600"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ) : null}

              {active === "sales" ? (
                <section className="space-y-6">
                  <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                    <h2 className="text-xl font-semibold">Tạo đơn hàng nhanh</h2>
                    <form
                      className="mt-4 grid gap-4 md:grid-cols-2"
                      onSubmit={handleOrderSubmit}
                    >
                      <select
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        value={order.product_id}
                        onChange={(event) =>
                          setOrder((prev) => ({
                            ...prev,
                            product_id: event.target.value
                          }))
                        }
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        value={order.quantity}
                        onChange={(event) =>
                          setOrder((prev) => ({
                            ...prev,
                            quantity: event.target.value
                          }))
                        }
                        min={1}
                      />
                      <select
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        value={order.customer_id}
                        onChange={(event) =>
                          setOrder((prev) => ({
                            ...prev,
                            customer_id: event.target.value
                          }))
                        }
                      >
                        <option value="">Khách lẻ (tùy chọn)</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-xl border border-slate-200 px-4 py-3"
                        placeholder="Tên khách lẻ (tùy chọn)"
                        value={order.customer_name}
                        disabled={Boolean(order.customer_id)}
                        onChange={(event) =>
                          setOrder((prev) => ({
                            ...prev,
                            customer_name: event.target.value
                          }))
                        }
                      />
                      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3">
                        <label className="text-sm font-medium text-slate-600">
                          Ảnh hóa đơn (tùy chọn)
                        </label>
                        <input
                          key={fileKey}
                          type="file"
                          className="mt-2 w-full text-sm"
                          accept="image/*"
                          onChange={(event) =>
                            setOrder((prev) => ({
                              ...prev,
                              invoiceFile: event.target.files?.[0] || null
                            }))
                          }
                        />
                        {order.invoiceFile ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Đã chọn: {order.invoiceFile.name}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-xl border border-slate-200 px-4 py-3 text-lg font-semibold">
                        {currency.format(orderTotal)}
                      </div>
                      <button className="rounded-xl bg-emerald-600 px-4 py-3 text-white">
                        Thanh toán
                      </button>
                    </form>
                  </div>
                </section>
              ) : null}

              {active === "history" ? (
                <section className="space-y-6">
                  <div className="rounded-3xl bg-white/80 p-6 shadow-soft">
                    <h2 className="text-xl font-semibold">Lịch sử đơn hàng</h2>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="pb-3">Ngày</th>
                            <th className="pb-3">Sản phẩm</th>
                            <th className="pb-3">Số lượng</th>
                            <th className="pb-3">Tổng tiền</th>
                            <th className="pb-3">Khách hàng</th>
                            <th className="pb-3">Hóa đơn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-slate-100"
                            >
                              <td className="py-3">
                                {new Date(row.created_at).toLocaleString("vi-VN")}
                              </td>
                              <td className="py-3 font-medium">{row.product}</td>
                              <td className="py-3">{row.quantity}</td>
                              <td className="py-3">
                                {currency.format(row.total)}
                              </td>
                              <td className="py-3">
                                {row.customer_name || "-"}
                              </td>
                              <td className="py-3">
                                {row.invoice_image ? (
                                  <a
                                    className="text-emerald-600 underline"
                                    href={`${API_URL}${row.invoice_image}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Xem ảnh
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
