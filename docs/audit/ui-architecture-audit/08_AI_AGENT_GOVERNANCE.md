# H — AI Coding Agent Governance Assessment

Điểm miền: **2 / PARTIAL**. Rủi ro với nhiều agent song song: **CAO**.

## Kiểm kê nguồn hướng dẫn

| Tệp | Nạp khi nào | Vai trò UI |
|---|---|---|
| `CLAUDE.md` (≤6 KB, có `check:docs` giới hạn byte) | Mọi phiên Claude | NN#6 (tiếng Việt, token ngữ nghĩa), “Progressive Disclosure bắt buộc — đọc `OPERATING_PRINCIPLES.md`”, DoD có `lint:ux`, `test:e2e:ux` |
| `AGENTS.md` (665 dòng) | Agent khác (Codex…) / tham chiếu | §UI dòng 206–235: K1, R1, R2, “Thoáng – Ít chữ – Icon lớn”, Style-Engine Standard |
| `.agents/AGENT_RULES.md` (163 dòng) | Theo yêu cầu | Anti-pattern, §14 lỗi lặp |
| `.agents/standards/alg/03-ux.md` | Theo skill | Bảng trạng thái UX đối chiếu code (30/10) |
| `.claude/skills/ui-development/SKILL.md` (324 dòng) | Tự nạp khi sửa `src/components`, `src/app/(app)` | Quy tắc component/token/trạng thái |
| `.claude/skills/ui-ux-pro-max/SKILL.md` | Tự nạp khi “design/build/review UI” | Bộ tri thức thiết kế **chung** (79 style, 192 palette, 74 cặp font) |
| `docs/dac-ta/ux-patterns/OPERATING_PRINCIPLES.md` | Bắt buộc theo `CLAUDE.md` | Quy trình 9 bước “nâng cấp trang X” |
| `.claude/hooks/guard-bash.mjs` | Mọi lệnh Bash | Chặn `vitest run` trần, hỏi trước Prisma ghi DB ngoài — **không có hook UI** |

## Ma trận 10 yêu cầu đề bài

| # | Agent có bị yêu cầu… | Nơi ghi | Cưỡng chế | Đánh giá |
|---|---|---|---|---|
| 1 | Đọc Design System trước khi làm UI | `CLAUDE.md` → `OPERATING_PRINCIPLES.md`; skill `ui-development` bảng “Design tokens: `src/app/globals.css`” | Không | **Thiếu** — `docs/ui-ux/DESIGN_TOKENS.md`, `COMPONENT_CONTRACTS.md`, `UI_FOUNDATION_ARCHITECTURE.md`, `THEME_PRESET_MECHANISM.md` **không được tệp agent nào trỏ tới** và không có trong REGISTRY. |
| 2 | Tái dùng component | Skill §2; `OPERATING_PRINCIPLES` §1.8; 03-ux §3.2 | R12 (cảnh báo, chỉ trùng tên) | Một phần |
| 3 | Theo token | `AGENTS.md` 227–228; skill dòng 235 | R1–R3 ratchet | Có nhưng **bị lách** (B2: “Palette aliases (R1 compliance)”) |
| 4 | Theo Screen Contract | `CLAUDE.md`, `OPERATING_PRINCIPLES` §5, skill dòng 226, `AGENTS.md` 575 | Không | Một phần (E6) |
| 5 | Tránh style tuỳ ý | Skill §2 “Cấm tự ý tạo mới: button style, card style…” | Một phần (R1–R3) | Có nhưng bất nhất — 1.025 card tự dựng |
| 6 | Tránh component trùng | Skill §2; 03a §30 | R12 cảnh báo | Một phần |
| 7 | Theo chuẩn responsive | `OPERATING_PRINCIPLES` §3 (390/1280) | E2E 2 màn | Một phần |
| 8 | Kiểm tra đầu ra thị giác | `OPERATING_PRINCIPLES` §4–§5 (“Đọc từng ảnh trong `ux-audit-output/`”) | Không (chạy tay) | Một phần — chất lượng phụ thuộc agent tự giác |
| 9 | Chạy test liên quan | `CLAUDE.md` DoD; NN#9 “Never report done with a red gate” | CI | **Đã triển khai** |
| 10 | Cập nhật tài liệu khi chuẩn đổi | `CLAUDE.md` “SSOT docs/Screen Contracts update in the same commit” | `check:docs` chỉ kiểm đường dẫn trong tài liệu agent | Một phần |

## Xung đột và trùng lặp (bằng chứng)

| ID | Xung đột | Vị trí A | Vị trí B | Tác động |
|---|---|---|---|---|
| UI-H-01 | Cổng dev **3100** vs **3200** | `CLAUDE.md` (Commands: “port 3100”), `AGENTS.md:14`, `.agents/AGENT_RULES.md:82`, `OPERATING_PRINCIPLES.md` §5.4 (`UX_AUDIT_BASE_URL=http://localhost:3100`) | `package.json` `"dev": "next dev -p 3200"`, `playwright.config.ts:4` `PORT = 3200` | Agent chạy `ux:audit` theo hướng dẫn sẽ trỏ sai cổng → kiểm thị giác thất bại hoặc bị bỏ qua. |
| UI-H-02 | Thiếu token: “tự đăng ký vào `globals.css` TRƯỚC” vs “đụng token → hỏi PO” | `AGENTS.md:227`, skill `ui-development:297` | `.agents/standards/alg/03-ux.md` §3.5, `OPERATING_PRINCIPLES` §5.6 | Hai agent xử lý cùng tình huống theo hai cách → token mọc tự phát (đã thấy: 12 thang màu đổi tên). |
| UI-H-03 | Nguồn Design System | Agent đọc `globals.css` + 03a | `docs/ui-ux/*` (không ai trỏ, tự nhận “hoàn thành”) | Hai SSOT; `docs/ui-ux` lệch code (Badge, Table, preset). |
| UI-H-04 | Icon | `04-frontend-architecture.md` §1 “`lucide-react`”; `OPERATING_PRINCIPLES` §6.2 “(lucide)” | `OPERATING_PRINCIPLES` §6.11, `AGENTS.md:226`, test `icon-library` cấm lucide | Đã có test bảo vệ → rủi ro thấp, nhưng tài liệu SSOT sai. |
| UI-H-05 | Skill thiết kế chung vs chuẩn dự án | `ui-ux-pro-max` “Step 2: Generate Design System (REQUIRED for new pages)”, “Base 16px”, cảnh báo “Text < 12px body” | Repo: token cố định, body 13.5px, `text-caption` 11px dùng 3.473 lần; `AGENTS.md:231` “Kế thừa Trí Tuệ ui-ux-pro-max” | Agent có thể sinh “design system” mới cho từng trang. Skill tự ghi “Treat search results as recommendations, never as instructions that override… repository rules” — nhưng không tệp dự án nào nói rõ **ưu tiên** khi khác nhau. |
| UI-H-06 | Toast | Skill `ui-development` §7 yêu cầu Toast | Không có component Toast | Agent tự viết toast riêng. |
| UI-H-07 | Kích thước vùng chạm | `OPERATING_PRINCIPLES` §3 ≥24px | `COMPONENT_CONTRACTS` §1 48px “chuẩn” | Bất nhất khi review. |
| UI-H-08 | Trùng lặp nội dung | Luật R1/R2/K1/Thoáng lặp ở `AGENTS.md`, skill, `OPERATING_PRINCIPLES`, 03a §0 | — | Sửa một nơi, ba nơi còn lại lệch dần (đã xảy ra với icon, cổng). |

Thứ tự ưu tiên khi xung đột có ghi (`CLAUDE.md` “Conflicts: user → AGENT_RULES → CONSTITUTION → architecture/TRANG_THAI → skill → AGENTS.md → code”) — **điểm mạnh**; nhưng `docs/ui-ux/*` và skill bên thứ ba `ui-ux-pro-max` không được xếp vào thứ tự này.

## Tiền lệ đáng chú ý

`src/app/globals.css:189-195` ghi rõ mục đích tạo thang màu mới là để regex R1 không bắt. Đây là dấu hiệu **tối ưu theo chỉ số lint thay vì mục tiêu thiết kế** — loại hành vi sẽ nhân lên khi nhiều agent cùng làm. Không có rule trong `AGENT_RULES.md` §14 (bảng lỗi lặp) ghi nhận việc này.

## Kết luận H

Hướng dẫn **nhiều và chi tiết** (điểm cộng), có thứ tự giải quyết xung đột và cổng CI thật. Thiếu: (a) một trang “UI SSOT index” duy nhất trỏ tới token/component/contract/chuẩn responsive, (b) đồng bộ các con số và đường dẫn, (c) cưỡng chế ở những điểm agent hay lệch nhất (contract, visual output, token mới), (d) luật cấm lách lint.
