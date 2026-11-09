"use client"

import { useI18n } from "@/lib/i18n"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Palette } from "@/components/ui/icon-set/palette"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Gift } from "@/components/ui/icon-set/gift"
import { FileText } from "@/components/ui/icon-set/file-text"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { SettingsLayout } from "@/components/layout/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { ModelChangeCard } from "@/components/organization/model-change-card"
import { ChainLinkInvitationsCard } from "@/components/organization/chain-link-invitations-card"
import { calculateReadinessScore } from "@/modules/field-platform/domain/readiness-score-engine"
import { StorePaymentMethodsEditor } from "@/components/profiles/store-payment-methods-editor"
import { PaymentPolicySection } from "@/components/profiles/payment-policy-section"
import { UnpaidOrderExpirySection } from "@/components/profiles/unpaid-order-expiry-section"
import { DepositLevelsSection } from "@/components/profiles/deposit-levels-section"
import { PriceBudgetsSection } from "@/components/profiles/price-budgets-section"
import { StorePoliciesEditor } from "@/components/profiles/store-policies-editor"
import { BrandProfileForm } from "@/components/profiles/brand-profile-form"
import { BusinessProfileForm } from "@/components/profiles/business-profile-form"
import { OccasionsSettingsForm } from "@/components/organization/occasions-settings-form"
import { BrochureFlowSettingsTab } from "@/components/organization/brochure-flow-settings-tab"
import { AiChannelsSettingsTab } from "@/components/organization/ai-channels-settings-tab"
import { SettingsTabsNav, type SettingsTab } from "@/components/organization/settings-tabs-nav"
import { ShopFieldsSettingsTab } from "@/components/organization/shop-fields-settings-tab"
import { CustomDomainSettingsTab } from "@/components/organization/custom-domain-settings-tab"
import { BROCHURE_PAYMENT_SETTINGS_KEY } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import {
  parseStorePolicies,
  STORE_POLICIES_SETTINGS_KEY,
  type StorePoliciesConfig,
} from "@/modules/greeting-card/domain/store-policy"
import { useApi, apiSend } from "@/components/greeting-card/greeting-api"
import { ChainCollectionProfileManager } from "@/components/organization/chain-collection-profile-manager"
import { isDevEnvironment } from "@/lib/dev-environment"

const VALID_TABS: SettingsTab[] = ([
  "INFO",
  "BRANDING",
  "PAYMENT",
  "DEPOSIT",
  "PROMOTIONS",
  "COMMITMENTS",
  "AGREEMENTS",
  "BROCHURE_FLOW",
  "AI_CHANNELS",
  "COLLECTION_PROFILE",
  "FIELDS",
  "DOMAIN",
] as SettingsTab[]).filter((t) => t !== "BRANDING" || isDevEnvironment()) // PHÁT_TRIỂN_SAU (PO 08/11/2026) — xem settings-tabs-nav

function CaiDatTiemContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") as SettingsTab | null

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam
    return "INFO"
  })

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const {
    business,
    brand,
    loading,
    saving,
    error,
    successMessage,
    saveBusiness,
    saveBrand,
  } = useTenantProfile()

  // API load policies
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [savingPolicies, setSavingPolicies] = useState(false)
  const industryKey = typeof org.data?.settings?.industry === "string" ? org.data.settings.industry : null
  const policies = org.data ? parseStorePolicies(org.data.settings, industryKey) : null

  async function handleSavePolicies(updatedPolicies: StorePoliciesConfig): Promise<boolean> {
    setSavingPolicies(true)
    try {
      await apiSend(
        "/api/v1/organizations/current",
        "PATCH",
        {
          settings: {
            [STORE_POLICIES_SETTINGS_KEY]: updatedPolicies,
          },
        },
        "Không lưu được chính sách & cam kết"
      )
      await org.mutate()
      return true
    } catch {
      return false
    } finally {
      setSavingPolicies(false)
    }
  }

  // Calculate live Readiness Score based on current inputs
  const configuredBank = Boolean(
    (org.data?.settings?.[BROCHURE_PAYMENT_SETTINGS_KEY] as Record<string, unknown> | undefined)?.account_no
  )
  const hasStoreName = Boolean(business?.display_name?.trim())
  const hasPhone = Boolean(business?.phone?.trim())
  const hasAddress = Boolean(business?.address?.trim())
  const hasTaxOrLegal = Boolean(business?.legal_name?.trim() || business?.tax_code?.trim())

  const readiness = calculateReadinessScore({
    targetStage: "G1",
    fields: [
      { fieldKey: "core.org.store_name", isPopulated: hasStoreName, isValid: true, isFresh: true },
      { fieldKey: "core.org.hotline_phone", isPopulated: hasPhone, isValid: true, isFresh: true },
      { fieldKey: "core.org.store_address", isPopulated: hasAddress, isValid: true, isFresh: true },
      { fieldKey: "core.finance.bank_account_number", isPopulated: configuredBank, isValid: true, isFresh: true },
    ],
    consistencyChecks: [
      { checkId: "CHK_TAX_LEGAL", description: "Đã có thông tin pháp lý hoặc mã số thuế", passed: hasTaxOrLegal },
    ],
    approvalItems: [
      { itemId: "R1_POLICY", isApproved: true },
    ],
  })

  return (
    <SettingsLayout
      header={
        <PageHeader
          title="Hồ sơ & Cài đặt cửa hàng"
          tip="Thiết lập thông tin pháp lý, thương hiệu, thanh toán, ưu đãi, quy trình và tự động hóa của cửa hàng."
          actions={
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-alt border border-border shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">Độ sẵn sàng (G1)</span>
                <span className="text-body-sm font-black text-text">{readiness.totalScore} / 100 điểm</span>
              </div>
              <div className="w-16 h-2 bg-surface rounded-full overflow-hidden border border-border/40">
                <div
                  className={`h-full transition-all duration-500 ${readiness.totalScore >= 90 ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${readiness.totalScore}%` }}
                />
              </div>
            </div>
          }
        />
      }
      nav={
        <SettingsTabsNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          policyCounts={{
            promotions: policies?.promotions.length ?? 0,
            commitments: policies?.commitments.length ?? 0,
            agreements: policies?.agreements.length ?? 0,
          }}
        />
      }
    >
      {/* Thông báo trạng thái */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-caption bg-warning-bg text-warning-text border border-warning/30 rounded-xl">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      {/* Lời mời liên kết chuỗi — cửa hàng đồng ý / từ chối (UJ-10); tự ẩn khi không có */}
      <ChainLinkInvitationsCard />

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-caption bg-success-bg text-primary border border-success-border rounded-xl">
          <CheckCircle2 size={15} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* MỤC 1: THÔNG TIN TIỆM & PHÁP LÝ */}
      {activeTab === "INFO" && (
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="p-6 rounded-2xl border border-border bg-surface">
              <SkeletonBlock lines={5} label="Đang tải thông tin cửa hàng..." />
            </div>
          ) : (
            <BusinessProfileForm
              initialData={business}
              onSave={saveBusiness}
              saving={saving}
            />
          )}
          <ModelChangeCard />
        </div>
      )}

      {/* MỤC 2: THƯƠNG HIỆU & BỘ NHẬN DIỆN */}
      {activeTab === "BRANDING" && (
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="p-6 rounded-2xl border border-border bg-surface">
              <SkeletonBlock lines={5} label="Đang tải nhận diện thương hiệu..." />
            </div>
          ) : (
            <BrandProfileForm
              initialData={brand}
              onSave={saveBrand}
              saving={saving}
            />
          )}
        </div>
      )}

      {/* MỤC 3: TÀI KHOẢN & PHƯƠNG THỨC THANH TOÁN */}
      {activeTab === "PAYMENT" && (
        <div className="flex flex-col gap-6">
          <StorePaymentMethodsEditor />
          <PaymentPolicySection />
          <UnpaidOrderExpirySection />
        </div>
      )}

      {/* MỤC 4: CHÍNH SÁCH ĐẶT CỌC & NGÂN SÁCH MẪU */}
      {activeTab === "DEPOSIT" && (
        <div className="flex flex-col gap-6">
          <DepositLevelsSection />
          <PriceBudgetsSection />
          <OccasionsSettingsForm />
        </div>
      )}

      {/* MỤC 5: CHƯƠNG TRÌNH ƯU ĐÃI & GIẢM GIÁ */}
      {activeTab === "PROMOTIONS" && (
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs">
            <h2 className="text-title-sm font-extrabold text-text flex items-center gap-2 mb-1">
              <Gift size={18} className="text-primary" /> Chương Trình Ưu Đãi Mua Sắm
            </h2>
            <p className="text-caption text-text-muted mb-4">
              Cài đặt các mã ưu đãi hoặc quà tặng kèm tự động áp dụng khi khách xem bộ sưu tập riêng.
            </p>

            {policies ? (
              <StorePoliciesEditor
                initialPolicies={policies}
                onSave={handleSavePolicies}
                saving={savingPolicies || org.isLoading}
                initialSection="promo"
                hideSubTabs={true}
              />
            ) : (
              <p className="text-caption text-text-muted py-4">Đang tải chính sách ưu đãi...</p>
            )}
          </div>
        </div>
      )}

      {/* MỤC 6: CAM KẾT CHẤT LƯỢNG & BẢO HÀNH */}
      {activeTab === "COMMITMENTS" && (
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs">
            <h2 className="text-title-sm font-extrabold text-text flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-primary" /> Cam Kết Chất Lượng Dịch Vụ
            </h2>
            <p className="text-caption text-text-muted mb-4">
              Các tiêu chuẩn tiệm cam kết với khách hàng (ảnh chụp thật trước khi giao, bảo hành đổi trả...).
            </p>

            {policies ? (
              <StorePoliciesEditor
                initialPolicies={policies}
                onSave={handleSavePolicies}
                saving={savingPolicies || org.isLoading}
                initialSection="commit"
                hideSubTabs={true}
              />
            ) : (
              <p className="text-caption text-text-muted py-4">Đang tải danh mục cam kết...</p>
            )}
          </div>
        </div>
      )}

      {/* MỤC 7: THỎA THUẬN ĐẶT HÀNG */}
      {activeTab === "AGREEMENTS" && (
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs">
            <h2 className="text-title-sm font-extrabold text-text flex items-center gap-2 mb-1">
              <FileText size={18} className="text-primary" /> Thỏa Thuận & Quy Định Khi Đặt Hàng
            </h2>
            <p className="text-caption text-text-muted mb-4">
              Các điều khoản cần khách hàng đọc và đồng ý trước khi chốt đơn (thay thế nguyên liệu theo mùa, phụ thu...).
            </p>

            {policies ? (
              <StorePoliciesEditor
                initialPolicies={policies}
                onSave={handleSavePolicies}
                saving={savingPolicies || org.isLoading}
                initialSection="agree"
                hideSubTabs={true}
              />
            ) : (
              <p className="text-caption text-text-muted py-4">Đang tải danh mục thỏa thuận...</p>
            )}
          </div>
        </div>
      )}

      {/* MỤC 8: CƠ CHẾ THẺ CHÀO & QUY TRÌNH DUYỆT ĐƠN */}
      {activeTab === "BROCHURE_FLOW" && <BrochureFlowSettingsTab />}

      {/* MỤC 9: TRỢ LÝ AI & KÊNH MẠNG XÃ HỘI */}
      {activeTab === "AI_CHANNELS" && <AiChannelsSettingsTab />}

      {/* MỤC 10: DANH MỤC THU THẬP CHUỖI (§9.5.8) */}
      {activeTab === "COLLECTION_PROFILE" && <ChainCollectionProfileManager />}

      {/* MỤC 11: TRƯỜNG DỮ LIỆU CỦA CỬA HÀNG (checklist ALG 1.9) */}
      {activeTab === "FIELDS" && <ShopFieldsSettingsTab />}
      {activeTab === "DOMAIN" && <CustomDomainSettingsTab />}
    </SettingsLayout>
  )
}

export default function CaiDatTiemPage() {
  const { t } = useI18n()
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-5xl mx-auto w-full">
          <SkeletonBlock lines={4} label="Đang tải Hồ sơ & Cài đặt..." />
        </div>
      }
    >
      <CaiDatTiemContent />
    </Suspense>
  )
}
