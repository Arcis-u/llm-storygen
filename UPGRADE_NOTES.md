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

## Alibaba embedding 2048 và bộ nhớ hai tầng — 30/09/2026

- Cấu hình người dùng chọn `qwen3.7-text-embedding` ở 2048 chiều. Cả ChatOpenAI và AsyncOpenAI đọc chung `ALIBABA_BASE_URL`; `.env` được nạp theo vị trí backend thay vì phụ thuộc thư mục chạy. Không đưa endpoint workspace riêng hay API key vào source Git.
- Sửa nhánh provider: model embedding Qwen thương mại được gửi tới Alibaba, không sang Hugging Face. Kích thước yêu cầu và Qdrant lấy cùng `EMBEDDING_DIMENSIONS`; kiểm tra số lượng, thứ tự, số chiều và giá trị vector. Lỗi provider được báo lỗi, không biến thành vector 0. Qwen Hugging Face có tiền tố `hf/` cũng không bị nhầm sang Alibaba trong factory LLM.
- Ý đồ cũ là tìm chương bằng tóm tắt rồi đọc chi tiết. MongoDB vẫn giữ toàn bộ truyện. Refactor trước đó gom việc lưu lượt vào `turn_service.py`, nhưng rút mất vector nội dung thứ hai và giữ payload 2000 ký tự. Đó là sự giảm độ phủ ký ức trong bước refactor, không phải toàn bộ thiết kế dùng tóm tắt là sai.
- Giữ tóm tắt và bổ sung các đoạn nội dung tối đa 1800 ký tự, chồng lấn 180 ký tự, phủ đến cuối chương. Gửi embedding theo lô tối đa 20 đoạn. Upsert theo ID ổn định để retry/rebuild không sinh bản sao; truy hồi tối đa 12 ứng viên, chọn tối đa 6 đoạn, tối đa 2 đoạn mỗi chương và ngân sách 8000 ký tự, trình bày theo thứ tự chương. Lọc `story_id` và giữ ngữ cảnh gần nhất khi provider bị lỗi. Index chạy nền, tách khỏi việc lưu chương và phản hồi lượt chơi.
- Thêm `backend/scripts/rebuild_story_memory.py`: mặc định dry-run, chỉ ghi khi `--apply`, yêu cầu collection đích riêng, kiểm tra profile và số vector. Collection nguồn được giữ nguyên. Có thể staging bằng `--dimensions` và `--base-url`, rồi đổi `.env` sau khi kiểm tra hoàn tất.

Kiểm chứng: 36 kiểm thử backend offline đạt, gồm 13 kiểm thử mới về provider/dimensions, lỗi vector, đoạn cuối chương, retry không trùng, lọc câu chuyện và đường index nền. Kiểm tra thật với endpoint Alibaba do người dùng cung cấp trả về 2048 chiều. Đã rebuild 36 chương từ Atlas thành 103 vector ở collection mới, đối chiếu toàn bộ payload với nguồn MongoDB; 2 vector nguồn cũ còn nguyên. Truy hồi thật bằng nội dung cuối chương trả về đoạn chứa đúng phần cuối. Chưa chạy một lượt sinh truyện LLM mới và chưa đo chất lượng truy hồi trên một bộ benchmark tiếng Việt.

## Qwen 3.8 Max — 30/09/2026

Theo yêu cầu người dùng, đổi `DIRECTOR_MODEL` và `WRITER_MODEL` trong cấu hình cục bộ từ `alibaba/qwen3.7-plus` sang `alibaba/qwen3.8-max`; cập nhật hai vai trò này trong `.env.example`. Critic dùng chung `DIRECTOR_MODEL` nên cũng chuyển sang Max. Editor/GameMaster vẫn dùng Qwen 3.8 Flash; embedding Qwen 3.7 ở 2048 chiều, endpoint và dữ liệu truyện được giữ nguyên. `.env` riêng không được đưa lên Git.

Kiểm chứng: Settings nạp đúng model và factory gửi tên API `qwen3.8-max` qua endpoint hiện có. Hai yêu cầu thật bằng LangChain đã trả lời thành công: văn bản ở giới hạn 2048 token và `CriticOutput` có cấu trúc ở giới hạn 500 token, đều kết thúc bình thường. 36 kiểm thử backend offline đạt. Chưa chạy toàn bộ lượt sinh truyện hay đo chất lượng/độ trễ của Max so với Plus.

## Qwen thinking và đầu ra có cấu trúc — 30/09/2026 (đã thay thế)

Quyết định tắt thinking trong mục này đã được thay thế theo yêu cầu người dùng; cấu hình hiện tại bật thinking cho tất cả lời gọi Qwen hybrid, như mục bên dưới.

Render báo lỗi `tool_choice` khi State Extractor gọi Qwen 3.8 Flash ở thinking mode. LangChain ép gọi tool theo tên để lấy dữ liệu đúng schema; Alibaba không cho kết hợp lựa chọn tool bắt buộc này với thinking mode. JSON text dự phòng vẫn có thể tiếp tục lượt, nhưng thêm một yêu cầu model và không bảo đảm nguyên nhân đã được xử lý.

Thêm helper đầu ra có cấu trúc dùng chung cho State Extractor, Writer và Critic. Với các model Qwen hybrid Max/Plus/Flash thuộc 3.5–3.8, helper sao chép cấu hình client, gửi `extra_body={"enable_thinking": false}` và chọn rõ `function_calling` cho yêu cầu schema. Giữ các trường extra_body khác; client gốc và lời gọi lập kế hoạch Director không bị đổi chính sách thinking. Các provider/model khác giữ phương thức structured output hiện có. Không đổi env, model, embedding hay dữ liệu truyện.

Kiểm chứng: dùng đúng `langchain-openai==0.2.7` đã ghim trên Render, tái hiện lỗi 400 thật với Flash khi thinking bật và ép tool; sau sửa, ba schema thật `StateDiff` (Flash), `WriterOutput` và `CriticOutput` (Max) đều phân tích thành công. StateDiff trích đúng mất 10 HP từ cảnh thử. 39 kiểm thử backend đạt, gồm kiểm tra ba schema, State Extractor thành công ngay lần gọi đầu, không đổi client gốc và không áp tham số Qwen cho model khác. Kiểm tra API là các yêu cầu nhỏ độc lập, chưa chạy toàn bộ lượt truyện trên Render.

## Thinking bật cho toàn bộ Qwen — 30/09/2026

Theo yêu cầu người dùng, bỏ việc tắt thinking ở Writer, Critic và State Extractor. Factory gửi rõ `extra_body={"enable_thinking": true}` cho mọi lời gọi Qwen hybrid Max/Plus/Flash, bao gồm Director, Writer, Critic, State Extractor, GameMaster và các chức năng phụ dùng chung factory. Helper schema cũng giữ thinking bật ở mọi nhánh.

Với Qwen 3.7/3.8, dùng đầu ra JSON Schema native qua `response_format` thay cho ép `tool_choice`; tiếp tục kiểm tra bằng Pydantic. Với dòng hybrid cũ, dùng JSON mode có schema trong prompt và kiểm tra phía ứng dụng, vẫn giữ thinking. Provider khác giữ phương thức hiện có. Tăng giới hạn token Writer lên 8192, Critic và Director lên 4096 để có chỗ cho suy luận và kết quả, thay cho giới hạn Writer/Director 2048 và Critic 500. Không đặt giới hạn `thinking_budget` riêng, không đổi model hay env. Nguồn: [Alibaba structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output).

Kiểm chứng: 43 kiểm thử backend đạt, bao gồm request JSON Schema với thinking bật cho cả ba schema, các node Writer/Critic/State Extractor, JSON mode của dòng cũ, factory bật thinking cho các vai trò và event stream không lộ reasoning. Gọi API thật với LangChain 0.2.7: ba schema trả dữ liệu hợp lệ và API ghi nhận token reasoning. Chạy thêm ba node thật liên tiếp trên cảnh thử không lưu dữ liệu: Writer tạo 1949 ký tự với 3187 token reasoning; Critic trả đánh giá với 199 token reasoning; State Extractor trả thay đổi với 4730 token reasoning. Mỗi node chỉ gọi một lần, không đi qua fallback. Chưa kiểm tra toàn bộ lượt truyện trên Render. LangChain 0.2.7 xử lý JSON Schema Pydantic bằng phản hồi hoàn chỉnh và có cảnh báo chưa hỗ trợ token streaming cho dạng này; SSE của ứng dụng vẫn gửi tiến trình và nội dung đã phân tích như hiện tại.
