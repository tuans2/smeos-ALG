"use client"

import { Button } from "@/components/ui/button"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { useEffect, useState } from "react"
import { History, ChevronRight } from "@/components/ui/icons"
import { customerOrderStatusLabel, type FamilyMember } from "@/modules/greeting-card/domain/order-family"
import { familyHref } from "./use-order-family"

const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`
const dateVi = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}/${m}/${y}` : iso
}

/** Nút "Lịch sử đơn hàng" + danh sách các đơn khách đã đặt từ cùng link; bấm một đơn để mở lại. */
export function OrderHistorySheet({ members, currentSendCode }: { members: FamilyMember[]; currentSendCode: string }) {
  const [open, setOpen] = useState(false)
  const orderCount = members.filter((m) => m.order).length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Mới nhất lên đầu
  const list = [...members].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <>
      <div className="flex justify-end px-4 pt-3 sm:px-6">
        <Button variant="outline"
          type="button"
          onClick={() => setOpen(true)}
          className="py-0 inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-body-sm font-semibold text-text hover:bg-surface-alt"
        >
          <History size={16} aria-hidden="true" />
          Lịch sử đơn hàng ({orderCount})
        </Button>
      </div>

      {open && (
        <BottomSheet open onOpenChange={(o) => { if (!o) setOpen(false) }}
          title="Lịch sử đơn hàng">
          <div className="-m-5">
            <ul className="flex flex-col divide-y divide-border">
              {list.map((m) => {
                const current = m.sendCode === currentSendCode
                const body = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text">{m.order ? `Đơn ${m.order.code}` : "Đơn đang đặt dở"}</span>
                        {current && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary">Đang xem</span>}
                      </div>
                      {m.productName && <div className="truncate text-body-sm text-text-muted">{m.productName}</div>}
                      <div className="text-caption text-text-muted">
                        {customerOrderStatusLabel(m)}
                        {m.order?.deliveryDate ? ` · Giao ${dateVi(m.order.deliveryDate)}` : ""}
                        {m.order && m.order.totalVnd > 0 ? ` · ${vnd(m.order.totalVnd)}` : ""}
                      </div>
                      {!m.available && <div className="text-caption text-warning-text">Link đã hết hạn</div>}
                    </div>
                    {!current && m.available && <ChevronRight size={18} className="shrink-0 text-text-muted" aria-hidden="true" />}
                  </>
                )
                return (
                  <li key={m.sendCode}>
                    {current || !m.available ? (
                      <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                    ) : (
                      // Tải hẳn trang đích: mỗi đơn là một trang riêng, khách chủ động chọn → không tự chuyển đi
                      <a href={familyHref(m.sendCode)} className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-surface-alt">{body}</a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
