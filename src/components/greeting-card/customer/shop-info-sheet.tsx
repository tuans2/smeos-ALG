"use client"

import { Button } from "@/components/ui/button"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import React, { useState } from "react"
import { ChevronDown, Globe, Mail, MapPin, Phone, ShieldCheck } from "@/components/ui/icons"
import { websiteLabel, type ShopContact } from "@/modules/greeting-card/domain/shop-contact"

/** Sự kiện mở khung từ nơi khác trên trang (vd. "Xem cam kết của cửa hàng" ở bước xác nhận đơn). */
export const SHOP_INFO_EVENT = "alg:shop-info"
export type ShopInfoSection = "info" | "commitments"

export function openShopInfo(section: ShopInfoSection = "info"): void {
  window.dispatchEvent(new CustomEvent<ShopInfoSection>(SHOP_INFO_EVENT, { detail: section }))
}

export function ShopLogo({ shop, size = "h-9 w-9" }: { shop: ShopContact; size?: string }) {
  return shop.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shop.logoUrl} alt="" className={`${size} shrink-0 rounded-full border border-border object-cover`} />
  ) : (
    // Chữ cái đầu vẽ bằng ::before để không lẫn vào chữ hiển thị của nút chứa nó (nhãn truy cập phải chứa chữ nhìn thấy)
    <span aria-hidden="true" data-initial={shop.name.trim().charAt(0).toUpperCase()} className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-body font-bold text-primary before:content-[attr(data-initial)]`} />
  )
}

function Line({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 items-start gap-3 py-2 text-body-sm text-text">
      <Icon size={18} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </li>
  )
}

/**
 * Khung "Thông tin cửa hàng" mở khi khách chạm tên/logo ở thanh trên cùng (PO 08/10/2026): tên,
 * logo, hotline (chỉ hiển thị, không bấm gọi), email, website, mạng xã hội, địa chỉ và nút xem
 * Cam kết của cửa hàng. Ô tiệm chưa khai thì ẩn.
 */
export function ShopInfoSheet({ shop, section, onClose }: { shop: ShopContact; section: ShopInfoSection; onClose: () => void }) {
  return (
    <BottomSheet open onOpenChange={(o) => { if (!o) onClose() }}
      title={<span className="flex items-center gap-3"><ShopLogo shop={shop} size="h-10 w-10" /><span className="min-w-0 truncate">{shop.name}</span></span>}>
      <ShopInfoContent shop={shop} section={section} />
    </BottomSheet>
  )
}

/** Nội dung khung "Thông tin cửa hàng" — tách khỏi `BottomSheet` để kiểm bằng render tĩnh. */
export function ShopInfoContent({ shop, section }: { shop: ShopContact; section: ShopInfoSection }) {
  const [showCommitments, setShowCommitments] = useState(section === "commitments")
  const commitments = shop.commitments ?? []
  const links = [...(shop.websites ?? []).map((url) => ({ label: websiteLabel(url), url })), ...(shop.socialLinks ?? [])]

  return (
      <div className="flex flex-col">
        <ul className="divide-y divide-border">
          {shop.phone && (
            <Line icon={Phone}>
              <span className="text-caption text-text-muted">Hotline</span>
              <p className="font-bold tracking-wide">{shop.phone}</p>
            </Line>
          )}
          {shop.email && (
            <Line icon={Mail}>
              <span className="text-caption text-text-muted">Email</span>
              <p className="font-semibold">{shop.email}</p>
            </Line>
          )}
          {links.length > 0 && (
            <Line icon={Globe}>
              <span className="text-caption text-text-muted">{links.length > 1 ? "Website & mạng xã hội" : "Website"}</span>
              <div className="flex flex-col gap-1">
                {links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary underline-offset-2 hover:underline">
                    {l.label}
                  </a>
                ))}
              </div>
            </Line>
          )}
          {shop.address && (
            <Line icon={MapPin}>
              <span className="text-caption text-text-muted">Địa chỉ</span>
              <p>{shop.address}</p>
            </Line>
          )}
        </ul>

        {commitments.length > 0 && (
          <div className="mt-3 rounded-2xl border border-success/20 bg-success/5">
            <Button variant="ghost" type="button" aria-expanded={showCommitments} onClick={() => setShowCommitments((v) => !v)}
              className="py-0 justify-start flex min-h-12 w-full items-center gap-2 px-4 text-left text-body-sm font-extrabold text-success">
              <ShieldCheck size={18} aria-hidden="true" />
              <span className="flex-1">Cam kết của cửa hàng ({commitments.length})</span>
              <ChevronDown size={18} aria-hidden="true" className={`transition-transform ${showCommitments ? "rotate-180" : ""}`} />
            </Button>
            {showCommitments && (
              <ul className="flex flex-col gap-2 px-4 pb-4 text-body-sm text-text-muted">
                {commitments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className="font-bold text-success" aria-hidden="true">✓</span>
                    <span><strong className="text-text">{c.title}:</strong> {c.customerText}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
  )
}
