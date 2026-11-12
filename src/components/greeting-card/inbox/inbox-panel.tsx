"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ChevronRight, MessageSquare } from "@/components/ui/icons"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import type { InboxAction, InboxTab } from "@/modules/greeting-card/domain/inbox"
import { Sheet } from "./sheet"
import { MessageThread } from "./message-thread"
import { timeAgo, useInbox, type InboxData } from "./use-inbox"
import { DiscountDecision } from "./discount-decision"
import { ChangeDecision } from "./change-decision"
import { CancellationFollowUp } from "./cancellation-follow-up"

type Group = "actions" | "messages" | "updates"
export interface InboxTarget { tab: InboxTab; orderId: string | null; sessionId: string | null }

const ROW = "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-alt min-h-16"

/** Hộp việc: một chỗ cho việc cần làm, tin nhắn và cập nhật — xử lý hoặc mở đúng đơn ngay. */
export function InboxPanel({ onClose, onOpenTarget }: { onClose: () => void; onOpenTarget: (t: InboxTarget) => void }) {
  const [roleOverride, setRoleOverride] = useState<"ADMIN" | "SALE" | "COORDINATOR" | undefined>(undefined)
  const inbox = useInbox(roleOverride)
  const data: InboxData | undefined = inbox.data?.data
  const [group, setGroup] = useState<Group>(() => (data && data.counts.actions === 0 && data.counts.unreadMessages > 0 ? "messages" : "actions"))
  const [thread, setThread] = useState<{ orderId: string | null; sessionId: string | null; title: string } | null>(null)
  const [now] = useState(() => Date.now())
  const tabs: Array<{ id: Group; label: string; count: number }> = [
    { id: "actions", label: "Cần làm", count: data?.counts.actions ?? 0 },
    { id: "messages", label: "Tin nhắn", count: data?.counts.unreadMessages ?? 0 },
    { id: "updates", label: "Cập nhật", count: data?.updates.length ?? 0 },
  ]
  const router = useRouter()
  const open = (a: { tab: InboxTab; orderId: string | null; sessionId: string | null; href?: string | undefined }) => {
    if (a.href) router.push(a.href as never)
    else onOpenTarget(a)
    onClose()
  }

  // Dùng ternary trong một return duy nhất — tránh Sheet mount/unmount không nhất quán
  // gây lỗi "destroy is not a function" khi switch giữa hai nhánh render
  if (thread) {
    return (
      <MessageThread target={thread} title={thread.title} onClose={onClose} onBack={() => setThread(null)} onChanged={() => void inbox.mutate()} />
    )
  }

  const roleLabel = data?.role === "ADMIN" ? "Điều hành" : data?.role === "SALE" ? "Sale" : "Điều phối"

  return (
    <Sheet labelId="inbox-title" title={`Hộp việc · ${roleLabel}`} onClose={onClose}>
      {data?.canSwitchRole && (
        <div className="flex items-center justify-between border-b border-border bg-surface-alt px-3 py-2 text-caption">
          <span className="font-semibold text-text-muted">Góc nhìn vai trò:</span>
          <div role="group" aria-label="Chọn vai xem hộp việc" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {[
              { id: "ADMIN" as const, label: "Điều hành" },
              { id: "SALE" as const, label: "Sale" },
              { id: "COORDINATOR" as const, label: "Điều phối" },
            ].map((r) => {
              const active = (roleOverride ?? data.role) === r.id
              return (
                <Button variant="ghost"
                  key={r.id}
                  type="button"
                  onClick={() => setRoleOverride(r.id)}
                  className={`h-auto gap-0 rounded-md px-2.5 py-1 text-caption font-bold transition-colors ${
                    active ? "bg-primary text-white shadow-xs hover:bg-primary" : "text-text-muted hover:text-text"
                  }`}
                >
                  {r.label}
                </Button>
              )
            })}
          </div>
        </div>
      )}
      <div role="tablist" aria-label="Nhóm trong Hộp việc" className="sticky top-0 z-10 grid grid-cols-3 gap-1 border-b border-border bg-surface p-2">
        {tabs.map((t) => (
          <Button variant="ghost" key={t.id} type="button" role="tab" aria-selected={group === t.id} onClick={() => setGroup(t.id)}
            className={`px-0 py-0 flex h-11 items-center justify-center gap-1.5 rounded-xl text-body-sm font-bold ${group === t.id ? "bg-primary text-white hover:bg-primary" : "text-text-muted hover:bg-surface-alt"}`}>
            {t.label}
            {t.count > 0 && <span className={`min-w-5 rounded-full px-1.5 text-caption ${group === t.id ? "bg-white/25" : "bg-danger text-white"}`}>{t.count}</span>}
          </Button>
        ))}
      </div>

      {inbox.error ? (
        <div role="alert" className="m-4 rounded-xl bg-danger-bg p-4 text-body-sm text-danger">
          {(inbox.error as Error).message}
          <Button variant="ghost" type="button" onClick={() => void inbox.mutate()} className="text-[length:inherit] h-auto p-0 gap-0 ml-2 font-bold underline">Thử lại</Button>
        </div>
      ) : !data ? (
        <div className="flex flex-col gap-2 p-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse motion-reduce:animate-none rounded-xl bg-surface-alt" />)}</div>
      ) : group === "actions" ? (
        data.actions.length === 0 ? <Empty text="Không có việc nào đang chờ bạn. Mọi đơn đều đúng tiến độ." /> : (
          <ul className="divide-y divide-border bg-surface">
            {data.actions.map((a) => <ActionRow key={a.id} action={a} onOpen={() => open(a)} onDecided={() => void inbox.mutate()}
              onMessage={a.orderId || a.sessionId ? () => setThread({ orderId: a.orderId, sessionId: a.sessionId, title: a.detail }) : undefined} />)}
          </ul>
        )
      ) : group === "messages" ? (
        data.threads.length === 0 ? <Empty text="Chưa có tin nhắn nào gửi cho bạn." /> : (
          <ul className="divide-y divide-border bg-surface">
            {data.threads.map((t) => (
              <li key={t.key}>
                <Button variant="ghost" type="button" className={`px-0 py-0 text-[length:inherit] h-auto justify-start font-[inherit] ${ROW}`} onClick={() => setThread({ orderId: t.orderId, sessionId: t.sessionId, title: t.title })}>
                  <MessageSquare size={20} className={t.unread ? "shrink-0 text-primary" : "shrink-0 text-text-muted"} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-body-sm ${t.unread ? "font-extrabold text-text" : "font-semibold text-text"}`}>{t.title}</span>
                    <span className="block truncate text-caption text-text-muted">{t.lastSender}: {t.lastBody}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-caption text-text-muted">{timeAgo(t.lastAt, now)}</span>
                    {t.unread > 0 && <span className="rounded-full bg-danger px-1.5 text-caption font-bold text-white" aria-label={`${t.unread} tin chưa đọc`}>{t.unread}</span>}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : data.updates.length === 0 ? <Empty text="Không có đơn nào đổi bước trong 24 giờ qua." /> : (
        <ul className="divide-y divide-border bg-surface">
          {data.updates.map((u) => (
            <li key={u.id}>
              <Button variant="ghost" type="button" className={`px-0 py-0 text-[length:inherit] h-auto justify-start font-[inherit] ${ROW}`} onClick={() => open({ tab: "tracking", orderId: u.orderId, sessionId: u.sessionId })}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-text">{u.customerName} — {u.title}</span>
                  <span className="block text-caption text-text-muted">{u.code} · {timeAgo(u.at, now)}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-text-muted" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

const ACTION_LABEL: Partial<Record<InboxAction["kind"], string>> = {
  PRODUCT_PROPOSALS: "Xem mẫu chờ duyệt",
  MISSING_INFO: "Bổ sung thông tin",
  CLAIM_ORDER: "Nhận đơn",
  REMIND_DEPOSIT: "Nhắc cọc",
  FOLLOW_UP_LEAD: "Tư vấn",
  REMIND_BALANCE_PAYMENT: "Nhắc thanh toán",
  SEND_PHOTO_QC: "Gửi ảnh hoa",
  DELIVERY_FAILED_SALE_CONTACT: "Liên hệ khách",
  ASSIGN: "Gán thợ",
  CHECK_ARRANGING_PROGRESS: "Xem tiến độ",
  QC_INSPECTION: "Kiểm tra QC",
  WAITING_SECOND_PAYMENT: "Xem đơn",
  ASSIGN_SHIPPER: "Gán shipper",
  REDELIVER: "Hẹn giao lại",
}

function ActionRow({ action, onOpen, onMessage, onDecided }: { action: InboxAction; onOpen: () => void; onMessage?: (() => void) | undefined; onDecided: () => void }) {
  const urgent =
    action.kind === "STUCK" ||
    action.kind === "UNMATCHED_PAYMENTS" ||
    action.kind === "CANCELLATION_REQUEST" ||
    action.kind === "CANCELLATION_FOLLOW_UP" ||
    action.kind === "DELIVERY_FAILED_SALE_CONTACT" ||
    action.kind === "REDELIVER"
  const [done, setDone] = useState<string | null>(null)
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        {action.imageUrl !== null || action.orderId ? (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border">
            <FlowerImage src={action.imageUrl} alt={action.customerName ?? "Sản phẩm"} sizes="48px" fallback="icon" className="h-full w-full" />
          </div>
        ) : (
          <AlertTriangle size={22} className="shrink-0 text-danger" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-body-sm font-extrabold ${urgent ? "text-danger" : "text-text"}`}>{action.title}</p>
          <p className="truncate text-caption text-text-muted">{[action.customerName, action.detail].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {action.discount && !done && (
        <div className="rounded-xl border border-border bg-surface-alt p-3">
          <DiscountDecision {...action.discount} onDone={(msg) => { setDone(msg); onDecided() }} />
        </div>
      )}
      {action.change && !done && (
        <div className="rounded-xl border border-border bg-surface-alt p-3">
          <ChangeDecision {...action.change} onDone={(msg) => { setDone(msg); onDecided() }} />
        </div>
      )}
      {action.followUp && !done && (
        <div className="rounded-xl border border-border bg-surface-alt p-3">
          <CancellationFollowUp {...action.followUp} onDone={(msg) => { setDone(msg); onDecided() }} />
        </div>
      )}
      {done && <p role="status" className="rounded-xl bg-success-bg px-3 py-2 text-body-sm text-success">{done}</p>}
      <div className="flex gap-2 pl-15">
        {!action.discount && !action.change && !action.followUp && (
          <Button variant="primary" type="button" onClick={onOpen} className="py-0 gap-0 h-11 flex-1 rounded-xl bg-primary px-3 text-body-sm font-bold text-white hover:bg-primary-dark sm:flex-none">
            {ACTION_LABEL[action.kind] ?? "Xử lý"}
          </Button>
        )}
        {onMessage && (
          <Button variant="outline" type="button" onClick={onMessage} className="py-0 gap-0 h-11 flex-1 rounded-xl border border-border px-3 text-body-sm font-bold text-text hover:bg-surface-alt sm:flex-none">
            Nhắn tin
          </Button>
        )}
      </div>
    </li>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-6 py-16 text-center text-body-sm text-text-muted">{text}</p>
}
