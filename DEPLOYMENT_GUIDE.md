# Hướng Dẫn Deploy Interactive Story AI (Miễn Phí 100%)

Tài liệu này sẽ hướng dẫn bạn cách đưa hệ thống Interactive Story AI của bạn lên mạng Internet hoàn toàn miễn phí, không cần mua tên miền, không cần thuê VPS.

Hệ thống của chúng ta được chia làm 4 thành phần dịch vụ đám mây (Cloud Services) riêng biệt:

---

## BƯỚC 1: Chuẩn bị Cơ sở dữ liệu đám mây (Database)

Vì không dùng máy tính cá nhân nữa, bạn cần tạo server lưu trữ trên mạng.

### 1. MongoDB Atlas (Lưu trữ Truyện)
1. Truy cập [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) và tạo tài khoản.
2. Tạo một Cluster mới, nhớ chọn gói **FREE (M0)**.
3. Thiết lập **Database Access**: Tạo 1 user (ví dụ: `admin`) và lưu lại mật khẩu.
4. Thiết lập **Network Access**: Chọn `Allow Access from Anywhere` (0.0.0.0/0).
5. Bấm **Connect** -> Chọn **Drivers** -> Copy cái chuỗi kết nối (nó sẽ có dạng `mongodb+srv://admin:<password>@cluster0...`).

### 2. Qdrant Cloud (Lưu trữ Vector AI)
1. Truy cập [Qdrant Cloud](https://cloud.qdrant.io/) và tạo tài khoản.
2. Tạo một Cluster miễn phí (Free Tier).
3. Lấy **Cluster URL** và tạo một **API Key**. Lưu 2 thông tin này lại.

---

## BƯỚC 2: Triển khai Backend AI (Render.com)

Backend chạy Python FastAPI sẽ được đưa lên Render.

1. Đăng nhập [Render.com](https://render.com) bằng tài khoản GitHub.
2. Bấm nút **New** trên góc phải -> Chọn **Blueprint**.
3. Chọn kho chứa code (Repository) `llm-storygen` của bạn.
4. Render sẽ tự động đọc file `render.yaml` có sẵn trong code.
5. Nó sẽ yêu cầu bạn điền các **Biến Môi Trường (Environment Variables)**. Hãy điền các thông tin bạn vừa lấy ở Bước 1 vào:
   - `MONGODB_URL`: Điền chuỗi kết nối MongoDB Atlas (Nhớ thay `<password>` bằng pass thật).
   - `QDRANT_URL`: Điền URL của Qdrant Cloud.
   - `QDRANT_API_KEY`: Điền API Key của Qdrant Cloud.
   - `OPENAI_API_KEY`, `GEMINI_API_KEY`...: Cóp y chang từ file `.env` trên máy tính.
   - `ADMIN_PASSWORD`: Nhập pass để vào trang Admin Dashboard (VD: `secret_admin_123`).
6. Bấm **Apply/Save** và chờ khoảng 5 phút.
7. Khi Render báo trạng thái xanh lá (Live), bạn copy cái **URL của Backend** (VD: `https://interactive-story-backend.onrender.com`).

---

## BƯỚC 3: Triển khai Frontend Giao Diện (Vercel)

Frontend Next.js sẽ được đưa lên Vercel để nhận tên miền xịn.

1. Truy cập [Vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
2. Bấm **Add New** -> Chọn **Project**.
3. Import kho code `llm-storygen` của bạn.
4. Ở bước cấu hình (Configure Project) trước khi bấm Deploy, bạn phải làm 2 việc:
   - Mục **Root Directory**: Bấm Edit và chọn thư mục `frontend` (Bắt buộc!).
   - Mục **Environment Variables**: Thêm 1 biến tên là `NEXT_PUBLIC_API_URL`. Phần Value (Giá trị) bạn dán cái **URL của Backend** (đã lấy ở Bước 2) vào.
5. Bấm **Deploy** và chờ 2 phút.
6. Xong! Vercel sẽ cấp cho bạn một đường link tên miền để chơi game lập tức (VD: `https://interactive-story-ai.vercel.app`).

---

## BƯỚC 4: Kết nối ngược Frontend vào Backend

Vì lúc bạn tạo Backend trên Render (Bước 2), bạn chưa có link của Frontend. Nên bây giờ bạn cần báo cho Backend biết link Frontend để nó cho phép kết nối (CORS).

1. Quay lại trang quản lý Backend trên **Render.com**.
2. Bấm vào tab **Environment**.
3. Sửa cái giá trị của biến `FRONTEND_URL` thành đường link Vercel bạn vừa nhận được ở Bước 3 (VD: `https://interactive-story-ai.vercel.app`).
4. Save lại, Render sẽ tự khởi động lại Backend.

> [!TIP]
> Hệ thống hoàn tất! Bạn có thể gửi đường link Vercel cho bạn bè chơi, và truy cập `/admin` (ví dụ `https://interactive-story-ai.vercel.app/admin`) để soi xem có bao nhiêu người đang chơi game của bạn!
