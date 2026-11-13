## Mô tả thay đổi (Summary)
<!-- Tóm tắt 1-3 câu về mục tiêu của PR này -->

- Backlog ID liên quan (nếu có): `G0-xx`, `F1-xx`, `C2-xx`, `S3-xx`, `M4-xx`...
- Loại thay đổi: `feat` | `fix` | `refactor` | `docs` | `visual-change`

---

## Kiểm soát Giao diện & Trải nghiệm (UI/UX Compliance Checklist)
<!-- Bắt buộc điền nếu PR có thay đổi tệp .tsx trong src/app hoặc src/components -->

- [ ] **Screen ID & Tuyến**: `SCR-<TẦNG>-<slug>` (Ví dụ: `SCR-STORE-don-hang`)
- [ ] **Screen Contract**: Đã cập nhật/tạo mới trong `docs/dac-ta/screen-contracts/<tuyến>.md`
- [ ] **Ảnh mốc giao diện (Visual Snapshots)**:
  - Khổ di động (Mobile 390px): `[Đính kèm ảnh / Đã có snapshot CI]`
  - Khổ máy tính (Desktop 1280px): `[Đính kèm ảnh / Đã có snapshot CI]`
- [ ] **Không vi phạm 12 Anti-patterns & Token**:
  - [ ] Không dùng màu Tailwind gốc (`bg-red-*`) hoặc 12 thang alias (`cool`, `blush`...)
  - [ ] Không dùng thẻ điều khiển HTML thô (`<button>`, `<input>`) ngoài `src/components/ui/`
  - [ ] Không dùng overlay `fixed inset-0` tự chế (đã dùng Dialog/Drawer chuẩn)
  - [ ] Không có tệp mới > 350 dòng

---

## Cổng Kiểm thử Tự động (Verification Gates)
<!-- Đánh dấu các cổng đã chạy xanh tại máy local / CI -->

- [ ] `npx tsc --noEmit` (Typecheck xanh)
- [ ] `npm run lint:ratchet` (ESLint ratchet không thêm lỗi)
- [ ] `npm run lint:ux -- --check` (UX Lint đạt chuẩn, không tăng vi phạm)
- [ ] `npm test` (Unit tests xanh 100%)
- [ ] `npm run test:tenant` (Nếu có chạm logic dữ liệu / phân quyền)
- [ ] `npm run check:docs` (Không đường dẫn chết, tài liệu khớp)

