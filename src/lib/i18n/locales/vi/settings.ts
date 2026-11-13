/**
 * settings.ts — Từ điển màn hình Cài đặt & Quản lý thành viên (10-cai-dat.md SSOT)
 */

export const settingsVi = {
  header: {
    guidanceBadge: "CÀI ĐẶT CỬA HÀNG",
    guidanceTitle: "Quản lý thông tin chung và các thiết lập nâng cao của cửa hàng.",
    shopName: "Tên cửa hàng",
    hotline: "Hotline liên hệ",
    address: "Địa chỉ cửa hàng",
    openingHours: "Giờ mở cửa",
    saveButton: "Lưu thay đổi",
  },
  navigationCards: {
    profile: {
      title: "Hồ sơ và thương hiệu",
      desc: "Logo, màu sắc thương hiệu, chính sách cọc, cam kết và dịp lễ.",
    },
    ai: {
      title: "Thiết lập AI",
      desc: "Bảo vệ thông tin khách hàng, giới hạn chi phí dùng AI và chọn nhà cung cấp AI.",
    },
    social: {
      title: "Kết nối mạng xã hội",
      desc: "Kết nối Facebook, Instagram, TikTok và Zalo OA.",
    },
    vision: {
      title: "Phân tích ảnh hoa",
      desc: "Chọn cách AI nhận diện ảnh hoa cho toàn bộ cửa hàng.",
    },
    members: {
      title: "Thành viên và phân quyền",
      desc: "Mời thành viên mới, phân vai trò và chi nhánh làm việc.",
    },
  },
  members: {
    backToSettings: "Quay lại Cài đặt",
    title: "Thành viên và phân quyền",
    addMemberButton: "Thêm thành viên",
    refresh: "Làm mới",
    searchPlaceholder: "Tìm theo tên, email hoặc vai trò…",
    table: {
      member: "Thành viên",
      email: "Email",
      branch: "Chi nhánh",
      role: "Vai trò",
      status: "Trạng thái",
      actions: "Thao tác",
    },
  },
  tabs: {
    info: "Thông Tin Tiệm",
    branding: "Thương Hiệu",
    payment: "Nhận Thanh Toán",
    deposit: "Đặt Cọc & Giá",
    promotions: "Ưu Đãi",
    commitments: "Cam Kết",
    agreements: "Thỏa Thuận",
    brochureFlow: "Bộ sưu tập riêng & quy trình",
    aiChannels: "AI & Kênh",
    collectionProfile: "Thu Thập Chuỗi",
    fields: "Trường Dữ Liệu",
    customDomain: "Tên Miền Riêng",
  },
} as const

export type SettingsDictionary = typeof settingsVi
