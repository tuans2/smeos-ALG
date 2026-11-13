/**
 * GOVERNANCE CATALOG REGISTRY SSOT
 *
 * Nguồn dữ liệu Sự thật Tối cao (Single Source of Truth) kết nối toàn bộ:
 * - Ưu đãi (Promotions) từ store-policy.ts & các Industry Plugins
 * - Cam kết (Commitments) từ store-policy.ts (DEFAULT_COMMITMENTS & 7 ngành)
 * - Thỏa thuận (Agreements / Policies) từ store-policy.ts (DEFAULT_AGREEMENTS & 7 ngành)
 * - Thanh toán & Đặt cọc (Payment Plans) từ brochure-payment-policy.ts
 * - Phí gia công (Craft Fees) từ craft-fee-policy.ts & IndustryCraftFeeSpec
 * - Mẫu ấn phẩm (Templates) từ IndustryPluginContract.templates.printables
 */

import {
  type StorePoliciesConfig,
  type PromotionItem,
  type CommitmentItem,
  type AgreementItem,
  getIndustryDefaultPromotions,
  getIndustryDefaultCommitments,
  getIndustryDefaultAgreements,
} from "@/modules/greeting-card/domain/store-policy"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { type GovernanceMatrixGroup, type GovernanceViewerTier } from "./governance-matrix-types"

export type GovernanceSystemKey = "PROMOTIONS" | "COMMITMENTS" | "POLICIES" | "PAYMENTS" | "CRAFT_FEES" | "TEMPLATES"

export interface BuildMatrixOptions {
  systemKey: GovernanceSystemKey
  viewerTier: GovernanceViewerTier
  industryKey?: string | null | undefined
  storePoliciesRaw?: Partial<StorePoliciesConfig> | null | undefined
}

export function buildSSOTGovernanceGroups(options: BuildMatrixOptions): GovernanceMatrixGroup[] {
  const { systemKey, viewerTier, industryKey, storePoliciesRaw } = options
  const plugin = getIndustryPlugin(industryKey)

  switch (systemKey) {
    case "PROMOTIONS": {
      const industryPromos = getIndustryDefaultPromotions(industryKey)
      return [
        {
          groupKey: "DISCOUNT_RULES",
          groupTitle: "Trần Giảm Giá & Quy Chế Sàn",
          items: [
            {
              key: "MAX_DISCOUNT_PERCENT",
              title: "Trần chiết khấu tối đa toàn sàn (50%)",
              description: "Quy chuẩn an toàn tài chính nền tảng, chống bán phá giá và gian lận",
              groupKey: "DISCOUNT_RULES",
              groupTitle: "Trần Giảm Giá & Quy Chế Sàn",
              enabled: true,
              decidedBy: "HARD_LOCK_MOTHER",
              isLocked: true,
              hardLockedBy: "MOTHER",
              isOwnHardLock: viewerTier === "MOTHER",
              lockReason: "Đã khóa bất biến bởi Nền tảng Mẹ",
              hasLocalOverride: false,
            },
          ],
        },
        {
          groupKey: "INDUSTRY_PROMOTIONS",
          groupTitle: `Danh Mục Ưu Đãi Chuẩn Ngành (${plugin.identity.name})`,
          items: industryPromos.map((p) => {
            const isLocal = storePoliciesRaw?.promotions?.some((lp) => lp.id === p.id) ?? false
            return {
              key: p.id,
              title: p.title,
              description: p.description,
              groupKey: "INDUSTRY_PROMOTIONS",
              groupTitle: `Danh Mục Ưu Đãi Chuẩn Ngành (${plugin.identity.name})`,
              enabled: p.active !== false,
              decidedBy: isLocal ? "STORE" : "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: isLocal,
            }
          }),
        },
      ]
    }

    case "COMMITMENTS": {
      const industryCommits = getIndustryDefaultCommitments(industryKey)
      return [
        {
          groupKey: "SOP_QC_RULES",
          groupTitle: "Tiêu Chuẩn Kiểm Định SOP Toàn Sàn",
          items: [
            {
              key: "MANDATORY_QC_PHOTO",
              title: "Bắt buộc chụp ảnh nghiệm thu thành phẩm trước khi giao",
              description: "Thợ chế tác hoặc cửa hàng gia công bắt buộc tải ảnh thành phẩm lên hệ thống để duyệt",
              groupKey: "SOP_QC_RULES",
              groupTitle: "Tiêu Chuẩn Kiểm Định SOP Toàn Sàn",
              enabled: true,
              decidedBy: "HARD_LOCK_MOTHER",
              isLocked: true,
              hardLockedBy: "MOTHER",
              isOwnHardLock: viewerTier === "MOTHER",
              lockReason: "Tiêu chuẩn bảo vệ người mua toàn sàn",
              hasLocalOverride: false,
            },
          ],
        },
        {
          groupKey: "INDUSTRY_COMMITMENTS",
          groupTitle: `Bộ Cam Kết Chất Lượng Ngành (${plugin.identity.name})`,
          items: industryCommits.map((c) => {
            const isLocal = storePoliciesRaw?.commitments?.some((lc) => lc.id === c.id) ?? false
            return {
              key: c.id,
              title: c.title,
              description: c.customerText,
              groupKey: "INDUSTRY_COMMITMENTS",
              groupTitle: `Bộ Cam Kết Chất Lượng Ngành (${plugin.identity.name})`,
              enabled: true,
              decidedBy: isLocal ? "STORE" : "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: isLocal,
            }
          }),
        },
      ]
    }

    case "POLICIES": {
      const industryAgrees = getIndustryDefaultAgreements(industryKey)
      return [
        {
          groupKey: "PLATFORM_TOS",
          groupTitle: "Quy Chuẩn Dịch Vụ Sàn",
          items: [
            {
              key: "SLA_DISPUTE_24H",
              title: "Xử lý khiếu nại và phản hồi sự cố trong 24 giờ",
              description: "Thời hạn tối đa cửa hàng hoặc chuỗi phải giải quyết khiếu nại của khách",
              groupKey: "PLATFORM_TOS",
              groupTitle: "Quy Chuẩn Dịch Vụ Sàn",
              enabled: true,
              decidedBy: "HARD_LOCK_MOTHER",
              isLocked: true,
              hardLockedBy: "MOTHER",
              isOwnHardLock: viewerTier === "MOTHER",
              lockReason: "Chính sách bảo vệ quyền lợi người dùng sàn",
              hasLocalOverride: false,
            },
          ],
        },
        {
          groupKey: "INDUSTRY_AGREEMENTS",
          groupTitle: `Chính Sách & Thỏa Thuận Khách Hàng (${plugin.identity.name})`,
          items: industryAgrees.map((a) => {
            const isLocal = storePoliciesRaw?.agreements?.some((la) => la.id === a.id) ?? false
            return {
              key: a.id,
              title: a.title,
              description: a.customerText,
              groupKey: "INDUSTRY_AGREEMENTS",
              groupTitle: `Chính Sách & Thỏa Thuận Khách Hàng (${plugin.identity.name})`,
              enabled: true,
              decidedBy: isLocal ? "STORE" : "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: isLocal,
            }
          }),
        },
      ]
    }

    case "PAYMENTS": {
      return [
        {
          groupKey: "CORE_GATEWAY",
          groupTitle: "Hạ Tầng Thanh Toán Sàn",
          items: [
            {
              key: "VIETQR_PAYMENT_ENABLED",
              title: "Kích hoạt cổng thanh toán VietQR động tự động khớp tiền",
              description: "Hệ thống tự động sinh mã VietQR kèm nội dung đơn hàng để đối soát giao dịch tức thì",
              groupKey: "CORE_GATEWAY",
              groupTitle: "Hạ Tầng Thanh Toán Sàn",
              enabled: true,
              decidedBy: "HARD_LOCK_MOTHER",
              isLocked: true,
              hardLockedBy: "MOTHER",
              isOwnHardLock: viewerTier === "MOTHER",
              lockReason: "Hạ tầng lõi bắt buộc",
              hasLocalOverride: false,
            },
            {
              key: "CUSTOM_ORDER_MIN_DEPOSIT",
              title: "Sàn đặt cọc tối thiểu 50% cho đơn đặt theo yêu cầu",
              description: "Tránh rủi ro bỏ đơn đối với các đơn hàng làm thủ công cá nhân hóa",
              groupKey: "CORE_GATEWAY",
              groupTitle: "Hạ Tầng Thanh Toán Sàn",
              enabled: true,
              decidedBy: "MOTHER_DEFAULT",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: false,
            },
          ],
        },
        {
          groupKey: "STORE_PAYMENT_POLICIES",
          groupTitle: "Quy Chế Thu Tiền & Đặt Cọc Cửa Hàng",
          items: [
            {
              key: "REQUIRE_PAID_BEFORE_PROD",
              title: "Bắt buộc thu tiền cọc trước khi chuyển sang chế tác",
              description: "Chỉ khi đã xác nhận nhận tiền cọc thì đơn mới rót vào hàng đợi thợ làm hàng",
              groupKey: "STORE_PAYMENT_POLICIES",
              groupTitle: "Quy Chế Thu Tiền & Đặt Cọc Cửa Hàng",
              enabled: true,
              decidedBy: "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: false,
            },
            {
              key: "REQUIRE_PAYMENT_PROOF",
              title: "Bắt buộc khách tải ảnh bill chuyển khoản",
              description: "Khách hàng phải chụp màn hình hoặc tải hóa đơn ngân hàng khi chọn chuyển khoản",
              groupKey: "STORE_PAYMENT_POLICIES",
              groupTitle: "Quy Chế Thu Tiền & Đặt Cọc Cửa Hàng",
              enabled: true,
              decidedBy: "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: false,
            },
          ],
        },
      ]
    }

    case "CRAFT_FEES": {
      const craft = plugin.craftFee
      if (!craft) {
        return [
          {
            groupKey: "CRAFT_DISABLED",
            groupTitle: `Ngành ${plugin.identity.name} không áp dụng Phí gia công`,
            items: [
              {
                key: "CRAFT_NOT_APPLICABLE",
                title: "Ngành nghề không thuê ngoài sản xuất",
                description: `Theo quy chuẩn ngành ${plugin.identity.name}, dịch vụ này do trực tiếp cơ sở phục vụ không qua chế tác thuê ngoài`,
                groupKey: "CRAFT_DISABLED",
                groupTitle: "Không áp dụng",
                enabled: false,
                decidedBy: "INDUSTRY",
                isLocked: true,
                hardLockedBy: "INDUSTRY",
                isOwnHardLock: false,
                lockReason: "Đặc thù ngành lưu trú/dịch vụ trực tiếp",
                hasLocalOverride: false,
              },
            ],
          },
        ]
      }

      return [
        {
          groupKey: "LABOR_PROTECTION",
          groupTitle: "Bảo Vệ Người Thợ",
          items: [
            {
              key: "MAX_PENALTY_DEDUCTION_30",
              title: "Trần khấu trừ phạt lỗi gia công tối đa 30% tiền công",
              description: "Nghiêm cấm các chi nhánh hoặc chuỗi cắt trừ quá 30% công thợ khi có lỗi nhẹ",
              groupKey: "LABOR_PROTECTION",
              groupTitle: "Bảo Vệ Người Thợ",
              enabled: true,
              decidedBy: "HARD_LOCK_MOTHER",
              isLocked: true,
              hardLockedBy: "MOTHER",
              isOwnHardLock: viewerTier === "MOTHER",
              lockReason: "Luật bảo vệ quyền lợi thợ chế tác trên sàn",
              hasLocalOverride: false,
            },
          ],
        },
        {
          groupKey: "INDUSTRY_CRAFT_SPEC",
          groupTitle: `Định Mức Phí Gia Công Ngành (${craft.feeLabel})`,
          items: [
            {
              key: "CRAFT_PERCENT_DEFAULT",
              title: `${craft.feeLabel} mặc định cho chi nhánh chuỗi (${craft.defaultPercent}%)`,
              description: `Mức phí sàn: ${craft.minVnd.toLocaleString("vi-VN")} ₫ · Trần: ${craft.maxVnd.toLocaleString("vi-VN")} ₫`,
              groupKey: "INDUSTRY_CRAFT_SPEC",
              groupTitle: `Định Mức Phí Gia Công Ngành (${craft.feeLabel})`,
              enabled: true,
              decidedBy: "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: false,
            },
            {
              key: "CRAFT_PARTNER_PERCENT",
              title: `Tỷ lệ chi trả cho đối tác gia công ngoài chuỗi (${craft.partnerPercent}%)`,
              description: "Áp dụng khi điều phối đơn sang đối tác liên kết ngoài hệ thống cửa hàng cùng chủ",
              groupKey: "INDUSTRY_CRAFT_SPEC",
              groupTitle: `Định Mức Phí Gia Công Ngành (${craft.feeLabel})`,
              enabled: true,
              decidedBy: "INDUSTRY",
              isLocked: false,
              hardLockedBy: null,
              isOwnHardLock: false,
              hasLocalOverride: false,
            },
          ],
        },
      ]
    }

    case "TEMPLATES": {
      const printables = plugin.templates.printables
      return [
        {
          groupKey: "BRAND_IDENTITY_OVERLAY",
          groupTitle: "Quy Chuẩn Nhận Diện Thương Hiệu Chuỗi (Brand Overlay)",
          items: [
            {
              key: "ENFORCE_BRAND_LOGO",
              title: "Bắt buộc chèn Logo và dải nhận diện Chuỗi lên toàn bộ ấn phẩm in A6",
              description: "Chi nhánh không được phép gỡ bỏ Logo chuỗi trên Tag giá, Thẻ chúc hay Menu",
              groupKey: "BRAND_IDENTITY_OVERLAY",
              groupTitle: "Quy Chuẩn Nhận Diện Thương Hiệu Chuỗi",
              enabled: true,
              decidedBy: "CHAIN",
              isLocked: viewerTier === "STORE",
              hardLockedBy: viewerTier === "STORE" ? "CHAIN" : null,
              isOwnHardLock: viewerTier === "CHAIN",
              lockReason: "Quy chế bảo hộ thương hiệu chuỗi",
              hasLocalOverride: false,
            },
          ],
        },
        {
          groupKey: "PRINTABLE_TEMPLATES",
          groupTitle: `Danh Mục Ấn Phẩm In A6 Chuẩn Ngành (${plugin.identity.name})`,
          items: printables.map((pr) => ({
            key: pr.type,
            title: pr.title,
            description: pr.description,
            groupKey: "PRINTABLE_TEMPLATES",
            groupTitle: `Danh Mục Ấn Phẩm In A6 Chuẩn Ngành (${plugin.identity.name})`,
            enabled: true,
            decidedBy: "INDUSTRY",
            isLocked: false,
            hardLockedBy: null,
            isOwnHardLock: false,
            hasLocalOverride: false,
          })),
        },
      ]
    }
  }
}
