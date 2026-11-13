"use client"

import { BrochureVisibilitySettings } from "./brochure-visibility-settings"
import { BrochureDiscountSettings } from "./brochure-discount-settings"
import { BrochureDefaultOwnerSettings } from "./brochure-default-owner-settings"
import { BrochureShippingSettings } from "./brochure-shipping-settings"
import { BrochureHolidaySettings } from "./brochure-holiday-settings"
import { CraftStyleFeeSettings } from "./craft-style-fee-settings"
import { CraftFeeSettings } from "./craft-fee-settings"
import { ChainDispatchSettings } from "./chain-dispatch-settings"
import { ZaloDispatchConnector } from "./zalo-dispatch-connector"
import { useSession } from "@/lib/session"
import { isChainOrganizationType } from "@/modules/greeting-card/domain/brochure-workflow-policy"

/**
 * Cài đặt tiệm → tab 8, phần bán hàng của Thẻ Chào: Sale được xem khách nào (5.8), giảm giá tối đa (3.7), người phụ trách link
 * cũ, khu vực và phí giao (3.2), ngày lễ — phụ phí và số đơn tối đa (1.8, 4.21), phí chế tác theo kiểu dáng (3.6), điều phối chuỗi.
 * Tài khoản nhận tiền và mức cọc nằm ở tab 3–4; đối soát ngân hàng và thông báo khách ở màn Tích hợp.
 */
export function BrochureCommerceSettings() {
  const isChain = isChainOrganizationType(useSession().organizationType)
  return (
    <div className="flex flex-col gap-4">
      <BrochureVisibilitySettings />
      <BrochureDiscountSettings />
      <BrochureDefaultOwnerSettings />
      <BrochureShippingSettings />
      <BrochureHolidaySettings />
      <CraftStyleFeeSettings />
      <CraftFeeSettings />
      {isChain && <ChainDispatchSettings />}
      {isChain && <ZaloDispatchConnector />}
    </div>
  )
}
