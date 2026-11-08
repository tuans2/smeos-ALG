"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Store } from "@/components/ui/icon-set/store"
import { Palette } from "@/components/ui/icon-set/palette"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { DollarSign } from "@/components/ui/icon-set/dollar-sign"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Send } from "@/components/ui/icon-set/send"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { ListChecks } from "@/components/ui/icon-set/list-checks"
import { Globe } from "@/components/ui/icon-set/globe"
import { useI18n } from "@/lib/i18n"
import { useSession } from "@/lib/session"
import { isDevEnvironment } from "@/lib/dev-environment"

export type SettingsTab =
  | "INFO"          // 1. Thông tin cơ sở & Pháp lý (L1 Master)
  | "BRANDING"      // 2. Nhận diện thương hiệu (Logo, màu, dịp)
  | "PAYMENT"       // 3. Tài khoản ngân hàng & VietQR
  | "DEPOSIT"       // 4. Đặt cọc, Thanh toán & Dải giá
  | "PROMOTIONS"    // 5. Danh mục ưu đãi (Voucher & Quà tặng)
  | "COMMITMENTS"   // 6. Cam kết chất lượng
  | "AGREEMENTS"    // 7. Thỏa thuận đặt hàng
  | "BROCHURE_FLOW" // 8. Cơ chế Thẻ Chào & Quy trình
  | "AI_CHANNELS"   // 9. Trợ lý AI & Mạng xã hội
  | "COLLECTION_PROFILE" // 10. Danh mục thu thập chuỗi (§9.5.8)
  | "FIELDS"        // 11. Trường dữ liệu của cửa hàng (checklist ALG 1.9, D18)
  | "DOMAIN"        // 12. Tên miền riêng (checklist ALG 10.8, D19)

interface SettingsTabsNavProps {
  activeTab: SettingsTab
  onSelectTab: (tab: SettingsTab) => void
  policyCounts: {
    promotions: number
    commitments: number
    agreements: number
  }
}

export function SettingsTabsNav({
  activeTab,
  onSelectTab,
  policyCounts,
}: SettingsTabsNavProps) {
  const { dict } = useI18n()
  const { can } = useSession()

  const tabs = [
    { key: "INFO" as const, label: dict.settings.tabs.info, icon: Store },
    // PHÁT_TRIỂN_SAU (PO 08/11/2026): thương hiệu chỉ còn ở /ho-so và /cong-cu — tab này chỉ môi trường phát triển thấy
    ...(isDevEnvironment() ? [{ key: "BRANDING" as const, label: dict.settings.tabs.branding, icon: Palette }] : []),
    { key: "PAYMENT" as const, label: dict.settings.tabs.payment, icon: QrCode },
    { key: "DEPOSIT" as const, label: dict.settings.tabs.deposit, icon: DollarSign },
    { key: "PROMOTIONS" as const, label: `${dict.settings.tabs.promotions} (${policyCounts.promotions})`, icon: Gift },
    { key: "COMMITMENTS" as const, label: `${dict.settings.tabs.commitments} (${policyCounts.commitments})`, icon: ShieldCheck },
    { key: "AGREEMENTS" as const, label: `${dict.settings.tabs.agreements} (${policyCounts.agreements})`, icon: FileText },
    { key: "BROCHURE_FLOW" as const, label: dict.settings.tabs.brochureFlow, icon: Send },
    { key: "AI_CHANNELS" as const, label: dict.settings.tabs.aiChannels, icon: Cpu },
    { key: "COLLECTION_PROFILE" as const, label: dict.settings.tabs.collectionProfile, icon: ShieldCheck },
    ...(can("D18") ? [{ key: "FIELDS" as const, label: dict.settings.tabs.fields, icon: ListChecks }] : []),
    ...(can("D19") ? [{ key: "DOMAIN" as const, label: dict.settings.tabs.customDomain, icon: Globe }] : []),
  ]

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface border border-border overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.key
        return (
          <Button variant="ghost"
            type="button"
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className={`h-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-caption font-bold transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary"
                : "text-text-muted hover:text-text hover:bg-surface-alt"
            }`}
          >
            <Icon size={15} />
            <span>{tab.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
