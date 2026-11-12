# I — Design System Governance & Scalability Assessment

Điểm miền: **1 / INITIAL**. Rủi ro phân mảnh thiết kế: **CAO**.

## Kiểm tra từng năng lực

| Năng lực | Trạng thái | Bằng chứng | Khoảng trống |
|---|---|---|---|
| Ownership | Một phần | `CLAUDE.md`: owner PO cho toàn repo; UX khoá K1/K2/shell “đổi phải PO duyệt” (03a §0, `OPERATING_PRINCIPLES` §1.8) | Không có owner riêng cho token/component/theme; không `CODEOWNERS`. Lịch sử: 33/36 commit chạm `docs/ui-ux`, `src/components/ui`, `globals.css` do agent AI tạo (`git log --format=%an`) — quyết định thiết kế chủ yếu sinh bởi agent, PO duyệt theo đợt. |
| Change management | Một phần | Ratchet ux-lint; nhật ký `MEUX_DEEP_AUDIT.md`; mục “Cần PO quyết” trong quy trình §5 | Không có quy trình RFC/đề xuất token hay component; `AGENTS.md:227` cho phép agent tự thêm token (xung đột UI-H-02). |
| Versioning | **Không triển khai** | Không version Design System, không CHANGELOG, `package.json` `version 0.0.0` | Không biết bản token nào một màn đang dựa vào. |
| Deprecation | **Không triển khai** | 0 `@deprecated` trong `src/components`; không danh sách “không dùng nữa” | Token shadcn cũ (261 tệp), thang màu đổi tên (59 tệp), `Table` (0 dùng), `dark:` (11 tệp), `DENSITY_CONFIG` (0 dùng) tồn tại không nhãn. |
| Backward compatibility | Có (lời) | `UI_FOUNDATION_ARCHITECTURE.md` §3 “Zero Breaking Changes… chỉ bổ sung props tùy chọn” | Không có test bảo vệ API component (G2). |
| Documentation maintenance | **Có nhưng bất nhất** | `check:docs` kiểm đường dẫn trong tài liệu agent và giới hạn byte `CLAUDE.md` | `docs/ui-ux/` (24 tệp) **không có mục nào trong `00-DOCUMENTATION-REGISTRY.yaml`**; nhiều tệp là báo cáo một lần (`PHASE_3_*`, `FINAL_COMPLETION_REPORT`) trộn với “chuẩn” (`DESIGN_TOKENS`, `COMPONENT_CONTRACTS`) mà không phân biệt trạng thái `CANONICAL/SUPPORTING/HISTORICAL`. REGISTRY còn trỏ phụ thuộc tới `docs/ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md` (dòng 620) — **tệp không tồn tại ở đường dẫn đó** (thực tế nằm trong `docs/kien-truc/Nâng cấp tasks/`). |
| Tài liệu tự đánh giá khớp thực tế? | **Không** | `FINAL_COMPLETION_REPORT.md:6` “Hoàn thành xuất sắc cả 4 Giai đoạn”; `UI_ARCHITECTURE_READINESS.md` §4 “Phân lập Logic & UI 5/5 — sạch 100%” | Đối chiếu: 76/105 trang là client component gọi API (A1), `Table` 0 dùng, preset thiếu (B5), 261 tệp token cũ (con số tăng từ 203). |
| Cross-application reuse | Một phần | `ui/`, `journey/`, nav dùng chung cho `(app)` + `(platform)` | Không có package riêng; `04-frontend-architecture.md` §1 nêu mục tiêu dùng chung với `LocalBudd` — không có cơ chế (monorepo/package) nào. |
| Theme management | Một phần | `src/lib/ui-system/` | Không theo tenant/tầng; không lưu máy chủ; ai cũng đổi được (B5). |
| Token governance | Một phần | R1–R3 ratchet | Lách được bằng đổi tên (B2); không có quy tắc đặt tên token, không review token mới. |
| Contribution guidelines | Một phần | Skill `ui-development` §2, 03a §30 | Không checklist “thêm component mới” (props, states, a11y, test, tài liệu). |

## Lan truyền thay đổi component chung — thử nghiệm tư duy có bằng chứng

| Thay đổi giả định | Lan tới đâu | Không lan tới đâu |
|---|---|---|
| Đổi bo góc nút qua preset | Không đâu — `Button` dùng `rounded-xl` cố định, không đọc `--radius-button` (0 nơi đọc) | 371 tệp dùng `Button` + 1.078 `<button>` thô |
| Đổi màu “thành công” toàn hệ thống | Các nơi dùng `text-success`, `bg-success-bg` | 2.081 chỗ dùng `mint-*`, `emerald` trong object literal; `Badge success` dùng `text-primary` |
| Thêm `aria-invalid` vào `Input` | 45 tệp dùng `<Input>` | 654 `<input>` thô |
| Đổi focus ring | `Button` | 336 `outline-none` tự đặt |
| Đổi khung trang (đệm, max-width) | 3 tệp dùng `PageContainer` | ~100 trang còn lại |

**Kết luận:** một thay đổi ở component chung **không thể** lan an toàn tới 4 tầng hiện nay; mức lan thực tế ước 10–35% bề mặt tuỳ primitive.

## Đánh giá rủi ro phân mảnh

| Yếu tố | Mức | Lý do |
|---|---|---|
| Số agent/luồng phát triển song song | Cao | Lịch sử commit chủ yếu từ agent; nhiều nhánh tính năng UI (`Nangcap_Ui_chainos`, airy rollout…). |
| Độ phủ component chuẩn | Thấp | Bảng ở C. |
| Cưỡng chế | Trung bình | ux-lint ratchet tốt nhưng có lỗ (B2, R1 object literal, R12 chỉ tên). |
| Tài liệu | Phân tán | ≥5 nơi định nghĩa cùng luật (H, UI-H-08). |
| Đa tầng | Cao | ChainOS/Mother không có contract; tầng Ngành chưa có bề mặt. |

Tổng hợp: **CAO** — nếu thêm sản phẩm/tầng mới mà không đóng các lỗ trên, mỗi tầng sẽ tiến hoá thành một “mini design system” riêng.
