"use client"

import React, { useState } from "react"
import { markPersonalLinkCopied } from "@/components/greeting-card/share/tracked-copy"
import { Check, Copy, ExternalLink, Ban, Send } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { getSessionStatusBadge, SESSION_STATUS_BADGE, type SessionRow } from "./sales-types"
import { useI18n } from "@/lib/i18n"
import { formatDate as _formatDate } from "@/lib/i18n/formatters"

interface Props {
  sessions: SessionRow[]
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onChanged: () => void
  emptyState: React.ReactNode
}

const ACTION_BTN =
  "inline-flex items-center justify-center h-8 rounded-lg border border-border text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-40"

function formatDate(iso: string | null): string {
  return iso ? _formatDate(iso) : "Không hết hạn"
}

/** Bảng link đã gửi: trạng thái khách, hạn dùng, đơn, sao chép/thu hồi link. */
export function SalesSessionTable({ sessions, hasMore, isLoadingMore, onLoadMore, onChanged, emptyState }: Props) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const { ti } = useI18n()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function copyLink(code: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/b/${code}`)
    markPersonalLinkCopied(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function revoke(row: SessionRow) {
    const ok = await confirm({
      title: `Thu hồi link ${row.send_code}?`,
      consequence: "Khách mở link sẽ thấy link không còn hiệu lực.",
      confirmLabel: "Thu hồi link",
      tone: "danger",
    })
    if (!ok) return
    setRevokingId(row.id)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/send-links/${row.id}/revoke`, "POST", undefined, "Không thu hồi được link")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thu hồi được link")
    } finally {
      setRevokingId(null)
    }
  }

  if (sessions.length === 0) return <>{emptyState}</>

  return (
    <div className="flex flex-col">
      {error && <p role="alert" className="m-4 p-3 rounded-xl bg-danger-bg text-danger text-body-sm">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead className="bg-surface-alt text-text-muted text-caption uppercase border-b border-border">
            <tr>
              <th className="px-4 py-3">Mã gửi</th>
              <th className="px-4 py-3">{ti("catalogTitle")}</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đơn hàng</th>
              <th className="px-4 py-3 text-right">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((row) => {
              const badge = getSessionStatusBadge(row.status, ti("sampleProduct"))
              const active = row.link_state === "ACTIVE"
              return (
                <tr key={row.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-text">{row.send_code}</div>
                    <div className="text-caption text-text-muted">Hạn: {formatDate(row.expires_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-text font-medium">{row.catalog.name}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text">{row.customer_name || "Khách chưa đặt tên"}</div>
                    {row.customer_phone && <div className="text-caption text-text-muted">{row.customer_phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {row.link_state === "REVOKED" ? (
                      <span className="px-2.5 py-1 rounded-full text-caption font-bold bg-danger-bg text-danger">Đã thu hồi</span>
                    ) : row.link_state === "EXPIRED" ? (
                      <span className="px-2.5 py-1 rounded-full text-caption font-bold bg-surface-alt text-text-muted">Đã hết hạn</span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-caption font-bold ${badge.className}`}>{badge.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.order ? (
                      <div>
                        <div className="font-bold text-primary">{row.order.code}</div>
                        <div className="text-caption text-text-muted">{row.order.total_vnd.toLocaleString("vi-VN")} đ</div>
                      </div>
                    ) : (
                      <span className="text-caption text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <Button variant="ghost"
                        type="button"
                        disabled={!active}
                        onClick={() => copyLink(row.send_code)}
                        className={`py-0 h-auto ${ACTION_BTN} px-2.5 gap-1 text-caption font-semibold`}
                      >
                        {copiedCode === row.send_code ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                        <span>{copiedCode === row.send_code ? "Đã copy" : "Copy link"}</span>
                      </Button>
                      <a
                        href={`/b/${row.send_code}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Mở link ${row.send_code}`}
                        className={`${ACTION_BTN} w-8`}
                      >
                        <ExternalLink size={14} />
                      </a>
                      {active && !row.order_id && (
                        <Button variant="ghost"
                          type="button"
                          disabled={revokingId === row.id}
                          onClick={() => void revoke(row)}
                          aria-label={`Thu hồi link ${row.send_code}`}
                          title="Thu hồi link"
                          className={`text-[length:inherit] h-auto p-0 font-[inherit] gap-0 ${ACTION_BTN} w-8 text-danger`}
                        >
                          <Ban size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="p-3 border-t border-border flex justify-center">
          <Button type="button" variant="outline" size="sm" disabled={isLoadingMore} onClick={onLoadMore} className="gap-1.5">
            <Send size={14} />
            {isLoadingMore ? "Đang tải..." : "Tải thêm link"}
          </Button>
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
