export interface CampaignOccasion {
  id: string
  label: string
  defaultHeadline: string
}

export interface CampaignArchetype {
  id: string
  name: string
  desc: string
}

export const CAMPAIGN_OCCASIONS: CampaignOccasion[] = [
  { id: "20-10", label: "Phụ nữ Việt Nam 20/10", defaultHeadline: "Trao Yêu Thương — Tôn Vinh Phái Đẹp 20/10" },
  { id: "valentine", label: "Valentine 14/2", defaultHeadline: "Gửi Trọn Tình Yêu — Ngọt Ngào Lễ Tình Nhân" },
  { id: "8-3", label: "Quốc tế Phụ nữ 8/3", defaultHeadline: "Ngàn Sản Phẩm Thắm — Chúc Mừng Ngày 8/3" },
  { id: "ngay-cua-me", label: "Ngày của Mẹ", defaultHeadline: "Tri Ân Tình Mẹ — Yêu Thương Vô Bờ" },
  { id: "khai-truong", label: "Khai trương hồng phát", defaultHeadline: "Khai Trương Đại Cát — Tài Lộc Tấn Tới" },
  { id: "hoa-cuoi", label: "Hoa cưới trọn gói", defaultHeadline: "Hạnh Phúc Bất Tận — Ngày Chung Đôi Rạng Rỡ" },
]

export const CAMPAIGN_ARCHETYPES: CampaignArchetype[] = [
  { id: "minimal-luxury", name: "Tối giản sang trọng", desc: "Tối giản sang trọng, tinh tế chuẩn gallery cao cấp" },
  { id: "modern-split", name: "Hiện đại chia khối", desc: "Hiện đại chia khối, tương phản mạnh mẽ ấn tượng" },
  { id: "festive-sale", name: "Lễ hội ưu đãi", desc: "Sôi động rực rỡ, nhấn mạnh ưu đãi ngày lễ" },
  { id: "pastel-romantic", name: "Lãng mạn pastel", desc: "Lãng mạn dịu dàng, ánh sáng tự nhiên ấm áp" },
]
