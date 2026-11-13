import type { OpsKnowledgeNode } from "./schema"

export const NODE_09_HO_SO_CUA_HANG: OpsKnowledgeNode = {
  id: "node-09-ho-so-cua-hang",
  moduleIndex: 9,
  moduleTitle: "Chức năng 09: Hồ Sơ Cửa Hàng",
  topicTitle: "Định Danh Doanh Nghiệp, Cấu Hình 5 Tab & Ngân Hàng VietQR Tự Động",
  routePath: "/ho-so",
  targetRoles: ["ALL", "QUAN_LY"],
  keywords: [
    "hồ sơ", "hồ sơ cửa hàng", "thông tin tiệm", "tài khoản ngân hàng", "stk", "vietqr",
    "nhận diện thương hiệu", "logo", "khung thiệp", "băng rôn",
    "chính sách cọc", "mức cọc", "giọng văn ai"
  ],
  intents: ["cau_hinh_ho_so_tiem", "cai_dat_stk_ngan_hang_vietqr", "cai_dat_chinh_sach_coc", "cai_dat_bo_nhan_dien"],
  summary: "Cài đặt thông tin cửa hàng, logo thương hiệu và số tài khoản ngân hàng nhận tiền cọc: Tự động đồng bộ số điện thoại, địa chỉ và mã QR sang phiếu in hoa và link gửi cho khách.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Mở mục 'Hồ sơ' ở menu bên trái để vào trung tâm cài đặt thông tin tiệm",
      expectedResult: "Màn hình mở các phần cấu hình thông tin cửa hàng",
    },
    {
      stepNumber: 2,
      actionText: "Cài đặt tài khoản ngân hàng: Nhập Tên tiệm, Số điện thoại, Địa chỉ và Số tài khoản ngân hàng nhận tiền cọc",
      expectedResult: "Mã VietQR gửi cho khách tự động gắn đúng số tài khoản và số tiền cọc",
    },
    {
      stepNumber: 3,
      actionText: "Tải logo thương hiệu: Tải lên Logo tiệm, câu khẩu hiệu (slogan) và phong cách hoa của tiệm",
      expectedResult: "Đồng bộ logo và màu sắc tiệm lên link xem hoa của khách",
    },
    {
      stepNumber: 4,
      actionText: "Cài đặt mẫu thiệp & băng rôn: Tải lên khung thiệp chúc mừng và mẫu in băng rôn khai trương",
      expectedResult: "Tự động chèn khung thiệp thương hiệu khi in phiếu cho khách",
    },
    {
      stepNumber: 5,
      actionText: "Thiết lập chính sách cọc: Chọn mức cọc mặc định (50% hoặc 100%), cam kết sản phẩm rồi bấm 'Lưu hồ sơ'",
      expectedResult: "Hệ thống lưu thành công và áp dụng quy định cọc trên toàn bộ đơn hàng",
    },
  ],
  caveatsAndGotchas: [
    "Bắt buộc: Tiệm cần điền Số tài khoản ngân hàng thì khách quét mã QR trên link xem hoa mới chuyển khoản cọc được.",
    "Chỉ tài khoản Chủ tiệm hoặc Quản lý mới có quyền sửa đổi thông tin ngân hàng và mức cọc tiền.",
    "Trước các dịp lễ lớn (như 20/10, 8/3), chủ tiệm có thể chỉnh mức cọc lên 100% để chống bùng hoa.",
  ],
  actionLabel: "Mở Cấu Hình Hồ Sơ Cửa Hàng",
  quickPrompts: [
    "Cài đặt số tài khoản ngân hàng nhận tiền cọc VietQR ở đâu?",
    "Cách đổi logo và thông tin tiệm trên link gửi khách?",
  ],
}
