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
    info: "1. Thông Tin Tiệm",
    branding: "2. Thương Hiệu",
    payment: "3. Nhận Thanh Toán",
    deposit: "4. Đặt Cọc & Giá",
    promotions: "5. Ưu Đãi",
    commitments: "6. Cam Kết",
    agreements: "7. Thỏa Thuận",
    brochureFlow: "8. Bộ sưu tập riêng & quy trình",
    aiChannels: "9. AI & Kênh",
    collectionProfile: "10. Thu Thập Chuỗi",
    fields: "11. Trường Dữ Liệu",
    customDomain: "12. Tên Miền Riêng",
  },
} as const

export type SettingsDictionary = typeof settingsVi
