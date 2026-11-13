# UX Patterns — Thư viện luồng chuẩn

Level 3 SUPPORTING · thực thi `docs/dac-ta/03a-ux-constitution.md` + `docs/dac-ta/03c-ux-progressive-disclosure.md`.
Mỗi Screen Contract khai báo pattern dùng (template §15). Không tạo pattern mới khi một pattern dưới đây đáp ứng được; pattern mới cần PO duyệt và thêm vào bảng này.

| Mã | Pattern | Tệp | Component thực thi |
|---|---|---|---|
| UX-P01 | Upload & Generate | `p01-upload-generate.md` | `upload/*`, `TaskStatus`, `ResultPanel` |
| UX-P02 | Smart Form | `p02-smart-form.md` | `ui/input`, `ui/select`, `InlineError` |
| UX-P03 | Progressive Settings | `p03-progressive-settings.md` | `Disclosure` |
| UX-P04 | Background Task | `p04-background-task.md` | `TaskStatus`, `task-state.ts` |
| UX-P05 | Result & Next Action | `p05-result-next-action.md` | `ResultPanel` |
| UX-P06 | Error Recovery | `p06-error-recovery.md` | `InlineError` |
| UX-P07 | Confirmation | `p07-confirmation.md` | `ConfirmDialog` |
| UX-P08 | Empty State | `p08-empty-state.md` | `EmptyState` |
| UX-P09 | Search & Filter | `p09-search-filter.md` | `Disclosure` |
| UX-P10 | Bulk Actions | `p10-bulk-actions.md` | `ConfirmDialog` |
| UX-P11 | Entitlement & Permission Gate | `p11-entitlement-gate.md` | `EntitlementGate` (+ 403 `ENTITLEMENT_REQUIRED` sẵn có ở server) |
| UX-P12 | AI Cost Preview | `p12-ai-cost-preview.md` | `CostPreview` |

## Chọn cách hiển thị thêm (03c §5b)

| Cách | Dùng khi | Tránh khi |
|---|---|---|
| `Disclosure` (mở tại chỗ) | Tùy chọn phụ của cùng nhóm (UX-P03) | Phải so sánh liên tục nhiều nhóm đang đóng |
| Drawer | Xem/sửa chi tiết mà cần giữ ngữ cảnh trang | Việc quan trọng cần so nhiều thông tin toàn màn |
| Modal (`Dialog`, `ConfirmDialog`) | Xác nhận hoặc việc ngắn, tập trung (UX-P07) | Form dài, nhiều bước, cần xem dữ liệu nền |
| Tab (`TabActionHeader`) | Nhóm ngang cấp, hay chuyển qua lại | Che một quy trình bắt buộc theo thứ tự |
| Wizard / bước | Quy trình có thứ tự hoặc phụ thuộc dữ liệu | Việc làm xong được trong một màn |
| Tooltip | Giải thích ngắn, không thiết yếu | Hướng dẫn bắt buộc, lỗi, điều kiện, chi phí (UX-017) |
| "Tùy chỉnh thêm" | Cấu hình ít dùng | Cấu hình ảnh hưởng lớn tới chi phí/bảo mật/kết quả mà không có tóm tắt khi đóng |

Tài liệu kèm: `glossary.md` (từ điển thuật ngữ), `exceptions.md` (sổ ngoại lệ), `page-archetypes.md` (loại trang A–F, shell, bề mặt — UX-028), `visual-review.md` (audit thủ công P0–P3, review thị giác, so sánh tham chiếu).
Mẫu audit & ma trận phân tầng gốc: `docs/archive/historical/SMEOS_UX_Progressive_Disclosure_Kit/templates/`.

Nguyên tắc vận hành UX cho agent (bắt buộc, PD8): `OPERATING_PRINCIPLES.md`.
