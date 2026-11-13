import type { OpsKnowledgeNode } from "./schema"

export const NODE_05_TAO_MAU_HOA_MOI: OpsKnowledgeNode = {
  id: "node-05-tao-mau-hoa-moi",
  moduleIndex: 5,
  moduleTitle: "Chức năng 05: Tạo Sản Phẩm Mới",
  topicTitle: "Khởi Tạo Sản Phẩm & Công Thức Định Lượng BOM Chuẩn",
  routePath: "/san-pham/tao-moi",
  targetRoles: ["ALL", "QUAN_LY", "THO_CAM"],
  keywords: [
    "tạo sản phẩm", "thêm sản phẩm", "bom", "công thức BOM", "bóc tách cành", "thành phần",
    "kiểu dáng", "hướng bố cục", "giá vốn", "costing", "giá niêm yết", "tải ảnh hoa",
    "quy cách", "kích thước hoa", "lưu và xuất bản", "vai trò hoa"
  ],
  intents: ["tao_mau_hoa_moi", "nhap_cong_thuc_bom", "tinh_gia_von_costing", "xuat_ban_san_pham_moi"],
  summary: "Tạo sản phẩm mới và ghi rõ công thức định lượng BOM: Tải ảnh thật, điền số lượng từng thành phần để thợ chế tác hoa cắm giống 95% mẫu gốc và giúp tiệm tính chuẩn giá vốn.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Mở mục 'Sản phẩm', sau đó bấm nút 'Thêm sản phẩm' ở góc trên bên phải",
      expectedResult: "Màn hình mở giao diện thêm sản phẩm mới và tự tạo mã hoa",
    },
    {
      stepNumber: 2,
      actionText: "Tải ảnh sản phẩm: Kéo thả ảnh hoa thật vào khung tải ảnh, chọn trạng thái 'Đang bán'",
      expectedResult: "Ảnh hoa hiển thị xem trước rõ nét",
    },
    {
      stepNumber: 3,
      actionText: "Điền thông tin cơ bản: Nhập Tên sản phẩm, chọn Kiểu dáng (bó tròn, giỏ, kệ...), Hướng nhìn và Giá bán",
      expectedResult: "Thông tin cơ bản được cập nhật vào sản phẩm",
    },
    {
      stepNumber: 4,
      actionText: "Nhập công thức định lượng BOM: Thêm từng dòng hoa cụ thể gồm Tên hoa, Số lượng cành, Màu sắc và Vai trò (hoa chính, hoa phụ, lá đệm)",
      expectedResult: "Hệ thống tự động tính tổng số cành và ước tính giá vốn vật liệu",
    },
    {
      stepNumber: 5,
      actionText: "Lưu và đăng bán: Kiểm tra lại Tên hoa, Giá bán và Ảnh đại diện rồi bấm 'Lưu & Xuất bản'",
      expectedResult: "Sản phẩm được lưu vào hệ thống và sẵn sàng đưa vào bán hàng",
    },
  ],
  caveatsAndGotchas: [
    "Quy tắc ghi công thức BOM: Nhập riêng từng ô (Tên hoa: Hồng đỏ, Số lượng: 10 cành), không viết gộp chung một câu dài để hệ thống tính giá vốn chuẩn xác.",
    "Bắt buộc phải có đủ Tên sản phẩm, Giá bán và Ảnh hoa thật thì mới bấm lưu đăng bán được.",
  ],
  actionLabel: "Mở Màn Hình Tạo Sản Phẩm",
  quickPrompts: [
    "Cách nhập số lượng thành phần cho thợ chế tác chuẩn mẫu?",
    "Các điều kiện bắt buộc để lưu sản phẩm mới?",
  ],
}
