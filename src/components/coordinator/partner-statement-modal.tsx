"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { StatTile } from "@/components/ui/stat-tile"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { formatCurrency, formatDate } from "@/lib/i18n/formatters"
import { SETTLEMENT_STATUS_LABEL, type SettlementStatusCode } from "@/modules/coordinator/domain/partner-payout"
import { vnDate } from "@/modules/reporting/domain/report-period"

/**
 * Bảng kê & quyết toán tiền công đối tác (PO 12/11/2026, audit BL-22) — thay "Sổ đối soát" chạy bằng dữ liệu mẫu.
 * Bảng kê đọc đơn đối tác đã đóng trong kỳ, tiền công ghi lúc đóng đơn; lập sổ chụp bảng kê rồi đi qua
 * Chờ đối soát → Đã đối soát → Đã thanh toán. Máy chủ kiểm quyền, kỳ trùng và đơn thiếu tiền công.
 */

interface StatementLine { orderId: string; code: string; closedAt: string; payoutVnd: number | null }
interface Settlement { id: string; from: string; to: string; status: string; orderCount: number; totalPayoutVnd: number; paymentReference: string | null }
interface Statement {
  orderCount: number
  totalPayoutVnd: number
  missingPayoutCount: number
  lines: StatementLine[]
  settlements: Settlement[]
}

export interface PartnerStatementModalProps {
  partner: { id: string; name: string } | null
  onClose: () => void
}

const statusLabel = (s: string) => SETTLEMENT_STATUS_LABEL[s as SettlementStatusCode] ?? s

export function PartnerStatementModal({ partner, onClose }: PartnerStatementModalProps) {
  const today = vnDate(new Date())
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`)
  const [to, setTo] = useState(today)
  const [showLines, setShowLines] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reference, setReference] = useState<Record<string, string>>({})
  const url = partner ? `/api/v1/coordinator/partners/${partner.id}/statement?from=${from}&to=${to}` : null
  const { data, error, isLoading, mutate } = useApi<{ data: Statement }>(url)
  const st = data?.data

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setActionError(null)
    try {
      await action()
      await mutate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Thao tác không thành công")
    } finally {
      setBusy(null)
    }
  }

  if (!partner) return null
  const base = `/api/v1/coordinator/partner-settlements`

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }} size="lg" title={`Bảng kê tiền công — ${partner.name}`}
      description="Tiền công lấy từ phí gia công đã chốt (sau khấu trừ) hoặc giá thoả thuận, ghi lúc đóng đơn">
      <div className="flex flex-col gap-4 text-caption">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-semibold text-text">Từ ngày
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-8" />
          </label>
          <label className="flex flex-col gap-1 font-semibold text-text">Đến ngày
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-8" />
          </label>
        </div>

        {error ? <InlineError message={error instanceof Error ? error.message : "Không tải được bảng kê"} onRetry={() => void mutate()} />
          : isLoading || !st ? <SkeletonBlock lines={3} label="Đang tải bảng kê" />
          : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile label="Đơn đã đóng" value={String(st.orderCount)} />
                <StatTile label="Tổng tiền công" value={formatCurrency(st.totalPayoutVnd)} />
                <StatTile label="Đơn chưa ghi tiền công" value={String(st.missingPayoutCount)} tip="Bổ sung tiền công trước khi lập sổ quyết toán" />
              </div>

              {st.lines.length > 0 && (
                <div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowLines((v) => !v)}>
                    {showLines ? "Ẩn danh sách đơn" : `Xem ${st.lines.length} đơn`}
                  </Button>
                  {showLines && (
                    <table className="mt-2 w-full text-left">
                      <caption className="sr-only">Đơn đã đóng trong kỳ</caption>
                      <thead className="text-text-muted"><tr><th scope="col" className="py-1">Mã đơn</th><th scope="col">Ngày đóng</th><th scope="col" className="text-right">Tiền công</th></tr></thead>
                      <tbody className="divide-y divide-border text-text">
                        {st.lines.map((l) => (
                          <tr key={l.orderId}>
                            <td className="py-1">{l.code}</td><td>{formatDate(new Date(l.closedAt))}</td>
                            <td className="text-right">{l.payoutVnd === null ? "Chưa ghi" : formatCurrency(l.payoutVnd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              <Button type="button" size="sm" disabled={busy !== null || st.orderCount === 0 || st.missingPayoutCount > 0}
                onClick={() => run("create", () => apiSend(`/api/v1/coordinator/partners/${partner.id}/settlements`, "POST", { from, to }, "Không lập được sổ quyết toán"))}>
                {busy === "create" ? "Đang lập sổ…" : "Lập sổ quyết toán kỳ này"}
              </Button>

              <div className="flex flex-col gap-2">
                <h4 className="text-body-sm font-bold text-text">Sổ quyết toán đã lập</h4>
                {st.settlements.length === 0 ? <p className="text-text-muted">Chưa có sổ nào cho đối tác này.</p> : st.settlements.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <div>
                      <div className="font-semibold text-text">{formatDate(new Date(`${s.from}T00:00:00+07:00`))} – {formatDate(new Date(`${s.to}T00:00:00+07:00`))}</div>
                      <div className="text-text-muted">{s.orderCount} đơn · {formatCurrency(s.totalPayoutVnd)} · {statusLabel(s.status)}{s.paymentReference ? ` · ${s.paymentReference}` : ""}</div>
                    </div>
                    {s.status === "PENDING" && (
                      <Button type="button" variant="outline" size="sm" disabled={busy !== null}
                        onClick={() => run(s.id, () => apiSend(`${base}/${s.id}/reconcile`, "POST", undefined, "Không xác nhận được đối soát"))}>
                        Xác nhận đã đối soát
                      </Button>
                    )}
                    {s.status === "RECONCILED" && (
                      <div className="flex items-center gap-2">
                        <Input value={reference[s.id] ?? ""} onChange={(e) => setReference((r) => ({ ...r, [s.id]: e.target.value }))}
                          placeholder="Mã phiếu chi / giao dịch" aria-label="Mã phiếu chi hoặc giao dịch" className="h-8 w-44" />
                        <Button type="button" variant="outline" size="sm" disabled={busy !== null}
                          onClick={() => run(s.id, () => apiSend(`${base}/${s.id}/pay`, "POST", { payment_reference: reference[s.id]?.trim() || undefined }, "Không ghi được đã thanh toán"))}>
                          Ghi đã thanh toán
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        {actionError && <div role="alert" className="rounded-lg border border-danger-border bg-danger-bg p-2.5 font-semibold text-danger-text">{actionError}</div>}
      </div>
    </Dialog>
  )
}
