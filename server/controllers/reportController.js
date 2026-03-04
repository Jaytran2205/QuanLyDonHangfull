import ExcelJS from "exceljs";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";

function formatDateForFile(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Build all statistics needed for report export.
async function buildReportStats() {
  const [totalOrders, totalCustomers, revenueAgg, customerStats, productStats] = await Promise.all([
    Order.countDocuments(),
    Customer.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" }
        }
      }
    ]),
    Order.aggregate([
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerData"
        }
      },
      {
        $unwind: {
          path: "$customerData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            customerId: "$customer",
            customerName: {
              $ifNull: ["$customerData.name", "Khách lẻ"]
            }
          },
          orderIds: { $addToSet: "$_id" },
          totalQuantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
          totalRevenue: { $sum: { $ifNull: ["$items.total", 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          customerName: "$_id.customerName",
          totalOrders: { $size: "$orderIds" },
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: {
          totalRevenue: -1,
          customerName: 1
        }
      }
    ]),
    Order.aggregate([
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            productId: "$items.product",
            productName: { $ifNull: ["$items.productName", "Không rõ sản phẩm"] }
          },
          totalQuantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
          totalRevenue: { $sum: { $ifNull: ["$items.total", 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          productName: "$_id.productName",
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: {
          totalQuantity: -1,
          totalRevenue: -1,
          productName: 1
        }
      }
    ])
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  const topCustomerByQuantity = [...customerStats].sort((a, b) => b.totalQuantity - a.totalQuantity)[0] || null;
  const topCustomerByRevenue = customerStats[0] || null;
  const topProductByQuantity = productStats[0] || null;
  const topProductByRevenue = [...productStats].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || null;

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    customerStats,
    productStats,
    topCustomerByQuantity,
    topCustomerByRevenue,
    topProductByQuantity,
    topProductByRevenue
  };
}

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" }
  };
}

export async function exportReport(_req, res) {
  const stats = await buildReportStats();
  const reportDate = new Date();
  const fileDate = formatDateForFile(reportDate);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Order Internal System";
  workbook.created = reportDate;

  // Sheet 1: Overview
  const overview = workbook.addWorksheet("Tổng quan");
  overview.columns = [
    { header: "Chỉ số", key: "label", width: 40 },
    { header: "Giá trị", key: "value", width: 50 }
  ];
  styleHeaderRow(overview.getRow(1));

  overview.addRows([
    { label: "Tổng doanh thu", value: stats.totalRevenue },
    { label: "Tổng số đơn", value: stats.totalOrders },
    { label: "Tổng số khách", value: stats.totalCustomers },
    { label: "Ngày xuất báo cáo", value: reportDate.toLocaleString("vi-VN") },
    {
      label: "Khách hàng mua nhiều nhất (SL)",
      value: stats.topCustomerByQuantity ? `${stats.topCustomerByQuantity.customerName} (${stats.topCustomerByQuantity.totalQuantity})` : "-"
    },
    {
      label: "Khách hàng doanh thu cao nhất",
      value: stats.topCustomerByRevenue ? `${stats.topCustomerByRevenue.customerName} (${stats.topCustomerByRevenue.totalRevenue})` : "-"
    },
    {
      label: "Sản phẩm bán nhiều nhất (SL)",
      value: stats.topProductByQuantity ? `${stats.topProductByQuantity.productName} (${stats.topProductByQuantity.totalQuantity})` : "-"
    },
    {
      label: "Sản phẩm doanh thu cao nhất",
      value: stats.topProductByRevenue ? `${stats.topProductByRevenue.productName} (${stats.topProductByRevenue.totalRevenue})` : "-"
    }
  ]);

  overview.getColumn(2).numFmt = "#,##0";

  // Sheet 2: Customer statistics (sorted by revenue DESC)
  const customerSheet = workbook.addWorksheet("Thống kê khách hàng");
  customerSheet.columns = [
    { header: "Tên khách", key: "customerName", width: 30 },
    { header: "Tổng số đơn", key: "totalOrders", width: 15 },
    { header: "Tổng số lượng", key: "totalQuantity", width: 18 },
    { header: "Tổng doanh thu", key: "totalRevenue", width: 20 }
  ];
  styleHeaderRow(customerSheet.getRow(1));

  stats.customerStats.forEach((item) => {
    customerSheet.addRow(item);
  });
  customerSheet.getColumn(4).numFmt = "#,##0";

  // Sheet 3: Product statistics (sorted by quantity DESC)
  const productSheet = workbook.addWorksheet("Thống kê sản phẩm");
  productSheet.columns = [
    { header: "Tên sản phẩm", key: "productName", width: 35 },
    { header: "Tổng số lượng bán", key: "totalQuantity", width: 20 },
    { header: "Tổng doanh thu", key: "totalRevenue", width: 20 }
  ];
  styleHeaderRow(productSheet.getRow(1));

  stats.productStats.forEach((item) => {
    productSheet.addRow(item);
  });
  productSheet.getColumn(3).numFmt = "#,##0";

  const fileName = `report_${fileDate}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  await workbook.xlsx.write(res);
  res.end();
}
