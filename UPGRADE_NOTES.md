# Nexus Tale — nâng cấp tiếp nối

## Nguyên tắc đã chốt

Phát triển mạnh từ ngôn ngữ UI gốc (cyberpunk tím/cyan, hình ảnh thế giới, HUD nhập vai), không đóng băng bố cục cũ. Được thiết kế lại cấu trúc màn hình, thứ bậc nội dung, chuyển động và tương tác khi làm trải nghiệm tốt hơn. “Giữ cái hồn” không có nghĩa “giữ nguyên giao diện”.

Ở cụm lựa chọn, bình thường chỉ hiện tiêu đề đậm. Hover một nút làm cả ba cùng mở mô tả; riêng nút được hover nổi lên. Ra khỏi cụm thì thu lại. Focus bằng bàn phím cũng mở mô tả.

## Phản biện và quyết định

| Ý tưởng | Người chơi khó tính | Game designer | Kỹ sư hệ thống | Quyết định |
| --- | --- | --- | --- | --- |
| Phát triển UI từ bản gốc | Phải thấy nâng cấp rõ, dễ đọc, dùng được trên điện thoại | Giữ nhận diện tím/cyan và không khí nhập vai, thay đổi bố cục khi cần | Ảnh local tối ưu, chuyển động theo tương tác, lazy-load graph, reduced motion | Triển khai ở home, dashboard, create và play |
| Nhật ký quyết định | Tra lại lựa chọn thực tế và kết quả xúc xắc | Giữ hậu quả có ý nghĩa | Lưu bản ghi nhỏ trong chương, tương thích dữ liệu cũ | Triển khai, kèm tìm kiếm và xuất Markdown |
| Thận trọng / cân bằng / táo bạo | Chủ động diễn đạt cách hành động | Định hướng kể chuyện, không hứa cộng chỉ số hay thắng | Enum được kiểm tra, không thêm lượt gọi mô hình | Triển khai |
| Checkpoint / đa vũ trụ | Hấp dẫn nhưng dễ xóa hậu quả | Cần khôi phục đồng bộ NPC, nhiệm vụ và kho đồ | Chưa có snapshot đầy đủ và cách ly bộ nhớ theo nhánh | Hoãn |
| Combat chiến thuật / companion tự chủ | Cần luật có thể dự đoán | Dễ xung đột cơ chế AI đang phán xử | Cần state machine riêng và kiểm thử cân bằng | Hoãn |
| Sinh ảnh mỗi lượt | Đẹp nhưng tăng thời gian chờ | Chưa đảm bảo nhân vật nhất quán | Tăng chi phí, độ trễ và phụ thuộc nhà cung cấp | Hoãn |

## Thay đổi chính

- UI: tìm/lọc thư viện, tiếp tục đúng trang, HUD mobile, chế độ tập trung, cỡ chữ, tắt âm thanh, màn kết thúc vẫn đọc được truyện. Tái sử dụng hình ảnh gốc. Bổ sung năm âm nền tổng hợp cục bộ thay các đường dẫn thiếu file.
- Lượt chơi: xác thực chủ sở hữu, khóa thao tác có thời hạn trên MongoDB, kiểm tra chương cũ, kết thúc truyện, lựa chọn và đường di chuyển. D20 do máy chủ sinh; không tin kết quả gửi từ trình duyệt.
- Trạng thái: bổ sung trích xuất và áp dụng HP/energy, giới hạn chỉ số, ghi nhật ký quyết định. Sửa cập nhật store sau crafting, kiểm tra đủ nguyên liệu, tránh lưu chương rỗng khi Writer thất bại.
- SSE: không phát token nội bộ của mọi agent. Gửi trạng thái xử lý và bản nháp Writer đã phân tích; bản sửa thay thế bản cũ. Phát hiện EOF thiếu kết quả, hủy khi rời trang, tránh gửi lượt trùng.
- Hiệu năng: bỏ auth delay và polling đua với stream; tải graph theo nhu cầu; giới hạn thời gian bộ nhớ và chuyển Qdrant đồng bộ khỏi event loop. Không xóa collection khi cấu hình embedding sai kích thước.
- Cấu hình MongoDB Atlas của người dùng được giữ nguyên. Phiên bản thực tế trong package.json là Next.js 16.2.4 / React 19.2.4.

## Kiểm chứng

- Backend: 23 kiểm thử hồi quy bằng unittest, với database/mô hình giả lập; bao gồm quyền sở hữu, lease cạnh tranh/hết hạn, server dice, lượt cũ, di chuyển, HP và stream lỗi/sửa bản nháp.
- Frontend: 7 kiểm thử Node cho SSE UTF-8 phân mảnh, CRLF, EOF, lỗi, bản sửa và bất biến store.
- Production build, TypeScript và ESLint ở các component chính đã chạy thành công. Không khẳng định toàn bộ lint cũ của repo đã sạch.
- Playwright: desktop/mobile, đăng nhập và tiếp tục truyện bằng fixture, hover cả ba lựa chọn, D20 từ server fixture, nhật ký/tìm kiếm, EOF lỗi, HUD, cỡ chữ/âm thanh, bản đồ và trang chủ. Ảnh và script kiểm tra ở output/playwright/ (gitignored).

Chạy lại trong môi trường đã cài dependencies:

```powershell
# frontend/
npm test
npm run typecheck
npm run build

# backend/, dùng Python của môi trường backend đang hoạt động
python -m unittest discover -s tests
```

## Giới hạn cần biết

Chưa chạy một lượt sinh truyện trả phí với nhà cung cấp AI thật. Kiểm thử dùng fixture không thay thế kiểm thử Atlas/Qdrant/model end-to-end. SSE hiện hiển thị trạng thái và bản nháp hoàn chỉnh của Writer, chưa hiển thị từng token nội dung ở mọi provider. Ghi chương và cập nhật trạng thái ở nhiều MongoDB collection chưa nằm trong transaction; khóa ngăn thao tác cạnh tranh nhưng không bảo đảm tính nguyên tử khi tiến trình chết giữa các lần ghi. EPUB/PDF, rewind, combat chiến thuật và ảnh AI mỗi chương chưa được triển khai.


## UI evolution — 29/09/2026

- Trang chủ: hero hai cột với ảnh gốc rõ hơn, cảnh minh họa có ba nhánh có thể thử và reset, bộ chọn sáu thế giới chuyển cảnh với liên kết đúng thể loại, các khối giới thiệu RPG/nhật ký có thứ bậc. Cảnh minh họa được ghi nhãn, không giả vờ là kết quả AI trực tiếp.
- Thư viện: bìa thể loại mặc định hoặc bìa do người dùng đặt; hành trình đang chơi gần nhất; thống kê từ dữ liệu thật; bộ lọc/search/reset; trạng thái trống/lỗi/loading; tiếp tục, cài đặt và xóa vẫn hoạt động.
- Khởi tạo: sáu thẻ hình ảnh, dấu chọn, bản xem trước thế giới/nhân vật, tiến trình bốn bước và thanh hành động; giữ dữ liệu khi gửi lỗi. Query thể loại được đọc bằng useSearchParams/Suspense, không có render phụ do effect đặt state.
- Màn chơi: masthead và vị trí hiện tại, bộ icon thống nhất, HUD phân tầng, chương mở đầu bằng ảnh/tựa/ước lượng thời gian đọc, chữ truyện dễ đọc và vùng quyết định riêng. Desktop vẫn hover một nút bung mô tả cả ba; cảm ứng có nút xem/thu mô tả để đọc trước khi chọn.
- Motion: chuyển cảnh, phản hồi hover/press, thay nhánh minh họa; không thêm vòng lặp JS chạy theo từng frame. Reduced motion vẫn được hỗ trợ.
- Kiểm chứng: production build/TypeScript; ESLint sạch ở năm trang/component chính đã thay; Playwright home/demo/world link, login fixture, library search, resume, create bốn bước, hover nhóm, D20/journal/stream lỗi, HUD mobile. Screenshot bản mới có tiền tố evolved- trong output/playwright/.
- Backend không chạy tại localhost:8000 trong phiên kiểm tra UI này. Dữ liệu trình duyệt được intercept bằng fixture; chưa xác nhận end-to-end AI/Atlas thật. Không sửa env hay cấu hình MongoDB.

## UI/UX hoàn thiện — 30/09/2026

Theo yêu cầu làm rõ của người dùng, vòng cuối chỉ phát triển giao diện và trải nghiệm sử dụng từ nhận diện gốc. Không thêm cơ chế gameplay trong vòng này.

- Trang chủ: tăng thứ bậc typography, khung cảnh có viền lớp và chú thích; giữ ảnh gốc cùng tím/cyan. World Atlas có cảnh lớn, sáu ảnh thu nhỏ, nút trước/sau và CTA đúng thể loại. Khung cảnh giữ nguyên chiều cao khi chuyển thế giới; dải ảnh cuộn riêng trên điện thoại và tự đưa lựa chọn vào vùng nhìn thấy.
- Màn đọc: bối cảnh thể loại mờ phía sau HUD, mở chương bằng ảnh và tiêu đề theo phong cách tiểu thuyết; nội dung truyện nằm trên nền đặc để giữ độ tương phản. Hiệu ứng tập trung vào phản hồi tương tác, không thêm animation chạy theo chuột hay vòng lặp nền.
- Mục lục mới: tìm theo số/tên chương, hỗ trợ tiếng Việt không dấu, trạng thái đang đọc/chương mới nhất và thông báo không có kết quả. Chọn chương hoạt động ở cả chế độ từng chương và cuộn liền mạch.
- Góc đọc: xem trước font, chọn serif/sans, cỡ chữ 16–24px, độ rộng, ẩn/hiện ảnh và âm thanh. Các lựa chọn hiển thị được lưu riêng trên thiết bị, kiểm tra dữ liệu khôi phục và có nút về mặc định; âm thanh vẫn dùng audio engine hiện có.
- Hộp thoại native: khóa focus trong hộp, Escape/backdrop để đóng, trả focus cho nút đã mở. Tiêu đề/nút đóng ghim khi cuộn trên mobile. Menu mobile truy cập được thế giới/trải nghiệm/thư viện.
- Cụm lựa chọn giữ đúng yêu cầu: hover một nút mở mô tả cả ba, nút đang hover nổi lên; cảm ứng có nút xem/thu mô tả trước khi chọn.

Kiểm chứng bản chốt:

- Production build và TypeScript đạt. ESLint sạch trên các trang/component mới thay trong vòng UI; không khẳng định toàn bộ mã cũ trong repo đã sạch lint.
- 10 kiểm thử frontend đạt: SSE/store (7) và giới hạn cỡ chữ, persistence/restore, dữ liệu cài đặt lỗi (3). 23 kiểm thử backend offline đạt.
- Playwright: desktop 1440px, laptop 1366×768, mobile 390px/320px; chuyển sáu thế giới không đổi chiều cao; CTA, menu, demo/reset, không tràn ngang; tìm chương không dấu/không kết quả; chọn chương/đọc liên tục; lưu lựa chọn sau reload; hover/touch ba lựa chọn; đóng hộp thoại, focus, reduced motion; lượt fixture D20, nhật ký và lỗi stream.
- Ảnh/script QA nằm trong `output/playwright/interface-*` ở máy làm việc, không đưa cache/ảnh kiểm tra vào Git. Database và AI được giả lập cho kiểm tra trình duyệt; không sửa `.env`.

## Mở rộng không gian đọc — 30/09/2026

Vùng truyện trước đây bị chia nhỏ bởi một hàng tab riêng, ảnh mở chương cao và bảng lựa chọn cố định. Giải pháp ưu tiên chỗ đọc nhưng vẫn giữ các điều khiển dễ tìm:

- Gộp bảy tab vào thanh đầu cùng thư viện, chế độ tập trung và cài đặt. Desktop dùng một hàng; điện thoại dùng dải tab cuộn ngang ngay dưới các nút tiện ích để giữ nhãn và vùng bấm dễ dùng.
- Cột chữ mặc định tăng từ 740 lên 920px; tùy chọn rộng tăng từ 980 lên 1120px. Thu gọn sidebar và ảnh mở chương, tăng độ tương phản chữ; tiêu đề dài tự nới chiều cao thay vì bị cắt.
- Đặt bảng lựa chọn sau phần truyện trong cùng vùng cuộn. Thanh điều hướng nhỏ luôn sẵn để về đầu chương, tới lựa chọn hoặc tới phần đang viết; desktop có thêm nút ẩn/hiện HUD. Giữ hover một nút mở mô tả cả ba và nút xem mô tả trên cảm ứng.
- Theo dõi chương đang đọc bằng scroll listener thụ động và requestAnimationFrame, hỗ trợ cả cuộn trong panel và cuộn trang trên mobile. Khi có chương mới, trở về đầu chương; chuyển tab trên mobile đặt lại cuộn sau khi nội dung mới xuất hiện để hủy cuộn mượt còn dở.
- Chế độ cuộn liên tục dùng animation phù hợp với nhiều chương; các nút chuyển vị trí hỗ trợ reduced motion và đưa focus tới nội dung đích.

Kiểm chứng: production build, TypeScript, ESLint trang chơi và 10 kiểm thử frontend đạt. Playwright kiểm tra desktop 1920×900, laptop 1366×768, tablet 1024px và mobile 390/320px: vị trí tab cùng hàng cài đặt, không tràn ngang, hover/touch, cài đặt, HUD, chuyển chương, mục lục, cuộn liên tục, chuyển tab giữa lúc cuộn, reduced motion và tiêu đề dài. Ở 1920×900, vùng cuộn truyện cao khoảng 686px, cột chữ 920px và ảnh mở chương thông thường cao 153px. Không ghi nhận lỗi JavaScript hoặc cảnh báo AnimatePresence trong quy trình điều hướng đã kiểm tra.

Ảnh/script QA có tiền tố `reading-` trong `output/playwright/`, được bỏ qua bởi Git. Kiểm tra trình duyệt dùng API fixture; chưa xác nhận backend AI/Atlas thật trong vòng UI này.
