"use client"

import React from "react"
import { Layers } from "@/components/ui/icon-set/layers"
import type { FlowerBomItem, FoliageBomItem, WrappingLayer, AccessoryBomItem } from "@/modules/products/domain/product-master-index"

export function formatAddress(addr: unknown): string {
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>
    if (typeof a.formattedAddress === "string" && a.formattedAddress) return a.formattedAddress
    return [a.street, a.ward, a.district, a.city].filter((v) => typeof v === "string" && Boolean(v)).join(", ")
  }
  return typeof addr === "string" ? addr : "Theo hướng dẫn của Điều phối"
}

export function maskPhoneNumber(phone?: string): string {
  if (!phone) return "—"
  const clean = phone.replace(/\s+/g, "")
  if (clean.length < 7) return clean
  return `${clean.slice(0, 4)}***${clean.slice(-3)}`
}

/** Nguyên phụ liệu cắm hoa của Thẻ Gia Công: bảng hoa chính + lá, giấy gói, phụ kiện. */
export function FloristJobBom({
  flowers,
  foliage,
  wrapping,
  accessories,
}: {
  flowers: FlowerBomItem[]
  foliage: FoliageBomItem[]
  wrapping: WrappingLayer[]
  accessories: AccessoryBomItem[]
}) {
  return (
    <>
    {/* BOM Flowers */}
    <div>
      <div className="text-caption font-bold text-[var(--avi-ink-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Layers size={13} className="text-[var(--avi-primary)]" />
        <span>DANH MỤC NGUYÊN PHỤ LIỆU & VẬT TƯ CHI TIẾT</span>
      </div>
      <div className="rounded-xl border border-[var(--avi-ink-08)] overflow-hidden">
        <table className="w-full text-left text-caption">
          <thead className="bg-[var(--avi-cream)] border-b border-[var(--avi-ink-08)] text-[var(--avi-ink-muted)] font-bold">
            <tr>
              <th className="px-3 py-2">Tên vật tư / nguyên liệu</th>
              <th className="px-3 py-2">Số lượng</th>
              <th className="px-3 py-2">Màu sắc / Phân loại</th>
              <th className="px-3 py-2">Vai trò</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--avi-ink-08)]">
            {flowers.map((f, i) => (
              <tr key={i} className="hover:bg-[var(--avi-cream)]">
                <td className="px-3 py-2 font-bold text-[var(--avi-ink)]">{f.flowerName}</td>
                <td className="px-3 py-2 text-[var(--avi-primary)] font-extrabold">
                  {f.quantity} {f.unit}
                </td>
                <td className="px-3 py-2 text-[var(--avi-ink-muted)]">{f.color}</td>
                <td className="px-3 py-2">
                  <span className="inline-block px-1.5 py-0.5 rounded text-caption font-bold bg-[var(--avi-sage-10)] text-[var(--avi-primary)]">
                    {f.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Foliage, Wrapping, Accessories */}
    {(foliage.length > 0 || wrapping.length > 0 || accessories.length > 0) && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-caption">
        {foliage.length > 0 && (
          <div className="p-2.5 rounded-xl bg-[var(--avi-sage-10)] border border-[var(--avi-sage-40)]">
            <span className="font-bold text-[var(--avi-ink)] block mb-1">🌿 Lá & cành đệm:</span>
            <div className="text-[var(--avi-ink-muted)] space-y-0.5 text-caption">
              {foliage.map((fol, i) => (
                <div key={i}>• {fol.name} ({fol.role})</div>
              ))}
            </div>
          </div>
        )}
        {wrapping.length > 0 && (
          <div className="p-2.5 rounded-xl bg-[var(--avi-blue-15)] border border-[var(--avi-blue)]/50">
            <span className="font-bold text-[var(--avi-blue-text)] block mb-1">🎁 Giấy gói & Nơ:</span>
            <div className="text-[var(--avi-blue-text)] space-y-0.5 text-caption">
              {wrapping.map((w, i) => (
                <div key={i}>• {w.layer}: {w.material} - {w.color}</div>
              ))}
            </div>
          </div>
        )}
        {accessories.length > 0 && (
          <div className="p-2.5 rounded-xl bg-[var(--avi-gold-10)] border border-[var(--avi-gold-30)]">
            <span className="font-bold text-[var(--avi-gold-text)] block mb-1">✨ Phụ kiện kèm:</span>
            <div className="text-[var(--avi-gold-text)] space-y-0.5 text-caption">
              {accessories.map((a, i) => (
                <div key={i}>• {a.name} ({a.material})</div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
    </>
  )
}
