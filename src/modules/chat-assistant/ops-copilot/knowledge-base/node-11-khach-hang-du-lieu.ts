import type { OpsKnowledgeNode } from "./schema"

export const NODE_11_KHACH_HANG_DU_LIEU: OpsKnowledgeNode = {
  id: "node-11-khach-hang-du-lieu",
  moduleIndex: 11,
  moduleTitle: "Chức năng 11: Khách Hàng — Yêu Cầu Về Dữ Liệu Cá Nhân",
  topicTitle: "Khách Xin Bản Sao, Xin Sửa Hoặc Xin Xoá Dữ Liệu Cá Nhân",
  routePath: "/khach-hang",
  targetRoles: ["ALL", "QUAN_LY", "BAN_HANG"],
  keywords: [
    "khách hàng", "dữ liệu cá nhân", "xoá dữ liệu", "xóa dữ liệu", "xin xoá", "xin xóa", "bản sao dữ liệu",
    "xuất dữ liệu khách", "sửa thông tin khách", "quyền riêng tư", "yêu cầu của khách", "bảo vệ dữ liệu",
  ],
  intents: ["khach_xin_xoa_du_lieu", "khach_xin_ban_sao_du_lieu", "khach_xin_sua_du_lieu"],
  summary: "Khi khách xin bản sao, xin sửa hoặc xin xoá dữ liệu cá nhân của mình: mở hồ sơ khách, vào tab Quyền riêng tư, dùng khu 'Yêu cầu về dữ liệu'. Mỗi yêu cầu được ghi lại, hạn xử lý 72 giờ.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Mở 'Khách hàng' ở menu bên trái, tìm khách và bấm 'Hồ sơ Master' ở dòng của khách",
      expectedResult: "Hộp hồ sơ khách mở ra",
    },
    {
      stepNumber: 2,
      actionText: "Chọn tab 'Quyền riêng tư', kéo xuống khu 'Yêu cầu về dữ liệu'",
      expectedResult: "Thấy các nút Xuất dữ liệu, Ghi nhận yêu cầu sửa, Xoá dữ liệu và danh sách yêu cầu cũ",
    },
    {
      stepNumber: 3,
      actionText: "Khách xin bản sao: bấm 'Xuất dữ liệu', rồi 'Tải JSON' hoặc 'Tải CSV' để gửi cho khách",
      expectedResult: "Tải về tệp chứa toàn bộ thông tin của khách trong tiệm; yêu cầu ghi là đã xử lý",
    },
    {
      stepNumber: 4,
      actionText: "Khách xin sửa: bấm 'Ghi nhận yêu cầu sửa', ghi khách muốn sửa gì; sửa ở tab Hồ sơ rồi bấm 'Đã sửa xong'",
      expectedResult: "Yêu cầu chuyển từ 'Đang chờ' sang 'Đã xử lý'",
    },
    {
      stepNumber: 5,
      actionText: "Khách xin xoá: bấm 'Xoá dữ liệu', đọc kỹ thông báo, gõ XOÁ rồi bấm 'Xoá dữ liệu'",
      expectedResult: "Tên, số điện thoại, địa chỉ, dịp kỷ niệm và tin nhắn của khách bị xoá; đơn hàng và hoá đơn vẫn giữ",
    },
  ],
  caveatsAndGotchas: [
    "Xoá dữ liệu không hoàn tác được. Đơn hàng, phiếu thu và thông tin hoá đơn VAT vẫn được giữ để đối chiếu sổ sách.",
    "Sau khi xoá, khách không còn nhận tin nhắn nhắc hẹn hay ưu đãi nữa.",
    "Yêu cầu đang chờ quá 72 giờ hiện nhãn 'Quá hạn' — xử lý sớm.",
    "Chỉ người được giao quyền mới thấy nút xuất hoặc xoá; cần thì nhờ Điều hành cấp quyền.",
  ],
  actionLabel: "Mở Danh Sách Khách Hàng",
  quickPrompts: [
    "Khách xin xoá dữ liệu cá nhân thì làm thế nào?",
    "Khách xin bản sao thông tin của mình thì xuất ở đâu?",
  ],
}
