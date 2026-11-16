# Ứng Dụng Web Node.js / React / HTML (Port 4000)

Ứng dụng web đơn giản kết hợp giữa **Node.js (Backend REST API)** và **React 18 + HTML5 + Tailwind CSS (Frontend SPA)** chạy trên cổng `4000`.

## 🚀 Cách khởi chạy

Từ thư mục hiện tại:
```bash
# Sử dụng runtime Node.js có sẵn trong workspace
export PATH="$PWD/.node/bin:$PATH"
cd simple-react-app
node server.js
```

Hoặc chạy nhanh từ thư mục gốc:
```bash
export PATH="$PWD/.node/bin:$PATH"
node simple-react-app/server.js
```

Truy cập trình duyệt tại:
👉 **[http://localhost:4000](http://localhost:4000)**

---

## 🌟 Tính năng nổi bật

1. **Giao diện hiện đại React 18 & Tailwind CSS:**
   - Hỗ trợ chế độ Sáng / Tối (Light / Dark Mode).
   - Thiết kế giao diện phản hồi nhanh (Responsive), tương thích máy tính và di động.
   - Hiển thị trạng thái kết nối trực tiếp với server (Live status indicator).

2. **Các phân hệ tương tác:**
   - **📊 Tổng quan & Thống kê:** Hiển thị thời gian chạy (Uptime), phiên bản Node.js, trạng thái bộ nhớ Heap / RSS và widget đếm tương tác React Hook.
   - **✅ Quản lý Công việc (Todo):** Thêm, đánh dấu hoàn thành, xóa và lọc trạng thái — đồng bộ tức thì với REST API và lưu vào file `data.json`.
   - **📝 Ghi chú nhanh (Notes):** Tạo ghi chú với mã màu tùy chọn.
   - **⚡ Trình kiểm thử API (API Explorer):** Gửi request trực tiếp đến các endpoint của Node.js và xem kết quả JSON kèm thời gian phản hồi (latency).

3. **REST API Endpoints:**
   - `GET /api/status`: Thông tin tình trạng máy chủ và cấu hình hệ thống.
   - `GET /api/todos`: Danh sách công việc.
   - `POST /api/todos`: Tạo công việc mới.
   - `PATCH /api/todos/:id`: Cập nhật trạng thái công việc.
   - `DELETE /api/todos/:id`: Xóa công việc.
   - `GET /api/notes`: Danh sách ghi chú.
   - `POST /api/notes`: Tạo ghi chú mới.
   - `DELETE /api/notes/:id`: Xóa ghi chú.
