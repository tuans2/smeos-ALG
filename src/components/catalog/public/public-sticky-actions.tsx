"use client"

import React from "react"
import { MessageCircle, Phone, ShoppingBag } from "@/components/ui/icons"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { shopCallUrl, shopZaloUrl } from "./public-contact-links"
import type { PublicEntry } from "./public-entry"

interface PublicStickyActionsProps {
  shopName: string
  phone: string | null
  topic: string
  style: StyleDefinition
  /** Nút Đặt hàng / Liên hệ theo cài đặt Điều hành (Đơn hàng đa nguồn §3.2) */
  entry: PublicEntry
  /** id vùng sản phẩm — "Đặt hàng" cần chọn mẫu trước */
  productsAnchorId: string
}

/**
 * Thanh hành động cố định đáy màn hình di động (desktop đã có nút trên header).
 * Bật "Đặt hàng" → nút chính "Chọn mẫu để đặt hàng" (cuộn tới bộ sưu tập, đặt trong chi tiết mẫu);
 * bật "Liên hệ" và tiệm có số điện thoại → Nhắn Zalo + Gọi. Không còn nút nào → ẩn thanh.
 */
export function PublicStickyActions({ shopName, phone, topic, style, entry, productsAnchorId }: PublicStickyActionsProps) {
  const zalo = entry.contact ? shopZaloUrl(shopName, phone, topic) : null
  const call = entry.contact ? shopCallUrl(phone) : null
  if (!entry.order && !zalo) return null

  const primary = "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full text-body-sm font-semibold"
  const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-body-sm font-semibold"
  const primaryStyle = { backgroundColor: style.tokens.ctaBg, color: style.tokens.ctaText }
  const secondaryStyle = { borderColor: style.tokens.border, color: style.tokens.textPrimary }

  return (
    <nav
      aria-label="Thao tác nhanh"
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
      style={{ backgroundColor: style.tokens.surface, borderColor: style.tokens.border }}
    >
      <div className="mx-auto flex max-w-4xl gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {entry.order && (
          <a href={`#${productsAnchorId}`} className={primary} style={primaryStyle}>
            <ShoppingBag size={16} aria-hidden="true" />
            Chọn mẫu để đặt hàng
          </a>
        )}
        {zalo &&
          (entry.order ? (
            <a href={zalo} target="_blank" rel="noopener noreferrer" aria-label="Nhắn Zalo cho tiệm" className={secondary} style={secondaryStyle}>
              <MessageCircle size={16} aria-hidden="true" />
            </a>
          ) : (
            <a href={zalo} target="_blank" rel="noopener noreferrer" className={primary} style={primaryStyle}>
              <MessageCircle size={16} aria-hidden="true" />
              Nhắn Zalo đặt hoa
            </a>
          ))}
        {call && (
          <a href={call} aria-label={`Gọi ${shopName}`} className={secondary} style={secondaryStyle}>
            <Phone size={16} aria-hidden="true" />
            {!entry.order && "Gọi"}
          </a>
        )}
      </div>
    </nav>
  )
}
