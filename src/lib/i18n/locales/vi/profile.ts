/**
 * profile.ts — Từ điển màn hình Hồ sơ cửa hàng (09-ho-so-cua-hang.md SSOT)
 */

export const profileVi = {
  header: {
    title: "Hồ sơ cửa hàng và thương hiệu",
    description: "Thiết lập thông tin cửa hàng, tài khoản nhận tiền VietQR, nhận diện thương hiệu và chính sách bán hàng.",
    saveButton: "Lưu thay đổi",
  },
  tabs: {
    businessInfo: "Thông tin cửa hàng",
    branding: "Nhận diện thương hiệu",
    assets: "Khung ảnh và mẫu in",
    policy: "Chính sách và cam kết",
    toneOfVoice: "Dịp lễ và giọng văn",
  },
  form: {
    shopNameLabel: "Tên cửa hàng hiển thị",
    shopNamePlaceholder: "Ví dụ: Cửa Hàng Ban Mai, Flora Boutique",
    hotlineLabel: "Hotline tư vấn",
    hotlinePlaceholder: "Ví dụ: 0909xxxxxx",
    addressLabel: "Địa chỉ cửa hàng",
    addressPlaceholder: "Số nhà, tên đường, phường/xã, tỉnh/thành phố",
    bankLabel: "Ngân hàng nhận tiền (VietQR)",
    accountNumberLabel: "Số tài khoản nhận tiền",
    accountHolderLabel: "Tên chủ tài khoản",
  },
  policy: {
    depositTitle: "Chính sách đặt cọc qua link",
    depositRateLabel: "Tỷ lệ đặt cọc tối thiểu",
    giftsTitle: "Quà tặng và cam kết với khách",
    defaultGift: "Tặng kèm thiệp hoặc băng rôn in theo yêu cầu",
    defaultCommitment1: "Gửi ảnh thành phẩm để khách duyệt trước khi giao",
    defaultCommitment2: "Giao hoa đúng hẹn, hỗ trợ đổi trả nếu hoa dập nát",
  },
} as const

export type ProfileDictionary = typeof profileVi
