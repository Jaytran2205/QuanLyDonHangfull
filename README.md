# Quản lý nội bộ đơn giản

Ứng dụng quản lý khách hàng, sản phẩm và đơn xuất hàng với giao diện HTML + TailwindCSS.

## Công nghệ
- Frontend: HTML + TailwindCSS
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- Upload ảnh: Multer (`/server/uploads`)

## Chức năng chính
- **Quản lý khách hàng**: Tên, số điện thoại
- **Quản lý sản phẩm**: CRUD sản phẩm (tên, mô tả)
- **Quản lý đơn xuất hàng**: Hỗ trợ nhiều sản phẩm trong 1 đơn với giá tùy khách:
  - Mỗi đơn có thể chứa 1 hoặc nhiều sản phẩm (line items)
  - Mỗi sản phẩm có giá riêng theo khách hàng
  - Ghi nhớ giá tối mới cho từng (khách hàng, sản phẩm)
  - Checkbox "Lưu giá mặc định" để cập nhật giá cho lần kế tiếp
- **Dashboard**: Tổng khách hàng, tổng đơn, tổng doanh thu, lịch sử đơn

## Cấu trúc
- `server/models/Customer.js` - schema: `name`, `phone`, `productPrices` (Map)
- `server/models/Product.js` - schema: `name`, `description`
- `server/models/Order.js` - schema: `customer` (ref), `items` (array), `grandTotal`, `invoiceImage`, `exportDate`
- `server/controllers/` - handlers cho customer, product, order
- `server/routes/` - routes cho /api/customers, /api/products, /api/orders
- `server/uploads/` - lưu trữ ảnh hóa đơn
- `client/index.html` - dashboard
- `client/customers.html` - CRUD khách hàng
- `client/products.html` - CRUD sản phẩm
- `client/orders.html` - tạo đơn xuất hàng (nhiều items)
- `client/assets/` - JS/CSS chung

## Cách chạy
1. Cài dependencies:
	- `npm install`
	- `npm install --prefix server`
2. Đảm bảo MongoDB đang chạy (local hoặc set `MONGODB_URI`).
3. Chạy ứng dụng:
	- `npm run dev`
4. Mở trang:
	- `http://localhost:3001`

## Chạy dạng app desktop (Windows)
1. Cài dependencies ở thư mục gốc:
  - `npm install`
2. Chạy desktop mode để test:
  - `npm run desktop:dev`
3. Build file cài `.exe`:
  - `npm run desktop:build`
4. File cài sau khi build nằm trong thư mục:
  - `dist-desktop/`

Ghi chú:
- Bản desktop vẫn dùng MongoDB local mặc định: `mongodb://127.0.0.1:27017/order_internal_db`.
- Ảnh hóa đơn sẽ được lưu trong thư mục dữ liệu người dùng của app (tránh lỗi quyền ghi trong `Program Files`).

## Cài lên máy khách (production)
Máy khách chỉ cần:
- Cài bộ cài desktop (`QuanLyDonHang Setup *.exe`)
- Cài MongoDB Community Server và bật service chạy tự động

Không bắt buộc cài Node.js/npm trên máy khách.

### Cài nhanh 1-click cho khách
Bạn có thể gửi khách 1 thư mục gồm:
- `deploy/CaiNhanh.bat`
- `deploy/CaiNhanh.ps1`
- `QuanLyDonHang Setup *.exe`
- file cài MongoDB `.msi`

Khách chỉ cần chuột phải `CaiNhanh.bat` và chọn **Run as administrator**.

Nếu gặp lỗi "Không thể kết nối backend", kiểm tra theo thứ tự:
1. MongoDB service có đang chạy không
2. Có đang dùng bản cài mới nhất không
3. Antivirus/Firewall có chặn app hoặc `node.exe` không

Xem hướng dẫn đầy đủ tại:
- `docs/deploy-windows.md`

## Backup/Restore dữ liệu (không mất dữ liệu khi đổi máy)
Backup nhanh:
- `powershell -ExecutionPolicy Bypass -File .\server\scripts\backup.ps1 -Zip`

Restore:
- `powershell -ExecutionPolicy Bypass -File .\server\scripts\restore.ps1 -BackupFolder "C:\duong-dan\backup\20260301-120000" -Drop`

## API chính
- **Customers**:
  - `GET /api/customers`
  - `POST /api/customers`
  - `PUT /api/customers/:id`
  - `DELETE /api/customers/:id`
- **Products**:
  - `GET /api/products`
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- **Orders** (hỗ trợ nhiều items):
  - `GET /api/orders`
  - `POST /api/orders` (multipart/form-data)
    - Body fields: `customerId`, `items` (JSON), `savePrices`, `exportDate`, `invoice` (file)
  - `GET /api/orders/dashboard/summary`

## Quy trình tạo đơn
1. Chọn khách hàng
2. Nhấn "Thêm sản phẩm" → chọn sản phẩm
3. Nhập số lượng, giá (tự điền nếu đã từng mua)
4. Có thể thêm nhiều sản phẩm
5. Tích "Lưu giá mặc định" → giá sẽ nhớ cho lần tới
6. Tải ảnh hóa đơn → lưu đơn
