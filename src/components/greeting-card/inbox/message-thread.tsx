"use client"

import { Button } from "@/components/ui/button"
import React, { useEffect, useRef, useState } from "react"
import { CornerUpLeft } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import type { ThreadMessageView } from "@/modules/greeting-card/use-cases/internal-messages"
import { MessageComposer } from "./message-composer"
import { DiscountDecision } from "./discount-decision"
import { CancellationDecision } from "./cancellation-decision"
import { Sheet } from "./sheet"
import { timeAgo } from "./use-inbox"

interface Props {
  target: { orderId?: string | null | undefined; sessionId?: string | null | undefined }
  /** Bước đang mở (tin mới gắn vào bước này). */
  stepKey?: string | undefined
  title?: string | undefined
  onClose: () => void
  /** Hiện nút quay lại thay cho đóng hẳn (khi mở từ Hộp việc). */
  onBack?: (() => void) | undefined
  onChanged?: (() => void) | undefined
}

/** Trao đổi nội bộ của một đơn: ai nhắn ai, ở bước nào; trả lời đi thẳng về người đã nhắn. */
export function MessageThread({ target, stepKey = "GENERAL", title, onClose, onBack, onChanged }: Props) {
  const key = target.orderId ? `orderId=${target.orderId}` : `sessionId=${target.sessionId}`
  const thread = useApi<{ data: { label: string; ownerSaleName: string | null; maxDiscountPercent: number; canDecideDiscount: boolean; messages: ThreadMessageView[] } }>(
    `/api/v1/greeting-card/messages?${key}`, { refreshInterval: 15_000 })
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string } | null>(null)
  const [now] = useState(() => Date.now())
  const endRef = useRef<HTMLDivElement>(null)
  const messages = thread.data?.data.messages ?? []
  const unreadIds = messages.filter((m) => m.unread).map((m) => m.id).join(",")

  // Mở trao đổi = đã đọc các tin gửi cho mình (đồng bộ mọi thiết bị)
  const sentRead = useRef("")
  useEffect(() => {
    if (!unreadIds || sentRead.current === unreadIds) return
    sentRead.current = unreadIds
    void apiSend("/api/v1/greeting-card/messages/read", "POST", { messageIds: unreadIds.split(",") }, "")
      .then(() => { void thread.mutate(); onChanged?.() }, () => { sentRead.current = "" })
  }, [unreadIds, onChanged, thread])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  return (
    <Sheet
      labelId="message-thread-title"
      title={title ?? thread.data?.data.label ?? "Trao đổi nội bộ"}
      onClose={onClose}
      leading={onBack && (
        <Button variant="ghost" type="button" onClick={onBack} className="py-0 gap-0 inline-flex h-11 items-center rounded-full px-3 text-body-sm font-bold text-primary hover:bg-surface-alt">
          ‹ Hộp việc
        </Button>
      )}
      footer={<MessageComposer target={target} stepKey={stepKey} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSent={() => { void thread.mutate(); onChanged?.() }} />}
    >
      <div className="flex flex-col gap-3 p-3" aria-live="polite">
        {thread.data?.data.ownerSaleName && <p className="text-center text-caption text-text-muted">Sale phụ trách: {thread.data.data.ownerSaleName}</p>}
        {thread.error ? (
          <p role="alert" className="rounded-xl bg-danger-bg p-3 text-body-sm text-danger">{(thread.error as Error).message}</p>
        ) : thread.isLoading ? (
          [0, 1, 2].map((i) => <div key={i} className={`h-16 w-3/4 animate-pulse motion-reduce:animate-none rounded-2xl bg-surface-alt ${i % 2 ? "self-end" : ""}`} />)
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-body-sm text-text-muted">Chưa có trao đổi nào. Chọn người nhận và gửi tin đầu tiên bên dưới.</p>
        ) : (
          messages.map((m) => (
            <article key={m.id} className={`flex max-w-[85%] flex-col gap-1 ${m.mine ? "self-end items-end" : "self-start"}`}>
              <p className="text-caption text-text-muted">
                <strong className="text-text">{m.mine ? "Bạn" : m.senderName}</strong> · {m.senderRoleLabel}
                {m.toLabel && <> → {m.toLabel}</>} · {timeAgo(m.createdAt, now)}
              </p>
              <div className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-body ${
                m.mine ? "bg-primary text-white" : m.unread ? "border border-primary/40 bg-primary/5 text-text" : "bg-surface text-text border border-border"
              }`}>
                {m.discount && (
                  <p className={`mb-1 text-body-sm font-extrabold ${m.mine ? "text-white" : "text-text"}`}>
                    {m.kind === "DISCOUNT_REQUEST" ? `Xin giảm ${m.discount.label}` : m.discount.status === "APPROVED"
                      ? `Đã duyệt giảm ${(m.discount.approvedVnd ?? 0).toLocaleString("vi-VN")}đ` : "Không duyệt giảm giá"}
                  </p>
                )}
                {m.body}
              </div>
              {m.kind === "DISCOUNT_REQUEST" && m.discount && (
                m.discount.status === "PENDING" && thread.data?.data.canDecideDiscount ? (
                  <div className="w-full min-w-72 rounded-2xl border border-border bg-surface p-3">
                    <DiscountDecision requestId={m.discount.requestId} baseTotalVnd={m.discount.baseTotalVnd} requestedVnd={m.discount.requestedVnd}
                      percent={m.discount.percent} maxPercent={thread.data.data.maxDiscountPercent}
                      onDone={() => { void thread.mutate(); onChanged?.() }} />
                  </div>
                ) : (
                  <span className={`rounded-full px-2 text-caption font-bold ${
                    m.discount.status === "APPROVED" ? "bg-success-bg text-success" : m.discount.status === "REJECTED" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning-text"
                  }`}>
                    {m.discount.status === "APPROVED" ? "Đã duyệt" : m.discount.status === "REJECTED" ? "Không duyệt" : "Chờ Điều hành duyệt"}
                  </span>
                )
              )}

              {/* Đề xuất Hủy / Hoàn tiền (Task #1) */}
              {m.kind === "CANCELLATION_REQUEST" && m.cancellation && (
                m.cancellation.status === "PENDING" && (thread.data?.data as unknown as { canDecideCancellation?: boolean })?.canDecideCancellation ? (
                  <div className="w-full min-w-72 rounded-2xl border border-border bg-surface p-3">
                    <CancellationDecision
                      requestId={m.cancellation.requestId}
                      type={m.cancellation.type}
                      refundAmountVnd={m.cancellation.refundAmountVnd}
                      reason={m.cancellation.reason}
                      onDone={() => { void thread.mutate(); onChanged?.() }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 rounded-xl bg-surface p-2.5 border border-border">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-caption font-bold ${
                        m.cancellation.status === "APPROVED"
                          ? "bg-success-bg text-success"
                          : m.cancellation.status === "REJECTED"
                          ? "bg-danger-bg text-danger"
                          : "bg-warning-bg text-warning-text"
                      }`}>
                        {m.cancellation.status === "APPROVED"
                          ? "Đã duyệt hủy/hoàn"
                          : m.cancellation.status === "REJECTED"
                          ? "Từ chối"
                          : "Chờ Điều hành duyệt"}
                      </span>
                      {m.cancellation.refundAmountVnd > 0 && (
                        <span className="text-caption font-mono font-bold text-danger">
                          Hoàn {m.cancellation.refundAmountVnd.toLocaleString("vi-VN")}đ
                        </span>
                      )}
                    </div>
                    {m.cancellation.note && (
                      <p className="text-caption text-text-muted">Phản hồi: {m.cancellation.note}</p>
                    )}
                  </div>
                )
              )}
              <div className="flex items-center gap-2">
                {m.stepKey !== "GENERAL" && <span className="rounded-full bg-surface-alt px-2 text-caption text-text-muted">{m.stepTitle}</span>}
                {!m.mine && m.kind === "MESSAGE" && (
                  <Button variant="ghost" type="button" onClick={() => setReplyTo({ id: m.id, senderName: m.senderName })}
                    className="py-0 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-caption font-bold text-primary hover:bg-primary/10">
                    <CornerUpLeft size={13} aria-hidden="true" /> Trả lời
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>
    </Sheet>
  )
}
