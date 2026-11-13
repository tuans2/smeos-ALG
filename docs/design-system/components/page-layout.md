# Đặc tả Component: PageLayout & PageHeader (S3-02)

| Trường | Giá trị |
|---|---|
| **Tên component** | `PageLayout`, `PageHeader`, `DashboardLayout`, `ListLayout`, `DetailLayout`, `FormLayout`, `BuilderLayout`, `SettingsLayout` |
| **Đường dẫn tệp** | `src/components/layout/page-layout/*`, `src/components/ui/page-header.tsx` |
| **Vai trò & Mục đích** | Bộ khung chuẩn mực cho 6 loại trang (Archetypes A–F) theo đặc tả UX-028, giải quyết triệt để sự bất nhất tiêu đề, cấu trúc lưới và responsive của toàn hệ thống (UI-J-01/02). |
| **Thư viện nền tảng** | Native React + Tailwind CSS semantic tokens, không phụ thuộc thư viện ngoài |
| **Danh sách Props** | `archetype: "A" \| "B" \| "C" \| "D" \| "E" \| "F"`, `header`, `children`, `sidebar`, `filters`, `bulkActions`, `pagination`, `controls`, `preview`, `footer`, `nav`, `className` |
| **Trạng thái hỗ trợ** | Desktop wide grid, mobile single-column stacking, responsive sticky side panels, loading/empty state slots |
| **Tokens CSS sử dụng** | `--font-size-display` (20px), `--border-border`, `--color-text`, `--color-text-muted`, `--color-surface`, `--color-surface-alt`, `--radius-button` |
| **Quy chuẩn Trợ năng (A11y)** | Header semantic `<header>`, tiêu đề duy nhất `<h1 className="text-display">`, breadcrumbs có `<nav aria-label="Breadcrumb">`, navigation slot có `aria-label`, landmarks chuẩn |
| **Kích thước vùng chạm** | Nút back và breadcrumbs tối thiểu 44×44px khi con trỏ thô (`pointer: coarse`) |
| **Test Coverage** | Unit test props, 6 archetypes rendering, header title/badge/breadcrumbs trong `src/components/layout/__tests__/page-layout.test.tsx` |
| **Ghi chú di trú** | Thay thế toàn bộ header dựng tay và bố cục ad-hoc rải rác trên 105 màn hình |
