import type { OpsKnowledgeNode } from "./schema"

export const NODE_10_CAI_DAT_THANH_VIEN: OpsKnowledgeNode = {
  id: "node-10-cai-dat-thanh-vien",
  moduleIndex: 10,
  moduleTitle: "Chức năng 10: Cài Đặt & Quản Lý Thành Viên",
  topicTitle: "Cấp Tài Khoản Nhân Viên Dùng Ngay 10s (Không Cần Email) & Thu Hồi Quyền Truy Cập",
  routePath: "/cai-dat/thanh-vien",
  targetRoles: ["ALL", "QUAN_LY"],
  keywords: [
    "cài đặt", "thành viên", "nhân viên", "thêm nhân viên", "phân quyền", "tạo tài khoản",
    "cấp mật khẩu", "khóa tài khoản", "xóa nhân viên", "thu hồi quyền",
    "quản lý", "thợ chế tác", "bán hàng", "bảo mật nhân sự"
  ],
  intents: ["them_nhan_vien_moi", "phan_quyen_nhan_su", "khoa_tai_khoan_nghi_viec", "doi_vai_tro_nhan_vien"],
  summary: "Quản lý nhân sự và phân quyền: Cấp tài khoản cho nhân viên mới dùng ngay trong 10 giây (không cần chờ email xác nhận) và khóa tài khoản tức thì khi nhân viên nghỉ việc.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Mở mục 'Cài đặt' ở menu bên trái, sau đó bấm vào thẻ 'Đội ngũ & Phân quyền'",
      expectedResult: "Màn hình mở danh sách toàn bộ nhân viên của cửa hàng",
    },
    {
      stepNumber: 2,
      actionText: "Thêm nhân viên mới: Bấm nút '+ Thêm nhân viên' ở góc trên bên phải màn hình",
      expectedResult: "Mở hộp thoại nhập thông tin nhân viên mới",
    },
    {
      stepNumber: 3,
      actionText: "Điền thông tin tài khoản: Nhập Họ tên, Email đăng nhập, Mật khẩu ban đầu và chọn Vai trò (Quản lý, Bán hàng, hoặc Thợ chế tác hoa)",
      expectedResult: "Thiết lập đúng quyền truy cập cho nhân viên",
    },
    {
      stepNumber: 4,
      actionText: "Tạo và bàn giao tài khoản: Bấm 'Tạo tài khoản' và gửi email, mật khẩu cho nhân viên",
      expectedResult: "Nhân viên đăng nhập vào máy tính hoặc điện thoại làm việc được ngay, không cần kích hoạt email",
    },
    {
      stepNumber: 5,
      actionText: "Khi nhân viên nghỉ việc: Bấm vào dấu ba chấm (...) ở dòng nhân viên đó, chọn 'Tạm khóa' hoặc 'Xóa thành viên'",
      expectedResult: "Hệ thống lập tức ngắt phiên làm việc và thu hồi quyền đăng nhập để bảo vệ tiệm",
    },
  ],
  caveatsAndGotchas: [
    "Hệ thống tự động ẩn nút Khóa và Xóa trên tài khoản của chính bạn để chống lỗi tự khóa tài khoản quản trị.",
    "Nhân viên mới đăng nhập được ngay bằng mật khẩu khởi tạo mà không phải chờ bấm link email.",
    "Lệnh Tạm khóa có hiệu lực tức thì trên mọi điện thoại và máy tính mà nhân viên đang mở.",
  ],
  actionLabel: "Mở Quản Lý Thành Viên",
  quickPrompts: [
    "Cách cấp tài khoản nhân viên mới dùng ngay trong 10 giây?",
    "Cách tạm khóa tài khoản khi nhân viên nghỉ việc?",
  ],
}
