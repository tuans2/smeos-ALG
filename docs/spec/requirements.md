# Danh sách yêu cầu (requirements)

Nguồn: Kiến trúc Repository & Hệ sinh thái Sản phẩm, bản 2.0. Mỗi dòng là một yêu cầu có mã. **MUST** bắt buộc; **SHOULD** nên làm, nếu bỏ phải ghi lý do trong traceability. Cột "Kiểm chứng" là cách chứng minh yêu cầu đã đạt; yêu cầu chưa có kiểm chứng chạy được thì chưa được tính là xong.


## ARCH — Kiến trúc mã nguồn và module

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-ARCH-001 | MUST | Mother Monorepo là nguồn sự thật duy nhất của mã nguồn. Repo sản phẩm (industry-saas-flora, chain-os, store-os) chỉ là đích phát hành/xuất bản, không phát triển song song. | Chặn push trực tiếp vào repo đích; CI chỉ xuất từ monorepo |
| REQ-ARCH-002 | MUST | Mã nguồn tổ chức theo bốn tầng: 4 Product/Edition → 3 Domain Modules → 2 Platform → 1 Infrastructure. | architecture test: mỗi package thuộc đúng một tầng |
| REQ-ARCH-003 | MUST | Chỉ được phụ thuộc xuống tầng dưới; cấm phụ thuộc ngược tầng và phụ thuộc vòng. | architecture test (dependency rules) fail khi vi phạm |
| REQ-ARCH-004 | MUST | Module cùng tầng chỉ giao tiếp qua interface, API hoặc event đã công bố; cấm import nội bộ của nhau. | architecture test: cấm import vào thư mục internal của module khác |
| REQ-ARCH-005 | MUST | Industry Pack không được import Store OS hay Chain OS; chỉ cắm vào qua extension point do Core công bố. | architecture test |
| REQ-ARCH-006 | MUST | Mỗi module sở hữu schema/bảng của mình; cấm module khác truy cập trực tiếp bảng đó, phải dùng API hoặc event. | test quét truy vấn/ORM theo schema owner |
| REQ-ARCH-007 | MUST | Mỗi module có owner, danh sách phụ thuộc được phép và danh sách schema sở hữu, khai báo trong file manifest của module. | lint manifest trong CI |
| REQ-ARCH-008 | MUST | Mỗi module build và chạy test độc lập được, không kéo logic ngoài trách nhiệm của nó. | CI chạy test cô lập từng module (tiêu chí A1) |
| REQ-ARCH-009 | MUST | Kiểm thử kiến trúc chạy trong mỗi pull request; vi phạm làm CI thất bại. | CI job architecture-tests bắt buộc |
| REQ-ARCH-010 | MUST | Ban đầu dùng Modular Monolith trong monorepo; không tách microservices và không tách repo khi chưa đạt điều kiện REQ-ARCH-011. | review ADR trước khi tách |
| REQ-ARCH-011 | MUST | Chỉ được tách repo khi đạt ít nhất hai trong năm tín hiệu: (1) khách cần mã/môi trường biệt lập mà export không đáp ứng; (2) nhịp phát hành khác biệt; (3) có đội sở hữu riêng; (4) cần tách IP/giấy phép; (5) yêu cầu tuân thủ buộc cô lập. Phải có ADR ghi nhận. | ADR được duyệt bởi con người |
| REQ-ARCH-012 | MUST | Vòng đời sản phẩm đi qua Incubate → Extract → Graduate; chuyển giai đoạn khi đạt điều kiện đã định (xem 00-overview). | checklist trong ADR của sản phẩm |
| REQ-ARCH-013 | MUST | Tùy biến khách hàng theo ba bậc: cấu hình → extension/plugin có version → mã riêng ở repo customer-<tên>-deploy chỉ gọi API công khai. | review; cấm nhánh code theo khách |
| REQ-ARCH-014 | MUST | Cấm fork hoặc nhánh code riêng theo khách hàng làm mô hình phát triển mặc định. | kiểm tra cấu trúc nhánh/repo |
| REQ-ARCH-015 | MUST | Sửa trực tiếp code lõi cho một khách là ngoại lệ, bắt buộc có ADR nêu lý do, phạm vi, hạn xử lý. | ADR tồn tại cho mỗi ngoại lệ |
| REQ-ARCH-016 | SHOULD | Dùng công cụ monorepo hỗ trợ workspace và build có cache chỉ build phần bị ảnh hưởng (lựa chọn cụ thể thuộc ADR-D2, chưa chốt). | ADR-D2 |

## BND — Ranh giới trách nhiệm và sở hữu dữ liệu

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-BND-001 | MUST | Mother được tách thành hai vai trò: Mother Monorepo (build-time) và Mother Platform (run-time); tài liệu, tên gói và code dùng đúng tên. | review thuật ngữ |
| REQ-BND-002 | MUST | Mother Platform chỉ chịu trách nhiệm: danh mục ngành/sản phẩm, định danh tenant/tổ chức/instance, chính sách kết nối và phạm vi đồng bộ, Ingestion API, Mother Data Platform, SDK/API contract, giấy phép/entitlement, giám sát đồng bộ. | review phạm vi module mother-* |
| REQ-BND-003 | MUST | Mother Platform không chứa nghiệp vụ vận hành cửa hàng, quản lý chi tiết mạng lưới chuỗi hay logic đặc thù ngành. | architecture test: mother-platform-app không phụ thuộc store-core/chain-core nghiệp vụ |
| REQ-BND-004 | MUST | Mỗi nghiệp vụ và nhóm dữ liệu có đúng một hệ thống chịu trách nhiệm chính (system of record); hệ thống khác dùng API hoặc event. | bảng sở hữu trong 00-overview; review |
| REQ-BND-005 | MUST | Store OS sở hữu: đơn hàng và tiến độ xử lý, khách hàng, tồn kho và tiêu hao nguyên liệu thực tế, thanh toán, giao hàng, báo cáo cửa hàng, thông tin cửa hàng/sản phẩm/giá. | kiểm tra schema owner |
| REQ-BND-006 | MUST | Chain OS sở hữu: hồ sơ đối tác, tier, tiêu chuẩn mạng lưới, phân vùng, xếp hạng, chính sách hợp tác, quyết định phân bổ/điều phối đơn, KPI chuỗi. | kiểm tra schema owner |
| REQ-BND-007 | MUST | Industry Pack sở hữu: công thức, cấu phần sản phẩm, định mức chuẩn (master), quy tắc, danh mục và báo cáo đặc thù ngành. | kiểm tra schema owner |
| REQ-BND-008 | MUST | Định mức chuẩn chỉ tồn tại ở Industry Pack; Store OS chỉ đọc (qua package/API), không sao chép định nghĩa. | test: không có bảng định mức chuẩn trong store-core |
| REQ-BND-009 | MUST | Chain OS không sửa trực tiếp bản ghi đơn gốc; Chain đề nghị phân bổ, Store quyết định chấp nhận/từ chối và thực thi. | test phân quyền; kiểm tra không có ghi chéo |
| REQ-BND-010 | MUST | Mother có thể tổng hợp dữ liệu được phép chia sẻ nhưng không là hệ thống ghi nhận giao dịch gốc; dữ liệu tổng hợp không tự thay thế dữ liệu nguồn. | review; test |
| REQ-BND-011 | MUST | Vòng đời đơn dùng các sự kiện: order.created (Store), order.allocated (Chain), order.accepted/order.rejected (Store), order.in_production/delivering/delivered/failed (Store), order.closed (Store). | contract test sự kiện đơn |
| REQ-BND-012 | MUST | Khi Store từ chối đơn, sự kiện order.rejected kèm lý do để Chain phân bổ lại. | contract test |
| REQ-BND-013 | MUST | Đồng bộ hai chiều chỉ áp dụng cho nhóm dữ liệu được liệt kê (chính sách mạng lưới Chain→Store, entitlement Mother→sản phẩm); mỗi nhóm có quy tắc bên thắng khi xung đột, theo version. | ADR cho mỗi nhóm hai chiều |

## PRD — Mô hình sản phẩm (Edition)

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-PRD-001 | MUST | Mỗi sản phẩm phát hành là một Edition = Core + Industry Pack + Connector Profile. | manifest của mỗi app |
| REQ-PRD-002 | MUST | Core (store-core, chain-core) không chứa quy tắc đặc thù ngành. | architecture test |
| REQ-PRD-003 | MUST | Store OS và Chain OS là lõi theo chiều ngang; "ALG Store OS" = store-core + flora-pack + profile, không có codebase Store OS riêng cho hoa. | kiểm tra cấu trúc apps/ |
| REQ-PRD-004 | MUST | Industry Pack cắm vào Core qua extension point có version do Core công bố. | contract test extension point |
| REQ-PRD-005 | SHOULD | Đặt tên nhất quán: Mother Platform, Industry SaaS, Chain OS, Store OS, kèm tên ngành khi cần. | review thuật ngữ |

## CON — Mother Connector và đồng bộ dữ liệu

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-CON-001 | MUST | Mọi sản phẩm (Industry SaaS, Chain OS, Store OS) đồng bộ dữ liệu về Mother qua Mother Connector theo một chuẩn duy nhất; tách repo hoặc triển khai riêng không được làm mất khả năng này. | e2e test sau khi đóng gói Edition (tiêu chí A2, B1) |
| REQ-CON-002 | MUST | Phạm vi đồng bộ do chính sách kết nối và Connector Profile quyết định, không hard-code trong nghiệp vụ. | review; test đổi profile đổi phạm vi |
| REQ-CON-003 | MUST | Topology đồng bộ phân cấp Store → Chain → Mother; mỗi cấp chỉ chuyển tiếp khi được cấp quyền và bật cờ trong Connector Profile; tắt một cấp không làm hỏng vận hành cấp dưới. | e2e test ba cấu hình: Store độc lập, Store trong chuỗi, chuỗi tắt Mother |
| REQ-CON-004 | MUST | Sự kiện cần gửi được ghi vào outbox trong cùng giao dịch với dữ liệu nghiệp vụ (transactional outbox). | test: rollback giao dịch thì không có sự kiện |
| REQ-CON-005 | MUST | Connector đọc outbox, lọc trường theo Connector Profile, chuẩn hóa thành event envelope, ký và gửi. | contract + e2e test |
| REQ-CON-006 | MUST | Chỉ đánh dấu sự kiện đã gửi sau khi nhận ack từ đích. | test mất ack |
| REQ-CON-007 | MUST | Mô hình giao nhận là ít nhất một lần kết hợp idempotency; không hứa đúng một lần ở tầng truyền tải. | test gửi lặp |
| REQ-CON-008 | MUST | Đích loại trùng bằng idempotency_key; sự kiện gửi lặp không tạo bản ghi hoặc tác động trùng. | test (tiêu chí B2) |
| REQ-CON-009 | MUST | Thứ tự được bảo đảm theo từng aggregate qua aggregate_version, không bảo đảm thứ tự toàn cục; bản cũ hơn bị bỏ hoặc xếp chờ. | test sự kiện sai thứ tự |
| REQ-CON-010 | MUST | Khi mất kết nối, sự kiện giữ trong outbox; gửi lại với exponential backoff và jitter; cảnh báo khi backlog vượt ngưỡng. | test ngắt mạng (tiêu chí B2) |
| REQ-CON-011 | MUST | Schema không tương thích bị từ chối kèm mã lỗi rõ ràng, vào dead-letter, không chặn các sự kiện khác. | test schema sai |
| REQ-CON-012 | MUST | Credential bị thu hồi: Connector dừng gửi, giữ outbox, báo trạng thái cần cấp lại; vận hành cốt lõi của sản phẩm không dừng. | test thu hồi credential |
| REQ-CON-013 | MUST | Có công cụ phát lại (replay) sự kiện theo khoảng thời gian/loại sự kiện; an toàn nhờ idempotency. | test replay |
| REQ-CON-014 | MUST | Khi khách ngắt đồng bộ: ghi nhận sự kiện ngắt, dừng gửi, xử lý dữ liệu đã nhận theo chính sách lưu/xóa trong hợp đồng. | test ngắt đồng bộ |
| REQ-CON-015 | MUST | Mọi sự kiện dùng event envelope chuẩn với các trường: event_id (UUIDv7), idempotency_key, event_type, schema_version, occurred_at, source{org_id, chain_id, store_id, instance_id, product, product_version, connector_version}, subject{aggregate_type, aggregate_id, aggregate_version}, classification, payload. | JSON Schema trong docs/spec/contracts; contract test |
| REQ-CON-016 | MUST | Chữ ký và thông tin xác thực nằm ở header truyền tải, không nằm trong payload. | contract test |
| REQ-CON-017 | MUST | Ingestion API kiểm tra quyền, schema, định danh, chữ ký và idempotency trước khi ghi nhận, và trả ack. | API test |
| REQ-CON-018 | MUST | Mother không truy cập trực tiếp database của khách; chỉ dùng cơ chế push/API có xác thực. | review; chặn kết nối DB |
| REQ-CON-019 | MUST | Mỗi sự kiện truy vết được từ nguồn đến đích bằng event_id; lưu trạng thái, độ trễ, lỗi, số lần retry và kết quả. | test truy vết (tiêu chí B1) |
| REQ-CON-020 | MUST | Có Identity Mapping liên kết tenant, tổ chức, chuỗi, cửa hàng, instance và ID bản ghi nguồn. | test ánh xạ |
| REQ-CON-021 | MUST | Có Data Mapping có version ánh xạ schema ngành/sản phẩm về mô hình chuẩn của Mother. | contract test |
| REQ-CON-022 | SHOULD | Connector chạy cùng sản phẩm hoặc như tiến trình riêng, cấu hình được. | review |

## DAT — Phân loại dữ liệu và tuân thủ

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-DAT-001 | MUST | Mọi loại sự kiện đồng bộ được gán lớp dữ liệu: L0 định danh/kết nối; L1 chỉ số tổng hợp; L2 bản ghi vận hành; L3 dữ liệu cá nhân/nhạy cảm. | JSON Schema bắt buộc trường classification |
| REQ-DAT-002 | MUST | L0 luôn đồng bộ; L1 đồng bộ khi hợp đồng cho phép; L2 chỉ theo danh sách trường được duyệt và mục đích đã nêu; L3 mặc định KHÔNG đồng bộ. | test sinh dữ liệu có L3, kiểm tra payload tại đích (tiêu chí B3) |
| REQ-DAT-003 | MUST | Nếu bắt buộc đồng bộ L3: phải ẩn danh/băm/mã hóa, có căn cứ xử lý và đánh giá tác động theo luật; cần ADR và duyệt của con người. | ADR + duyệt pháp chế |
| REQ-DAT-004 | MUST | Connector Profile khai báo theo từng loại sự kiện: lớp dữ liệu, danh sách trường gửi, mục đích, căn cứ pháp lý/hợp đồng, thời hạn lưu tại Mother. | lint profile |
| REQ-DAT-005 | MUST | Trường không có trong danh sách được duyệt bị loại tại nguồn, không phụ thuộc việc Mother bỏ qua. | test |
| REQ-DAT-006 | MUST | Dữ liệu cá nhân có metadata mục đích, căn cứ và thời hạn lưu. | review schema |
| REQ-DAT-007 | MUST | Có luồng xử lý yêu cầu xóa/chỉnh sửa của chủ thể dữ liệu, lan truyền từ nguồn lên Mother (ngược chiều luồng dữ liệu). | test luồng xóa |
| REQ-DAT-008 | MUST | Việc lưu trữ ở Mother và ở các triển khai riêng phải qua đánh giá chuyển dữ liệu xuyên biên giới trước khi chọn nhà cung cấp hạ tầng (xem ADR-D5); pháp chế xác nhận căn cứ pháp lý (Luật BVDLCN 91/2025/QH15, Nghị định 356/2025/NĐ-CP). | ADR-D5; pháp chế |
| REQ-DAT-009 | MUST | Hợp đồng với khách xác định rõ bên kiểm soát và bên xử lý dữ liệu. | rà soát hợp đồng (ngoài code) |

## SEC — Bảo mật

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-SEC-001 | MUST | Mỗi instance có định danh duy nhất và credential riêng; cấm secret cố định trong mã nguồn hoặc dùng chung giữa khách hàng. | secret scanning trong CI |
| REQ-SEC-002 | MUST | Truyền dữ liệu qua TLS; secret quản lý bằng kho bí mật; xoay vòng định kỳ và thu hồi được ngay. | test xoay vòng/thu hồi |
| REQ-SEC-003 | MUST | Thông điệp được ký và có timestamp/nonce để chống giả mạo và phát lại ngoài ý muốn. | test chữ ký, nonce |
| REQ-SEC-004 | MUST | Dữ liệu L2/L3 trong outbox và tại Mother được mã hóa khi lưu; khóa quản lý tách khỏi dữ liệu. | review hạ tầng |
| REQ-SEC-005 | MUST | Cô lập tenant ở mọi lớp (API, database, queue, cache, log); phân quyền tối thiểu; audit log bất biến cho thao tác quản trị. | bộ test cô lập tenant (tiêu chí C3) |
| REQ-SEC-006 | MUST | Mỗi release sinh SBOM, quét dependency và giấy phép mã nguồn mở, ký artifact. | CI job |
| REQ-SEC-007 | MUST | Quét dependency chặn lỗ hổng mức nghiêm trọng khi phát hành. | CI gate |

## COM — Mô hình thương mại và triển khai

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-COM-001 | MUST | Hỗ trợ ba hình thức: SaaS dùng chung, triển khai riêng (Private Deployment), bàn giao mã nguồn. | tài liệu + diễn tập từng hình thức (tiêu chí C1) |
| REQ-COM-002 | MUST | SaaS dùng chung tách dữ liệu theo tenant; mô hình tenancy theo ADR-D3 (chưa chốt). | ADR-D3 |
| REQ-COM-003 | MUST | Triển khai riêng: môi trường và database riêng; có gói triển khai chuẩn (container image hoặc chart + hướng dẫn) và kịch bản nâng cấp/rollback đã kiểm thử. | diễn tập triển khai |
| REQ-COM-004 | MUST | Bàn giao mã nguồn gồm snapshot, version, hướng dẫn build/deploy, cấu hình mẫu, tài liệu vận hành, phạm vi hỗ trợ; quyền IP, sửa đổi, phân phối lại, nghĩa vụ kết nối quy định riêng trong hợp đồng. | checklist bàn giao |
| REQ-COM-005 | MUST | Mother Platform giữ trạng thái giấy phép theo instance và gói (module, Industry Pack, số cửa hàng, thời hạn); sản phẩm kiểm tra entitlement qua Connector, có chế độ hoạt động tạm khi mất kết nối với thời hạn ân hạn theo hợp đồng. | test entitlement |
| REQ-COM-006 | MUST | Không giả định ngăn tuyệt đối chủ hạ tầng sửa code đã bàn giao; mức ràng buộc kỹ thuật thuộc ADR-D4 (chưa chốt). | ADR-D4 |

## VER — Phiên bản, release và cập nhật

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-VER-001 | MUST | Dùng Semantic Versioning cho từng package, API contract, schema sự kiện và sản phẩm. | CI kiểm tra version |
| REQ-VER-002 | MUST | Mỗi MAJOR của Ingestion API và schema sự kiện được hỗ trợ song song tối thiểu một khoảng công bố (đề xuất khởi điểm 12 tháng). | chính sách + ma trận tương thích |
| REQ-VER-003 | MUST | Connector phiên bản N làm việc với Ingestion API MAJOR N và N−1; Mother công bố ma trận tương thích và cảnh báo instance sắp hết hỗ trợ. | contract test đa phiên bản |
| REQ-VER-004 | MUST | Thay đổi schema: thêm trường tùy chọn trước, deprecate sau, xóa ở MAJOR kế tiếp; contract test chặn thay đổi phá vỡ. | contract test (tiêu chí B4) |
| REQ-VER-005 | MUST | Migration database theo mẫu expand → migrate → contract, có kịch bản rollback hoặc phục hồi; chạy được khi nhảy qua nhiều MINOR liên tiếp. | test migration nhảy phiên bản |
| REQ-VER-006 | MUST | Quy trình phát hành: nhánh tính năng + PR có review và owner module; CI (lint, unit, integration, architecture, dependency, bảo mật); kiểm thử ranh giới, contract, migration, Connector; tag/release bất biến; artifact gắn version và digest; staging và kiểm thử chấp nhận; triển khai theo đợt có rollback; release note. | pipeline CI/CD |
| REQ-VER-007 | MUST | Không tự động copy mọi thay đổi từ Mother sang sản phẩm đã phát hành; thành phần dùng chung phát hành thành package có version, sản phẩm nâng cấp dependency theo lịch. | review quy trình |
| REQ-VER-008 | MUST | Bản vá bảo mật có kênh riêng: backport cho các dòng còn hỗ trợ. | quy trình |
| REQ-VER-009 | MUST | Release note ghi thay đổi schema, khả năng tương thích và hướng dẫn nâng cấp. | kiểm tra release |

## NFR — Chỉ tiêu phi chức năng (đề xuất khởi điểm, cần con người hiệu chỉnh)

| ID | Mức | Yêu cầu | Kiểm chứng |
|---|---|---|---|
| REQ-NFR-001 | MUST | Không mất sự kiện đã commit trong outbox; outbox giữ tối thiểu 7 ngày khi mất kết nối. | test (tiêu chí B2) |
| REQ-NFR-002 | SHOULD | Khi hai đầu khả dụng, độ trễ đồng bộ p95 dưới 60 giây từ commit đến ack của Mother (đo trước, rồi chốt). | đo ở giai đoạn Connector |
| REQ-NFR-003 | MUST | Sản phẩm vận hành bình thường khi Mother ngừng, trong giới hạn đã thiết kế. | test ngắt Mother |
| REQ-NFR-004 | SHOULD | RPO/RTO riêng cho từng gói SaaS, chốt theo hợp đồng. | hợp đồng |
| REQ-NFR-005 | MUST | Có dashboard backlog outbox, lỗi, độ trễ, retry theo instance; cảnh báo khi vượt ngưỡng. | review quan sát |
| REQ-NFR-006 | MUST | Rollback được diễn tập định kỳ; theo dõi thời gian từ commit đến staging. | diễn tập |
