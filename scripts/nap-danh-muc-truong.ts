/**
 * ĐP-3 §6.2 mục 3.6 — Nạp (a) toàn bộ trường LÕI đã xây (Sổ đăng ký bằng
 * code, `field-platform/domain/all-core-fields.ts`) và (b) bộ danh mục D7
 * khởi tạo mặc định (Đặc tả trường §2.15) vào `field_definitions` /
 * `field_catalogs` / `field_catalog_values`.
 *
 * Chạy lại an toàn (idempotent) — xem chú thích ở từng repository:
 * `upsertCoreDefinition` không đụng nhãn/hiển thị/mức yêu cầu nếu quản trị
 * nền tảng đã sửa; `upsertCatalogValue` không đụng nhãn/bật-tắt.
 *
 *   npx prisma db push   (hoặc migrate deploy)
 *   npx prisma generate
 *   npx tsx --env-file-if-exists=.env scripts/nap-danh-muc-truong.ts
 */
import { prisma } from "../src/core/tenancy/infra/prisma"
import { ALL_CORE_FIELD_DEFINITIONS } from "../src/modules/field-platform/domain/all-core-fields"
import { FieldDefinitionRepository } from "../src/modules/field-platform/infra/field-definition-repository"
import { FieldCatalogRepository, type CatalogSeedInput, type CatalogValueSeedInput } from "../src/modules/field-platform/infra/field-catalog-repository"

/** Người thực hiện lượt nạp tự động — không phải một tài khoản đăng nhập được. */
const SEED_ACTOR = "system_seed"

const CATALOGS: CatalogSeedInput[] = [
  { key: "priority", label: "Mức ưu tiên xử lý nội bộ", governance: "BEHAVIOR", behaviorKind: "PRIORITY_TIER" },
  { key: "serviceLevel", label: "Cam kết thời gian giao", governance: "BEHAVIOR", behaviorKind: "SLA" },
  { key: "channel", label: "Kênh khách liên hệ đặt hoa", governance: "OPEN" },
  { key: "orderType", label: "Loại đơn", governance: "BEHAVIOR", behaviorKind: "ORDER_TYPE" },
  { key: "deliveryType", label: "Hình thức giao", governance: "BEHAVIOR", behaviorKind: "DELIVERY_TYPE" },
  { key: "deliveryLocationType", label: "Loại địa điểm giao", governance: "BEHAVIOR", behaviorKind: "DELIVERY_LOCATION" },
  { key: "cardStyle", label: "Kiểu thiệp/băng rôn", governance: "OPEN" },
  { key: "cardPlacement", label: "Cách trao thiệp", governance: "OPEN" },
  { key: "cardLanguage", label: "Ngôn ngữ thiệp", governance: "OPEN" },
  { key: "paymentMethod", label: "Phương thức thanh toán", governance: "BEHAVIOR", behaviorKind: "PAYMENT_METHOD" },
  { key: "collectionMethod", label: "Cách thu phần còn lại", governance: "BEHAVIOR", behaviorKind: "COLLECTION_METHOD" },
]

const CATALOG_VALUES: CatalogValueSeedInput[] = [
  // priority (§2.15.1)
  { catalogKey: "priority", code: "NORMAL", label: "Thường", sortOrder: 0, behavior: "TIER_1" },
  { catalogKey: "priority", code: "HIGH", label: "Cao", sortOrder: 1, behavior: "TIER_2" },
  { catalogKey: "priority", code: "URGENT", label: "Gấp", sortOrder: 2, behavior: "TIER_3" },
  { catalogKey: "priority", code: "CRITICAL", label: "Khẩn cấp", sortOrder: 3, behavior: "TIER_4" },
  // serviceLevel (§2.15.2)
  { catalogKey: "serviceLevel", code: "EXPRESS", label: "Giao nhanh", sortOrder: 0, behavior: "OFFSET", params: { offsetMinutes: 120 } },
  { catalogKey: "serviceLevel", code: "EXACT_TIME", label: "Hẹn đúng giờ", sortOrder: 1, behavior: "EXACT", params: { toleranceMinutes: 30 } },
  { catalogKey: "serviceLevel", code: "TIME_SLOT", label: "Theo khung giờ", sortOrder: 2, behavior: "WINDOW" },
  { catalogKey: "serviceLevel", code: "SAME_DAY", label: "Trong ngày", sortOrder: 3, behavior: "END_OF_DAY", params: { closingHour: 21 } },
  // channel (§2.15.3, MỞ)
  { catalogKey: "channel", code: "WALK_IN", label: "Khách đến tiệm", sortOrder: 0 },
  { catalogKey: "channel", code: "PHONE", label: "Điện thoại / hotline", sortOrder: 1 },
  { catalogKey: "channel", code: "ZALO", label: "Zalo cá nhân", sortOrder: 2 },
  { catalogKey: "channel", code: "ZALO_OA", label: "Zalo OA", sortOrder: 3 },
  { catalogKey: "channel", code: "FACEBOOK_MESSENGER", label: "Facebook / Messenger", sortOrder: 4 },
  { catalogKey: "channel", code: "WEBSITE", label: "Website / catalog / landing page", sortOrder: 5 },
  { catalogKey: "channel", code: "INSTAGRAM", label: "Instagram", sortOrder: 6 },
  { catalogKey: "channel", code: "TIKTOK", label: "TikTok", sortOrder: 7 },
  { catalogKey: "channel", code: "EMAIL", label: "Email", sortOrder: 8 },
  { catalogKey: "channel", code: "FLORIST_NETWORK", label: "Đơn chuyển từ tiệm/mạng điện hoa khác", sortOrder: 9 },
  { catalogKey: "channel", code: "OTHER", label: "Khác", sortOrder: 10 },
  // orderType (§2.15.4)
  { catalogKey: "orderType", code: "GIFT", label: "Quà tặng", sortOrder: 0, behavior: "GIFT" },
  { catalogKey: "orderType", code: "SYMPATHY", label: "Chia buồn / tang lễ", sortOrder: 1, behavior: "SYMPATHY" },
  { catalogKey: "orderType", code: "GRAND_OPENING", label: "Khai trương / chúc mừng", sortOrder: 2, behavior: "GRAND_OPENING" },
  { catalogKey: "orderType", code: "WEDDING_EVENT", label: "Cưới / sự kiện / hội nghị", sortOrder: 3, behavior: "WEDDING_EVENT" },
  { catalogKey: "orderType", code: "CORPORATE", label: "Doanh nghiệp", sortOrder: 4, behavior: "CORPORATE" },
  { catalogKey: "orderType", code: "SUBSCRIPTION", label: "Định kỳ", sortOrder: 5, behavior: "SUBSCRIPTION" },
  // deliveryType (§2.15.5)
  { catalogKey: "deliveryType", code: "DELIVERY", label: "Giao tận nơi cho người nhận", sortOrder: 0, behavior: "DELIVERY" },
  { catalogKey: "deliveryType", code: "STORE_PICKUP", label: "Khách nhận tại tiệm", sortOrder: 1, behavior: "STORE_PICKUP" },
  { catalogKey: "deliveryType", code: "ONSITE_SETUP", label: "Giao và lắp đặt tại địa điểm", sortOrder: 2, behavior: "ONSITE_SETUP" },
  // deliveryLocationType (§2.15.5)
  { catalogKey: "deliveryLocationType", code: "HOME", label: "Nhà riêng", sortOrder: 0, behavior: "HOME" },
  { catalogKey: "deliveryLocationType", code: "OFFICE", label: "Văn phòng / công ty", sortOrder: 1, behavior: "OFFICE" },
  { catalogKey: "deliveryLocationType", code: "HOSPITAL", label: "Bệnh viện", sortOrder: 2, behavior: "HOSPITAL" },
  { catalogKey: "deliveryLocationType", code: "HOTEL", label: "Khách sạn", sortOrder: 3, behavior: "HOTEL" },
  { catalogKey: "deliveryLocationType", code: "VENUE", label: "Nhà hàng / hội trường / nhà tang lễ", sortOrder: 4, behavior: "VENUE" },
  { catalogKey: "deliveryLocationType", code: "OTHER", label: "Khác", sortOrder: 5, behavior: "OTHER" },
  // cardStyle / cardPlacement / cardLanguage (§2.15.6, MỞ)
  { catalogKey: "cardStyle", code: "STANDARD_CARD", label: "Thiệp nhỏ cài kèm", sortOrder: 0 },
  { catalogKey: "cardStyle", code: "PREMIUM_CARD", label: "Thiệp cao cấp / thiệp gập", sortOrder: 1 },
  { catalogKey: "cardStyle", code: "SYMPATHY_CARD", label: "Thiếp chia buồn", sortOrder: 2 },
  { catalogKey: "cardStyle", code: "RIBBON_BANNER", label: "Băng rôn / dải ruy băng chữ", sortOrder: 3 },
  { catalogKey: "cardStyle", code: "CUSTOMER_PROVIDED", label: "Khách tự gửi thiệp", sortOrder: 4 },
  { catalogKey: "cardPlacement", code: "IN_ARRANGEMENT", label: "Cài trong sản phẩm", sortOrder: 0 },
  { catalogKey: "cardPlacement", code: "HANDED_SEPARATELY", label: "Trao riêng tay", sortOrder: 1 },
  { catalogKey: "cardPlacement", code: "ON_RIBBON", label: "In trên băng rôn", sortOrder: 2 },
  { catalogKey: "cardLanguage", code: "VI", label: "Tiếng Việt", sortOrder: 0 },
  { catalogKey: "cardLanguage", code: "EN", label: "Tiếng Anh", sortOrder: 1 },
  { catalogKey: "cardLanguage", code: "OTHER", label: "Khác", sortOrder: 2 },
  // paymentMethod / collectionMethod (§2.15.7)
  { catalogKey: "paymentMethod", code: "CASH", label: "Tiền mặt tại tiệm", sortOrder: 0, behavior: "PAYMENT_NO_EVIDENCE" },
  { catalogKey: "paymentMethod", code: "BANK_TRANSFER", label: "Chuyển khoản / VietQR", sortOrder: 1, behavior: "PAYMENT_REQUIRES_EVIDENCE" },
  { catalogKey: "paymentMethod", code: "COD", label: "Thu hộ khi giao", sortOrder: 2, behavior: "PAYMENT_NO_EVIDENCE" },
  { catalogKey: "paymentMethod", code: "CARD", label: "Thẻ (POS / Visa / Mastercard)", sortOrder: 3, behavior: "PAYMENT_REQUIRES_EVIDENCE" },
  { catalogKey: "paymentMethod", code: "E_WALLET", label: "Ví điện tử", sortOrder: 4, behavior: "PAYMENT_REQUIRES_EVIDENCE" },
  { catalogKey: "paymentMethod", code: "OTHER", label: "Khác", sortOrder: 5, behavior: "PAYMENT_REQUIRES_EVIDENCE" },
  { catalogKey: "collectionMethod", code: "COD_BY_SHIPPER", label: "Shipper thu hộ khi giao", sortOrder: 0, behavior: "COLLECTION_ON_DELIVERY" },
  { catalogKey: "collectionMethod", code: "TRANSFER_BEFORE_DELIVERY", label: "Chuyển khoản trước khi giao", sortOrder: 1, behavior: "COLLECTION_NOT_ON_DELIVERY" },
  { catalogKey: "collectionMethod", code: "CASH_AT_STORE", label: "Tiền mặt tại tiệm", sortOrder: 2, behavior: "COLLECTION_NOT_ON_DELIVERY" },
  { catalogKey: "collectionMethod", code: "CORPORATE_INVOICE", label: "Xuất hoá đơn doanh nghiệp", sortOrder: 3, behavior: "COLLECTION_NOT_ON_DELIVERY" },
]

async function main(): Promise<void> {
  const fieldRepo = new FieldDefinitionRepository()
  for (const def of ALL_CORE_FIELD_DEFINITIONS) {
    await fieldRepo.upsertCoreDefinition(def, SEED_ACTOR)
  }
  console.log(`Trường lõi: ${ALL_CORE_FIELD_DEFINITIONS.length} khoá.`)

  const catalogRepo = new FieldCatalogRepository()
  for (const catalog of CATALOGS) {
    await catalogRepo.upsertCatalog(catalog)
  }
  for (const value of CATALOG_VALUES) {
    await catalogRepo.upsertCatalogValue(value)
  }
  console.log(`Danh mục D7: ${CATALOGS.length} danh mục, ${CATALOG_VALUES.length} giá trị.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
