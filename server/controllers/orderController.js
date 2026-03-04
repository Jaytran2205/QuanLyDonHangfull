import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

export async function createOrder(req, res) {
  const customerId = String(req.body.customerId || "").trim();
  let itemsRaw = Array.isArray(req.body.items) ? req.body.items : [];
  
  // If items is a JSON string from FormData, parse it
  if (typeof req.body.items === "string" && req.body.items) {
    try {
      itemsRaw = JSON.parse(req.body.items);
    } catch (err) {
      res.status(400).json({ error: "Định dạng sản phẩm không hợp lệ" });
      return;
    }
  }
  
  const savePrices = req.body.savePrices === "true" || req.body.savePrices === true;
  const exportDate = req.body.exportDate ? new Date(req.body.exportDate) : new Date();

  if (!customerId) {
    res.status(400).json({ error: "Vui lòng chọn khách hàng" });
    return;
  }

  if (itemsRaw.length === 0) {
    res.status(400).json({ error: "Vui lòng thêm ít nhất 1 sản phẩm" });
    return;
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    res.status(404).json({ error: "Khách hàng không tồn tại" });
    return;
  }

  // Initialize productPrices if doesn't exist
  if (!customer.productPrices) {
    customer.productPrices = new Map();
  }

  // Build items array and calculate total
  const items = [];
  let grandTotal = 0;

  for (const itemData of itemsRaw) {
    const productId = String(itemData.productId || "").trim();
    const quantity = Number(itemData.quantity);
    const inputPrice = itemData.price !== undefined ? Number(itemData.price) : undefined;

    if (!productId) {
      res.status(400).json({ error: "Một trong các sản phẩm không hợp lệ" });
      return;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      res.status(400).json({ error: "Số lượng sản phẩm không hợp lệ" });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(400).json({ error: `Sản phẩm ${productId} không tồn tại` });
      return;
    }

    // Get price from customer's productPrices or from input
    let finalPrice;
    const existingPrice = customer.productPrices.get(productId);

    if (existingPrice !== undefined) {
      // Use existing price if available
      finalPrice = existingPrice;
      // Override with input if provided
      if (inputPrice !== undefined && !Number.isNaN(inputPrice) && inputPrice > 0) {
        finalPrice = inputPrice;
      }
    } else {
      // No existing price - require input
      if (inputPrice === undefined || Number.isNaN(inputPrice) || inputPrice <= 0) {
        res.status(400).json({ 
          error: `Sản phẩm "${product.name}" chưa có giá. Vui lòng nhập giá cho sản phẩm này.` 
        });
        return;
      }
      finalPrice = inputPrice;
    }

    // Update customer's productPrices if savePrices is true
    if (savePrices) {
      customer.productPrices.set(productId, finalPrice);
    }

    const itemTotal = finalPrice * quantity;

    items.push({
      product: product._id,
      productName: product.name,
      price: finalPrice,
      quantity,
      total: itemTotal
    });

    grandTotal += itemTotal;
  }

  // Save updated customer productPrices
  await customer.save();

  const invoiceImage = req.file ? `/uploads/${req.file.filename}` : null;

  const order = await Order.create({
    customer: customer._id,
    items,
    grandTotal,
    invoiceImage,
    exportDate
  });

  const populated = await Order.findById(order._id)
    .populate("customer", "name phone")
    .populate("items.product", "name");

  res.status(201).json(populated);
}

export async function listOrders(_req, res) {
  const orders = await Order.find()
    .populate("customer", "name phone")
    .populate("items.product", "name")
    .sort({ exportDate: -1, createdAt: -1 });

  res.json(orders);
}

export async function getDashboard(_req, res) {
  const [totalCustomers, totalOrders, revenueAgg, ordersData, customerRevenue] = await Promise.all([
    Customer.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" }
        }
      }
    ]),
    Order.find()
      .populate("customer", "name phone")
      .populate("items.product", "name")
      .sort({ exportDate: -1, createdAt: -1 }),
    // Revenue by customer for pie chart
    Order.aggregate([
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerData"
        }
      },
      { $unwind: "$customerData" },
      {
        $group: {
          _id: "$customerData.name",
          revenue: { $sum: "$grandTotal" }
        }
      },
      { $sort: { revenue: -1 } }
    ])
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  // Calculate orders by date for bar chart
  const ordersByDate = {};
  ordersData.forEach(order => {
    const dateKey = new Date(order.exportDate).toLocaleDateString("vi-VN");
    ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
  });

  res.json({
    totalCustomers,
    totalOrders,
    totalRevenue,
    orders: ordersData,
    customerRevenue,
    ordersByDate
  });
}

export async function deleteOrder(req, res) {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: "ID đơn hàng không hợp lệ" });
    return;
  }

  const order = await Order.findByIdAndDelete(id);

  if (!order) {
    res.status(404).json({ error: "Đơn hàng không tồn tại" });
    return;
  }

  res.json({ message: "Xóa đơn hàng thành công" });
}
