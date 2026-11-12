# T1.7 — Báo cáo Tổng hợp Kiểm kê Hiện trạng (SUMMARY.md)

> **Dự án**: ALG / ALG | **Phiên bản kiểm kê**: v1.0 | **Ngày**: 2026-10-25

## 1. Kết luận Khảo sát Hiện trạng
Codebase `ALG` hiện tại là một **Modular Monolith trưởng thành** với 38 modules, 97 bảng CSDL và 5 workers xử lý nền. Hệ thống đã sở hữu hạt nhân phân định rõ ràng giữa **Store OS** (quản lý tiệm), **Chain OS** (điều phối mạng lưới chuỗi), **Industry Pack** (chuẩn SSOT đa ngành) và **Mother Platform** (console vận hành).

## 2. Những điểm Cấu trúc Đề xuất KHÔNG KHỚP với Thực tế
1. **Cấu trúc Monorepo**: Spec pack đề xuất chia cứng thành `apps/` và `packages/`. Hiện tại ALG đang tổ chức phẳng dạng Next.js monolith (`src/modules/*` và `src/app/*`). **Khuyến nghị**: Giữ nguyên Monolith trong giai đoạn này (ADR-004), chưa tách `apps/` vật lý để tránh gãy tooling và build pipeline.
2. **Cơ chế Truy cập CSDL**: Hiện tại các module đang query Prisma trực tiếp xuyên biên giới. Cần triển khai **Repository Pattern** có interface nghiêm ngặt để chuẩn hóa ranh giới dữ liệu trước khi có thể tách bất kỳ module nào.
3. **Chưa có Transactional Outbox**: Việc gửi tin nhắn đối tác (Telegram) và đồng bộ ngoài đang gọi API trực tiếp, chưa qua bảng Outbox chuẩn hóa `event-envelope.schema.json`.

## 3. Dữ liệu Đầu vào cho Hai Quyết định Kiến trúc Then chốt

### Dữ liệu cho ADR-D1: Topology Đồng bộ (Relay qua Chain hay Store gửi song song?)
- **Dữ kiện thực tế**: Hiện tại các cửa hàng liên kết chuỗi (`chain-partnership`) không có hạ tầng server riêng biệt; tất cả đều cùng nằm trong cùng một cơ sở dữ liệu SaaS chung nhưng được cách ly bằng `organization_id`.
- **Khuyến nghị kỹ thuật**: Dùng mô hình **Relay qua Chain** cho các đơn có yếu tố điều phối chuỗi (Store cập nhật tiến độ → Chain gom và gửi lên Mother); còn các đơn nội bộ của Store độc lập thì gửi thẳng Mother.

### Dữ liệu cho ADR-D3: Mô hình Tenancy (tenant_id vs schema vs database riêng)
- **Dữ kiện thực tế**: 100% các bảng hiện tại đều có cột `organization_id` và đã có bộ test `test:tenant` bảo vệ cách ly tuyệt đối.
- **Khuyến nghị kỹ thuật**: Giữ mô hình **Mặc định dùng chung CSDL + phân tách bằng `tenant_id` (organization_id)** cho 95% khách hàng SME tiêu chuẩn. Chỉ cung cấp tùy chọn Schema riêng hoặc Database riêng cho khách hàng cấp Enterprise / Chuỗi lớn có yêu cầu hợp đồng đặc biệt.