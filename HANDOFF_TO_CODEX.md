# 🚀 BÀN GIAO DỰ ÁN TỪ ANTIGRAVITY CHO CODEX
**Dự án:** Nexus Tale (AI-Powered Interactive RPG Storyteller)  
**Repository:** `llm-storygen` (`e:\ai\interactive-story`)  
**Công nghệ:** Next.js 14 (App Router, TailwindCSS, Framer Motion, Zustand), FastAPI (Python 3.11, LangGraph, Qdrant, MongoDB, SSE Streaming).  
**Thời điểm bàn giao:** 2026-09-27  

---

## 📌 1. TRẠNG THÁI HIỆN TẠI (ĐÃ HOÀN THÀNH ĐẾN ĐÂU?)

Hệ thống đã hoàn tất trọn vẹn **Phase 1, Phase 2, Phase 3** và đã được kiểm tra Syntax/Typecheck 100% pass (`npx tsc --noEmit` & `python -m py_compile` sạch sẽ):

### ✅ Phase 1: Trải nghiệm Nghe - Nhìn (Audio/Visual)
- **AudioEngine (`frontend/src/lib/audio.ts`):** Quản lý HTML5 Audio BGM với cross-fade mượt mà theo `tone` cảnh truyện (`combat`, `ambient`, `sad`, `epic`). Web Audio SFX cho click, purchase, glitch.
- **Visual Feedback (`FloatingText.tsx`):** Hiệu ứng số trôi nổi (Floating numbers) khi cộng/trừ HP, Vàng, Năng lượng.
- **Theme động (Context-aware):** Tự chuyển đổi CSS variables/palette theo genre (Cyberpunk, Fantasy, Sci-fi,...).
- **Hệ thống Auth & Route Guard:** JWT token, bcrypt, Zustand store tích hợp Axios Interceptors, trang Admin Telemetry.

### ✅ Phase 2: Cơ Chế Hardcore RPG
- **D20 RNG Dice Roller (`DiceRoller.tsx`):** Animation xúc xắc 2D/3D khi chọn các nhánh rủi ro (`risky`, `crucial`), inject kết quả vào prompt AI phán xử hậu quả.
- **Hệ thống Sinh Tồn (HP & Energy):** Chỉ số HP, Energy, cơ chế Game Over khi HP <= 0 với màn hình tử nạn.
- **Dynamic Crafting:** Ghé lò rèn, chọn vật phẩm nguyên liệu và AI GameMaster đánh giá kết quả chế tạo tức thì.
- **Quan hệ NPC & Faction (Affinity):** Thanh thiện cảm, tự mở khóa các lựa chọn nhờ vả NPC khi độ thân thiết cao.

### ✅ Phase 3: AI Architecture & Real-Time Engine
- **Streaming Chữ Thời Gian Thực (`/api/story/stream-turn`):** Server-Sent Events (SSE) gõ chữ trực tiếp lên màn hình, triệt tiêu cảm giác chờ đợi xoay loading.
- **Dynamic Tone BGM:** GameMaster tự gắn nhãn `tone` từng cảnh, Frontend tự đổi nhạc nền tương ứng.
- **RAG Trí Nhớ Vô Hạn (Infinite Memory):** Qdrant vector database nhúng `action_context` của người chơi để truy xuất các chi tiết quá khứ liên quan nhất, đưa vào Director & Writer.
- **Multi-Agent Critic (Node 3.5 trong LangGraph):** Đánh giá ngữ pháp, logic, meta-tag rò rỉ. Nếu không đạt yêu cầu, Writer viết lại; trên màn hình hiển thị cảnh báo đỏ kiểm duyệt đậm chất Cyberpunk.

### 🛠️ Các Fix Quan Trọng Gần Nhất
- Fix crash `stream-turn` do gọi `await` trên hàm đồng bộ `_preprocess_action` và truyền sai tham số schema (`StoryConfig`).
- Đã thêm nút quay lại Dashboard và Settings trực tiếp trên thanh HUD của trang Play.
- Fix bug cuộn liên tục (continuous scrolling) và nút chế tác trong Story HUD.

---

## 🧭 2. ĐỊNH HƯỚNG BƯỚC TIẾP THEO (GỢI Ý NÂNG CẤP)

1. **Cây Phân Nhánh Quyết Định (Branching Tree / Multiverse Lore Graph):**
   - Trực quan hóa hành trình đã đi qua dưới dạng sơ đồ cây, cho phép người chơi xem lại các dòng thời gian song song hoặc "load lại checkpoint" từ các ngã rẽ lớn.
2. **Hệ Thống Chiến Đấu Chiến Thuật (Turn-Based Tactical Combat):**
   - Nâng cấp các pha combat từ dạng văn bản đơn thuần thành mini-game chiến thuật (chọn kỹ năng, dùng xúc xắc đối kháng với quái, tính điểm giáp/sát thương).
3. **AI Scene Illustration (Sinh Ảnh Minh Họa Cảnh Tức Thì):**
   - Tích hợp sinh ảnh theo từng chương hoặc sự kiện đặc biệt (dùng SD/Gemini Imagen/Pollinations) hiển thị dưới dạng Visual Novel background.
4. **Companion AI (Bạn Đồng Hành Sống Động):**
   - Cho phép có đệ tử/bạn đồng hành có tính cách độc lập, tự xen lời bình luận hoặc phản đối các quyết định của người chơi.
5. **Xuất Sách Điện Tử (Export EPUB/PDF):**
   - Đóng gói toàn bộ cuộc phiêu lưu của người chơi thành một cuốn tiểu thuyết hoàn chỉnh với bìa và minh họa.

---

## 📜 3. TÀI LIỆU THAM KHẢO THÊM (OPTIONAL)

- Chủ yếu hãy đọc trực tiếp **codebase** (`backend/` và `frontend/`) kết hợp với `README.md` để nắm kiến trúc.
- Nếu thực sự cần tra cứu lại một ngữ cảnh cụ thể nào trong quá khứ, bạn có thể tham khảo tệp `CONVERSATION_HISTORY.md`.

---

## 🎯 4. PROMPT BÀN GIAO CHO CODEX

```markdown
Chào Codex, đây là dự án được chuyển giao tiếp nối từ Antigravity.
Tên dự án: Nexus Tale - AI-Powered Interactive RPG Storyteller (Next.js 14, FastAPI, LangGraph, Qdrant, MongoDB).

Bạn chỉ cần đọc trực tiếp codebase và file HANDOFF_TO_CODEX.md để nắm bắt nhanh hệ thống (file CONVERSATION_HISTORY.md chỉ cần đọc khi thực sự muốn tra cứu sâu ngữ cảnh cũ).

NHIỆM VỤ CỦA BẠN:
Tôi muốn bạn tự do thỏa sức sáng tạo để nâng tầm dự án này:
- Nâng cấp UI/UX: biến giao diện thành một trải nghiệm đỉnh cao, thẩm mỹ, cuốn hút và sống động.
- Mở rộng gameplay: đề xuất và bổ sung các tính năng thú vị, bất ngờ, làm sâu sắc thêm trải nghiệm nhập vai.
- Tối ưu & Thắt chặt logic: rà soát, dọn dẹp điểm nghẽn hiệu năng, đảm bảo mọi cơ chế vận hành trơn tru và logic từ frontend tới backend.

YÊU CẦU ĐẶC BIỆT VỀ QUY TRÌNH PHẢN BIỆN (CRITICAL THINKING):
1. Không vội vàng làm ngay. Hãy nhìn nhận mọi ý tưởng dưới đa góc nhìn (Người chơi khó tính, Game Designer, Kỹ sư hệ thống).
2. Phản biện thật sâu và kỹ: liên tục lặp lại quá trình tìm kẽ hở, lật ngược vấn đề, vạch ra các rủi ro, điểm phi logic hoặc thiếu thực tế của từng ý tưởng.
3. Chỉ khi ý tưởng đã vượt qua các vòng chất vấn, đạt tiêu chí THỰC TẾ, HỢP LÝ, KHẢ THI và THỰC SỰ PHÙ HỢP thì mới thống nhất và bắt tay vào triển khai.
```


