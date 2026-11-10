"use client"

import React from "react"
import { Drawer } from "@/components/ui/drawer"
import { BrochureWorkflowSettings } from "./brochure-workflow-settings"
import { BrochureStepTimeoutSettings } from "./brochure-step-timeout-settings"
import { BrochureStepSlaSettings } from "./brochure-step-sla-settings"
import { BrochureLinkLifetimeSettings } from "./brochure-link-lifetime-settings"
import { BrochureVisibilitySettings } from "./brochure-visibility-settings"
import { BrochureDiscountSettings } from "./brochure-discount-settings"
import { BrochureDefaultOwnerSettings } from "./brochure-default-owner-settings"
import { BrochurePaymentSettings } from "./brochure-payment-settings"
import { BrochureBankSyncSettings } from "./brochure-bank-sync-settings"
import { BrochurePolicySettings } from "./brochure-policy-settings"
import { BrochureShippingSettings } from "./brochure-shipping-settings"
import { BrochureHolidaySettings } from "./brochure-holiday-settings"
import { CraftStyleFeeSettings } from "./craft-style-fee-settings"
import { BrochureNotifySettings } from "./brochure-notify-settings"
import { StaffNotifySettings } from "./staff-notify-settings"
import { ChainDispatchSettings } from "./chain-dispatch-settings"
import { CraftFeeSettings } from "./craft-fee-settings"
import { useSession } from "@/lib/session"
import { isChainOrganizationType } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { TelegramDispatchConnector } from "./telegram-dispatch-connector"
import { ZaloDispatchConnector } from "./zalo-dispatch-connector"

/** Ngăn Cài đặt của Điều hành — tách khỏi hộp việc để tab chỉ còn việc cần quyết. */
export function AdminSettingsDrawer({ onClose }: { onClose: () => void }) {
  const isChain = isChainOrganizationType(useSession().organizationType)

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }} size="lg" className="sm:max-w-3xl bg-bg" title="Cài đặt Bộ sưu tập riêng">
        <div className="flex flex-col gap-4">
          <BrochureWorkflowSettings />
          <BrochureStepTimeoutSettings />
          <BrochureLinkLifetimeSettings />
          <BrochureStepSlaSettings />
          <BrochureVisibilitySettings />
          <BrochureDiscountSettings />
          <BrochureDefaultOwnerSettings />
          <BrochurePaymentSettings />
          <BrochureBankSyncSettings />
          <BrochurePolicySettings />
          <BrochureShippingSettings />
          <BrochureHolidaySettings />
          <CraftStyleFeeSettings />
          <BrochureNotifySettings />
          <StaffNotifySettings />
          {isChain && <ChainDispatchSettings />}
          <CraftFeeSettings />
          <TelegramDispatchConnector />
          <ZaloDispatchConnector />
        </div>
    </Drawer>
  )
}
