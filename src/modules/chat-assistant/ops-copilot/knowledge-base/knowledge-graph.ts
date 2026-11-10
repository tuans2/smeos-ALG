/**
 * Cross-Module Knowledge Graph (Đồ thị Liên kết Tri thức Đa Phân Hệ).
 * Định nghĩa mạng lưới phụ thuộc và liên kết nghiệp vụ giữa 10 Chức năng SSOT.
 */

import type { RelatedKnowledgeLink } from "../pipeline/pipeline-types"

interface KnowledgeNodeRelation {
  nodeId: string
  relations: RelatedKnowledgeLink[]
}

const KNOWLEDGE_GRAPH_RELATIONS: KnowledgeNodeRelation[] = [
  {
    nodeId: "node-03-the-chao",
    relations: [
      {
        nodeId: "node-09-ho-so-cua-hang",
        title: "Cấu hình STK Ngân Hàng VietQR",
        route: "/ho-so",
        relationReason: "Bắt buộc điền STK ngân hàng ở Hồ sơ để mã VietQR cọc tiền hiển thị trên bộ sưu tập riêng.",
      },
      {
        nodeId: "node-02-don-hang",
        title: "Theo Dõi Đơn Cọc Trên Kanban",
        route: "/don-hang",
        relationReason: "Khi khách quét cọc thành công, đơn tự động nhảy vào Kanban để duyệt tiền về.",
      },
      {
        nodeId: "node-08-kho-du-lieu",
        title: "Lấy Sản Phẩm Từ Kho Dữ Liệu",
        route: "/kho-du-lieu",
        relationReason: "Chọn các sản phẩm đã duyệt để ghim vào bộ sưu tập gửi khách.",
      },
    ],
  },
  {
    nodeId: "node-02-don-hang",
    relations: [
      {
        nodeId: "node-05-tao-mau-hoa-moi",
        title: "Công Thức Định Lượng BOM",
        route: "/san-pham/tao-moi",
        relationReason: "Phiếu xưởng ẩn giá trích xuất trực tiếp từ công thức định lượng BOM BOM của sản phẩm.",
      },
      {
        nodeId: "node-09-ho-so-cua-hang",
        title: "Logo & Hotline Tiệm Trên Phiếu A6",
        route: "/ho-so",
        relationReason: "Phiếu in giao hàng A6 tự động đồng bộ hotline và địa chỉ từ Hồ sơ cửa hàng.",
      },
      {
        nodeId: "node-10-cai-dat-thanh-vien",
        title: "Phân Quyền Thợ Chế Tác Hoa & Shipper",
        route: "/cai-dat/thanh-vien",
        relationReason: "Cấp tài khoản chuyên biệt cho thợ xưởng để họ chỉ xem lát cắt ẩn giá.",
      },
    ],
  },
  {
    nodeId: "node-05-tao-mau-hoa-moi",
    relations: [
      {
        nodeId: "node-07-quet-anh-ai",
        title: "Quét Ảnh Hoa Đếm Cành Tự Động",
        route: "/tai-anh",
        relationReason: "Dùng AI Vision nhận diện ảnh hoa thật để tự sinh công thức BOM thay vì gõ tay.",
      },
      {
        nodeId: "node-04-san-pham-va-gia",
        title: "Bảng Giá Niêm Yết Sau Khi Tạo",
        route: "/san-pham",
        relationReason: "Sau khi lưu mẫu mới, hoa sẽ hiển thị trong Bảng giá niêm yết của cửa hàng.",
      },
    ],
  },
  {
    nodeId: "node-06-nhap-hang-loat",
    relations: [
      {
        nodeId: "node-04-san-pham-va-gia",
        title: "Kiểm Tra Danh Mục Sau Nhập Excel",
        route: "/san-pham",
        relationReason: "Kiểm tra toàn bộ sản phẩm vừa import trên giao diện Lưới hoặc Bảng.",
      },
      {
        nodeId: "node-08-kho-du-lieu",
        title: "Kho Lưu Trữ Ảnh Đám Mây",
        route: "/kho-du-lieu",
        relationReason: "Ảnh từ link Google Drive hợp lệ sẽ tự động tải vào Kho dữ liệu tiệm.",
      },
    ],
  },
  {
    nodeId: "node-07-quet-anh-ai",
    relations: [
      {
        nodeId: "node-08-kho-du-lieu",
        title: "Tái Sử Dụng Mẫu Không Tốn Credit",
        route: "/kho-du-lieu",
        relationReason: "Chọn lại các sản phẩm đã duyệt trong kho để tiết kiệm Credit AI.",
      },
      {
        nodeId: "node-03-the-chao",
        title: "Ghim mẫu vào bộ sưu tập riêng gửi Zalo",
        route: "/the-chao",
        relationReason: "Đưa ngay kịch bản Zalo và mẫu vừa phân tích vào Brochure di động gửi khách.",
      },
    ],
  },
  {
    nodeId: "node-09-ho-so-cua-hang",
    relations: [
      {
        nodeId: "node-03-the-chao",
        title: "Đồng bộ mã VietQR sang bộ sưu tập riêng",
        route: "/the-chao",
        relationReason: "Mọi thay đổi STK ngân hàng thụ hưởng sẽ cập nhật lập tức lên link gửi khách.",
      },
    ],
  },
  {
    nodeId: "node-10-cai-dat-thanh-vien",
    relations: [
      {
        nodeId: "node-02-don-hang",
        title: "Bàn Giao Thao Tác Cho Nhân Viên",
        route: "/don-hang",
        relationReason: "Nhân viên mới sau khi được cấp tài khoản có thể vào nhận đơn trên Kanban ngay.",
      },
    ],
  },
]

/**
 * Tra cứu các liên kết nghiệp vụ liên phân hệ cho 1 Node tri thức
 */
export function getRelatedKnowledgeLinks(nodeId: string): RelatedKnowledgeLink[] {
  const match = KNOWLEDGE_GRAPH_RELATIONS.find((r) => r.nodeId === nodeId)
  return match ? match.relations : []
}
