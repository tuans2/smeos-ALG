"use client"

import React from "react"
import { Clock } from "@/components/ui/icon-set/clock"
import { Printer } from "@/components/ui/icon-set/printer"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Layers } from "@/components/ui/icon-set/layers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { FlowerBomItem, FoliageBomItem, WrappingLayer, AccessoryBomItem } from "@/modules/products/domain/product-master-index"
import type { VisibleCustomField } from "@/components/coordinator/custom-fields-section"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

export interface PartnerProductionCardProps {
  orderCode: string
  recipeTitle: string
  targetReadyTime: string
  sampleImageUrl?: string | null | undefined
  flowers: FlowerBomItem[]
  foliage?: FoliageBomItem[] | undefined
  wrapping?: WrappingLayer[] | undefined
  accessories?: AccessoryBomItem[] | undefined
  cardMessage?: string | null | undefined
  /**
   * Chỉ dẫn điều phối viên ghi RIÊNG cho đối tác lúc phân công (T06,
   * `order_coordinations.metadata.partnerInstruction`). ĐP-1.7 (26/09/2026):
   * trước bản này khối này hiện `internalNote` — ghi chú NỘI BỘ của điều phối,
   * không phải nội dung dành cho đối tác — nên đổi tên và đổi nguồn cho khớp.
   */
  partnerInstruction?: string | null | undefined
  partnerName?: string | undefined
  /** ĐP-3.16 (26/09/2026): trường tự tạo (entity ORDER) đã lọc theo đối tượng PARTNER — xem `partner-product-card.tsx`. */
  customFields?: VisibleCustomField[] | undefined
  onMarkReady?: () => void
  onPrint?: () => void
}

export function PartnerProductionCard({
  orderCode,
  recipeTitle,
  targetReadyTime,
  sampleImageUrl,
  flowers,
  foliage = [],
  wrapping = [],
  accessories = [],
  cardMessage,
  partnerInstruction,
  partnerName,
  customFields = [],
  onMarkReady,
  onPrint,
}: PartnerProductionCardProps) {
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  return (
    <Card className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-text-muted">
            Lệnh {ti.makerAction} & Phiếu Xưởng
          </div>
          <h3 className="text-title-sm font-extrabold text-text">
            Đơn #{orderCode}: {recipeTitle}
          </h3>
          {partnerName && (
            <div className="text-caption text-text-muted mt-0.5">Đối tác / {ti.makerTitle}: <strong className="text-text">{partnerName}</strong></div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone="danger" className="gap-1 font-bold px-3 py-1 text-caption">
            <Clock size={13} />
            Hạn {ti.makerAction} xong: {targetReadyTime}
          </Badge>
          {onPrint && (
            <Button variant="ghost" size="sm" onClick={onPrint} className="h-7 text-caption gap-1 text-text-muted">
              <Printer size={12} />
              In phiếu xưởng
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sampleImageUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-caption font-bold text-text-muted">ẢNH MẪU THAM CHIẾU</span>
            <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-border bg-surface-alt">
              <img src={sampleImageUrl} alt={`Mẫu ${ti.sampleProduct}`} className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        <div className={sampleImageUrl ? "md:col-span-2 flex flex-col gap-4" : "md:col-span-3 flex flex-col gap-4"}>
          <div>
            <div className="text-caption font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-danger-text" />
              <span>CÔNG THỨC & ĐỊNH LƯỢNG CHI TIẾT</span>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-caption">
                <thead className="bg-surface-alt border-b border-border text-text-muted font-bold">
                  <tr>
                    <th className="px-3 py-2">Tên vật tư / nguyên liệu</th>
                    <th className="px-3 py-2">Số lượng</th>
                    <th className="px-3 py-2">Màu sắc / Tông</th>
                    <th className="px-3 py-2">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {flowers.map((f, i) => (
                    <tr key={i} className="hover:bg-surface-alt/40">
                      <td className="px-3 py-2 font-bold text-text">
                        {f.flowerName}
                        {f.variety && <span className="text-caption font-medium text-text-muted"> · {f.variety}</span>}
                        {typeof f.budCount === "number" && f.budCount > 0 && (
                          <span className="ml-1.5 px-1 py-0 rounded bg-warning-bg text-warning-text text-caption font-bold align-middle">
                            {f.budCount} nụ chưa nở
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-primary font-extrabold">
                        {f.quantity} {f.unit}
                        {typeof f.stemLengthCm === "number" && (
                          <span className="ml-1 text-caption font-medium text-text-muted">· dài {f.stemLengthCm}cm</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">
                        {f.color}
                        {f.shade && <span className="text-caption text-text-muted/80"> ({f.shade})</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-caption font-bold ${
                          f.role === "Chủ đạo"
                            ? "bg-primary-muted text-primary"
                            : f.role === "Điểm xuyến"
                            ? "bg-warning-bg text-warning-text"
                            : "bg-surface-alt text-text"
                        }`}>
                          {f.role}
                        </span>
                        {f.substitutionAllowed && (
                          <span className="ml-1 inline-block px-1 py-0.5 rounded bg-info-bg text-info-text text-caption font-bold">
                            Được thay{typeof f.substitutionPriority === "number" ? ` #${f.substitutionPriority}` : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(foliage.length > 0 || wrapping.length > 0 || accessories.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-caption">
              {foliage.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-alt border border-border/60">
                  <span className="font-bold text-text block mb-1">🌿 Lá & Cành đệm:</span>
                  <div className="text-text-muted space-y-0.5">
                    {foliage.map((fol, i) => (
                      <div key={i}>
                        • {fol.name} ({fol.role})
                        {fol.substitutionAllowed && <span className="text-info-text"> · được thay thế</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {wrapping.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-alt border border-border/60">
                  <span className="font-bold text-text block mb-1">🎁 Giấy gói & Nơ ({wrapping.length} lớp):</span>
                  <div className="text-text-muted space-y-0.5">
                    {wrapping.map((w, i) => (
                      <div key={i}>
                        • {w.layer}: {w.material} - {w.color}
                        {w.pattern && ` (${w.pattern})`}
                        {typeof w.quantity === "number" && ` · SL ${w.quantity}`}
                        {w.substitutionAllowed && <span className="text-info-text"> · được thay thế</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {accessories.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-alt border border-border/60">
                  <span className="font-bold text-text block mb-1">✨ Phụ kiện:</span>
                  <div className="text-text-muted space-y-0.5">
                    {accessories.map((a, i) => (
                      <div key={i}>
                        • {a.name} ({a.material}, {a.color}){a.unit ? ` · ${a.quantity ?? ""}${a.unit}` : ""}{a.printedText ? ` — "${a.printedText}"` : ""}
                        {a.substitutionAllowed && <span className="text-info-text"> · được thay thế</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {cardMessage && (
            <div className="p-3.5 rounded-xl bg-primary-muted/70 border border-primary-border text-caption">
              <div className="font-bold text-primary flex items-center gap-1.5 mb-1">
                <MessageSquare size={13} className="text-primary" />
                <span>Nội dung thiệp chúc mừng (In nguyên văn):</span>
              </div>
              <p className="text-primary font-medium italic">&ldquo;{cardMessage}&rdquo;</p>
            </div>
          )}

          {customFields.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-alt border border-border/60 text-caption">
              <div className="font-bold text-text-muted uppercase text-caption mb-1">Thông tin bổ sung</div>
              <div className="space-y-0.5 text-text">
                {customFields.map((f) => (
                  <div key={f.key}>
                    <span className="font-semibold">{f.label}:</span> {String(f.value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-dashed border-border">
        <div className="text-caption text-text-muted">
          {partnerInstruction && <span>Lưu ý thợ: <strong>{partnerInstruction}</strong></span>}
        </div>
        {onMarkReady && (
          <Button onClick={onMarkReady} className="bg-success hover:bg-success-text text-white gap-1.5">
            <CheckCircle2 size={15} />
            <span>Hoàn tất {ti.makerAction} & Chuyển QC</span>
          </Button>
        )}
      </div>
    </Card>
  )
}
