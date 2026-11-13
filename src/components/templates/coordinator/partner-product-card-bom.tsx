"use client"

import React from "react"
import { Scissors } from "@/components/ui/icon-set/scissors"
import { Badge } from "@/components/ui/badge"
import type {
  AccessoryBomItem,
  FlowerBomItem,
  FoliageBomItem,
  WrappingLayer,
} from "@/modules/products/domain/product-master-index"

/** Phần con của `partner-product-card.tsx` (tách khi áp nhận diện ALG, theo đúng tiền lệ
 * `florist-job-bom.tsx` — giữ file chính dưới giới hạn 350 dòng). */
export function PartnerProductCardBom({
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
      {flowers.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[var(--avi-primary-05)] border border-[var(--avi-primary-15)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Scissors size={13} className="text-[var(--avi-primary)]" />
            <span className="text-caption font-extrabold text-[var(--avi-primary)] uppercase tracking-wide">
              Công Thức Cành Hoa
            </span>
            <Badge className="text-caption font-black ml-1 bg-[var(--avi-brick-10)] text-[var(--avi-brick)] border-[var(--avi-brick-25)]">
              {flowers.length} loại
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {flowers.map((fl, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[var(--avi-primary-10)] shadow-xs"
              >
                <span className="w-6 h-6 rounded-full bg-[var(--avi-primary-10)] text-[var(--avi-primary)] text-caption font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-caption font-bold text-[var(--avi-ink)] truncate flex items-center gap-1.5 flex-wrap">
                    <span>{fl.flowerName}</span>
                    {fl.shade && (
                      <span className="px-1 py-0 rounded bg-[var(--avi-cream)] text-[var(--avi-ink-muted)] text-caption font-bold">
                        {fl.shade}
                      </span>
                    )}
                    {typeof fl.budCount === "number" && fl.budCount > 0 && (
                      <span className="px-1 py-0 rounded bg-[var(--avi-gold-10)] text-[var(--avi-gold-text)] text-caption font-bold">
                        {fl.budCount} nụ chưa nở
                      </span>
                    )}
                  </div>
                  <div className="text-caption text-[var(--avi-ink-muted)] font-medium">
                    {fl.quantity} {fl.unit} • {fl.color}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ĐP-2.12 (26/09/2026): lá/gói/phụ kiện thật từ snapshot Master Index. */}
      {(foliage.length > 0 || wrapping.length > 0 || accessories.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-caption">
          {foliage.length > 0 && (
            <div className="p-2.5 rounded-lg bg-[var(--avi-sage-10)] border border-[var(--avi-sage-40)]">
              <span className="font-bold text-[var(--avi-ink)] block mb-1">🌿 Lá/cành đệm</span>
              <div className="text-[var(--avi-ink-muted)] space-y-0.5">
                {foliage.map((fol, i) => (
                  <div key={i}>• {fol.name} ({fol.role}){fol.quantity ? ` × ${fol.quantity} ${fol.unit}` : ""}</div>
                ))}
              </div>
            </div>
          )}
          {wrapping.length > 0 && (
            <div className="p-2.5 rounded-lg bg-[var(--avi-blue-15)] border border-[var(--avi-blue)]/50">
              <span className="font-bold text-[var(--avi-blue-text)] block mb-1">🎁 Gói ({wrapping.length} lớp)</span>
              <div className="text-[var(--avi-blue-text)] space-y-0.5">
                {wrapping.map((w, i) => (
                  <div key={i}>• {w.layer}: {w.material}, {w.color}</div>
                ))}
              </div>
            </div>
          )}
          {accessories.length > 0 && (
            <div className="p-2.5 rounded-lg bg-[var(--avi-gold-10)] border border-[var(--avi-gold-30)]">
              <span className="font-bold text-[var(--avi-gold-text)] block mb-1">✨ Phụ kiện</span>
              <div className="text-[var(--avi-gold-text)] space-y-0.5">
                {accessories.map((a, i) => (
                  <div key={i}>• {a.name} ({a.material}, {a.color}){a.printedText ? ` — "${a.printedText}"` : ""}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
