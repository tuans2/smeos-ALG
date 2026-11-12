---
name: creative-studio
description: >-
  Quy tắc nghiệp vụ Creative Studio và hành trình sản phẩm ra thị trường
  (Product-to-Market Journey 14 chặng). Kích hoạt khi agent làm việc với
  Creative Studio, creative-production module, hoặc bất kỳ chức năng nào
  liên quan đến user upload ảnh sản phẩm.
---

# Creative Studio & Product Journey — ALG

> Rà theo mã thật: 05/10/2026. Đường dẫn và lệnh `npm run` trong tệp này được `npm run check:docs` kiểm tự động.

## Quick Reference

### 14 chặng Product-to-Market Journey
```
01. BRING    📸  Tải ảnh
02. UNDERSTAND 🔎  Nhận diện cấu trúc & định tính thương mại
03. DISCOVER  🔥  Nghiên cứu xu hướng & cơ hội thị trường
04. IDEATE   💡  Sinh chủ đề / góc tiếp cận / hooks / stories
05. CHOOSE   🎯  Chủ shop chọn định hướng tiếp cận
06. CREATE   ✍️  Nội dung / 🖼️ Ảnh biến thể / 🎬 Video / 🎙️ Voiceover
07. PACKAGE  📦  Đóng gói trọn bộ chiến dịch Campaign Package
08. QA      🤖  Kiểm tra chất lượng
09. APPROVE  👤  Chủ shop chốt duyệt / hiệu chỉnh
10. LAUNCH   🚀  Đăng tải / Lên lịch đa kênh
11. SELL     💬  AI Chat Sales tư vấn chốt đơn
12. MEASURE  📊  Đo lường hiệu quả kinh doanh
13. LEARN    🧠  Trích xuất mẫu thành công
14. NEXT     🎯  Đề xuất hành động tối ưu tiếp theo
```

### Phạm vi chặng theo tính năng
| Tính năng | Chặng |
|---|---|
| Tạo sản phẩm catalog | 01–02 |
| Studio ảnh marketing | 01–02–06 |
| Chiến dịch tiếp thị | 01–14 (chuỗi dài) |

---

## Rules (bắt buộc)

### 1. ⚠️ BẮT BUỘC HỎI TRƯỚC KHI LÀM (Mandatory Consultation)

Mỗi khi đụng chức năng **user upload ảnh**, Agent **PHẢI DỪNG LẠI HỎI CHỦ SẢN PHẨM** để chốt danh sách chặng. **TUYỆT ĐỐI KHÔNG TỰ SUY ĐOÁN.**

### 2. Creative Studio Contracts
- Input/output 14 chặng: Zod tại `src/modules/creative-production/contracts/`.
- Đổi data → sửa Zod → `npm run typecheck` → `npm run gen:schemas:creative` → cùng commit.
- KHÔNG sửa tay `docs/dac-ta/schemas/creative-studio/*.json`.

### 3. Khu vực Creative Studio

Nguồn: `docs/kien-truc/ALG_CREATIVE_STUDIO_ARCHITECTURE.md` (6 khu vực A–F; rà 05/10/2026).

| Khu vực | Chức năng | Key |
|---|---|---|
| **A** | Điểm khởi đầu — tải ảnh, chọn chủ đề; **không bao giờ bị chặn** | `ValidationScreen` chỉ hiện khi vào B–F thiếu dữ liệu |
| **B** | Content (bài viết) | `content_drafts` |
| **C** | Audio (voiceover/music/mix/voice clone) | `music_tracks`, `voice_clones` |
| **D** | Ảnh phân cảnh theo kịch bản bối cảnh | **Nhà cung cấp trước** (PO 25/09/2026, mẫu `workers/media_ai/providers/scene/`); Local Studio Backdrop Engine + RGBA cache chỉ là đường lùi, phải ghi rõ lý do |
| **E** | Video (storyboard) | Giọng đọc, phát ký có hạn |
| **F** | Gói chiến dịch | Chặng 07–14, `campaign_packages` (đặc tả 07 §23) |

### 4. Template System
- SSOT: `docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md`
- Thêm/xoá/đổi tên file `src/components/templates/*` → cập nhật SSOT → `npm run check:template-ssot` xanh.

---

## DO / DON'T

### ❌ DON'T — Tự ý chạy hết 14 chặng
```typescript
// Agent tự quyết định chạy từ BRING đến LAUNCH mà không hỏi
await runJourney(image, { steps: ALL_STEPS })
```

### ✅ DO — Hỏi user trước, chỉ chạy chặng được chốt
```
// Agent: "Tính năng này liên quan upload ảnh. Xin chốt các chặng cần thực hiện:
//         Catalog (01-02)? Studio ảnh (01-02-06)? Chiến dịch đầy đủ (01-14)?"
// User: "Chỉ cần 01-02-06"
await runJourney(image, { steps: [BRING, UNDERSTAND, CREATE] })
```

---

## Reference Files

| Pattern | File |
|---|---|
| Creative contracts (Zod) | `src/modules/creative-production/contracts/` |
| Template SSOT | `docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md` |
| Template engine arch | `docs/kien-truc/ALG_TEMPLATE_ENGINE_ARCHITECTURE.md` |
| Product journey SSOT | `docs/dac-ta/ALG_PRODUCT_TO_MARKET_USER_JOURNEY.md` |
| Scene providers | `workers/media_ai/providers/scene/` |
| Variant workspace UI | `src/components/creative-studio/` |
| Template components | `src/components/templates/` |

> Xem thêm: skill `ai-integration` cho AI provider rules. Skill `worker-python` cho job processing.
