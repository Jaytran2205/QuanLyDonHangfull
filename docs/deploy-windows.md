# Triển khai ứng dụng sang máy Windows khác (an toàn dữ liệu)

## 1) Máy khách cần cài gì

Bắt buộc:
- Bộ cài app của bạn: `QuanLyDonHang Setup *.exe`
- MongoDB Community Server (chạy như Windows Service)

Khuyến nghị rất mạnh:
- MongoDB Database Tools (để backup/restore bằng `mongodump`, `mongorestore`)

Không cần cài:
- Node.js
- npm

## 0) Cách nhanh nhất (1-click cho khách)

Chuẩn bị một thư mục gửi khách gồm:
- `CaiNhanh.bat`
- `CaiNhanh.ps1`
- `QuanLyDonHang Setup *.exe`
- Bộ cài MongoDB dạng `.msi`

Khách chỉ cần:
1. Chuột phải `CaiNhanh.bat` → Run as administrator
2. Chờ script tự cài MongoDB, cài app và mở ứng dụng

Hai file script có sẵn tại:
- `deploy/CaiNhanh.bat`
- `deploy/CaiNhanh.ps1`

## 2) Tránh lỗi backend khi cài máy mới

App desktop tự khởi động backend và tự thử nhiều cổng nội bộ (`3001` → `3004`) nếu cổng bận.
Lỗi popup "Không thể kết nối backend" thường do:
- MongoDB service chưa chạy
- Firewall/antivirus chặn `node.exe`
- Cài bản build cũ

Checklist trước khi bàn giao:
1. Cài MongoDB và xác nhận service đang `Running`
2. Cài app bằng bộ cài mới nhất
3. Mở app 2 lần liên tiếp để kiểm tra cơ chế tự phục hồi
4. Nếu antivirus hỏi quyền, chọn `Allow`

## 3) Dữ liệu nằm ở đâu

- CSDL: MongoDB database `order_internal_db`
- Ảnh hóa đơn desktop: `%APPDATA%\QuanLyDonHang\uploads`

Gỡ cài đặt app desktop **không tự xóa** CSDL MongoDB.

## 4) Backup trước khi nâng cấp/chuyển máy

Mở PowerShell và chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\scripts\backup.ps1 -Zip
```

Kết quả sẽ in ra đường dẫn backup trong:
- `%PUBLIC%\QuanLyDonHangBackups\<timestamp>`
- hoặc file `.zip` nếu dùng `-Zip`

## 5) Restore khi chuyển sang máy mới

1. Cài MongoDB + app desktop trên máy mới
2. Chép thư mục backup sang máy mới
3. Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\scripts\restore.ps1 -BackupFolder "C:\duong-dan\backup\20260301-120000" -Drop
```

Tham số `-Drop` sẽ xóa dữ liệu cũ trong DB đích trước khi nạp lại.

## 6) Quy trình nâng cấp an toàn (khuyến nghị)

1. Backup (`backup.ps1`)
2. Đóng app desktop
3. Cài bản mới đè lên bản cũ
4. Mở app và kiểm tra dashboard + đơn hàng mới nhất
5. Nếu lỗi, restore ngay từ bản backup gần nhất
