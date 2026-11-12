"use client"

/** Thẻ một yêu cầu chờ Admin SaaS phê duyệt, kiểu dữ liệu và nội dung gửi API theo từng loại yêu cầu. */
import Link from "next/link"
import { Clock } from "@/components/ui/icon-set/clock"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Globe } from "@/components/ui/icon-set/globe"
import { Store } from "@/components/ui/icon-set/store"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/i18n/formatters"

export type PendingApprovalItem = {
  id: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  type: "LANGUAGE_UNLOCK" | "MODEL_CHANGE" | "PUBLIC_CHAT_LIMITS"
  requestedAt: string
  requestedBy?: string
  note?: string | null
  requestedLocales?: string[]
  requestedModelType?: string
  requestedLimits?: { perVisitor: number; perIp: number }
}

export type ApproveResult = { success: boolean; message: string }

export const TYPE_META: Record<
  PendingApprovalItem["type"],
  { label: string; tabLabel: string; icon: React.ReactNode; color: string; bg: string }
> = {
  LANGUAGE_UNLOCK: {
    label: "Mở khóa Ngôn ngữ Quốc tế",
    tabLabel: "Mở khóa Ngôn ngữ",
    icon: <Globe size={15} aria-hidden />,
    color: "text-primary",
    bg: "bg-primary/5 border-primary/30",
  },
  MODEL_CHANGE: {
    label: "Chuyển đổi Mô hình Cửa hàng",
    tabLabel: "Chuyển đổi Mô hình",
    icon: <Store size={15} aria-hidden />,
    color: "text-warning-text",
    bg: "bg-warning-bg border-warning/30",
  },
  PUBLIC_CHAT_LIMITS: {
    label: "Nâng hạn mức chat AI trên trang công khai",
    tabLabel: "Hạn mức chat",
    icon: <MessageCircle size={15} aria-hidden />,
    color: "text-primary",
    bg: "bg-primary/5 border-primary/30",
  },
}

function formatTime(iso: string) {
  return formatDateTime(iso)
}

export function ApprovalCard({
  item,
  onApprove,
  onReject,
  processing,
}: {
  item: PendingApprovalItem
  onApprove: (item: PendingApprovalItem) => void
  onReject: (item: PendingApprovalItem) => void
  processing: boolean
}) {
  const meta = TYPE_META[item.type]

  return (
    <Card
      className={`p-4 border rounded-2xl space-y-3 ${meta.bg}`}
      role="article"
      aria-label={`Yêu cầu ${meta.label} từ ${item.organizationName}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`${meta.color}`}>{meta.icon}</span>
          <span className={`text-body-sm font-bold ${meta.color}`}>{meta.label}</span>
        </div>
        <span className="flex items-center gap-1 text-caption text-text-muted shrink-0">
          <Clock size={12} aria-hidden />
          {formatTime(item.requestedAt)}
        </span>
      </div>

      {/* Thông tin tổ chức */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/van-hanh/to-chuc/${item.organizationId}` as never}
            className="text-body-sm font-semibold text-text hover:text-primary inline-flex items-center gap-1"
          >
            {item.organizationName}
            <ExternalLink size={11} aria-hidden />
          </Link>
          <span className="text-caption text-text-muted">@{item.organizationSlug}</span>
        </div>
      </div>

      {/* Chi tiết yêu cầu */}
      <div className="rounded-xl bg-surface border border-border p-3 space-y-1.5 text-caption">
        {item.type === "LANGUAGE_UNLOCK" && item.requestedLocales && (
          <div>
            <span className="text-text-muted">Gói ngôn ngữ yêu cầu: </span>
            <strong className="text-text">
              {item.requestedLocales
                .filter((l) => l !== "vi")
                .map((l) => (l === "en" ? "🇬🇧 Tiếng Anh (en)" : l))
                .join(", ")}
            </strong>
          </div>
        )}
        {item.type === "MODEL_CHANGE" && item.requestedModelType && (
          <div>
            <span className="text-text-muted">Chuyển sang: </span>
            <strong className="text-text">
              {item.requestedModelType === "CHAIN"
                ? "🏪 Chuỗi cửa hàng (CHAIN)"
                : "🏬 1 Cửa hàng độc lập (SINGLE)"}
            </strong>
          </div>
        )}
        {item.type === "PUBLIC_CHAT_LIMITS" && item.requestedLimits && (
          <div>
            <span className="text-text-muted">Mức xin nâng (mỗi 10 phút): </span>
            <strong className="text-text">
              {item.requestedLimits.perVisitor} tin/khách · {item.requestedLimits.perIp} tin/địa chỉ IP
            </strong>
          </div>
        )}
        {item.requestedBy && (
          <div>
            <span className="text-text-muted">Người gửi: </span>
            <span className="text-text">{item.requestedBy}</span>
          </div>
        )}
        {item.note && (
          <div>
            <span className="text-text-muted">Ghi chú: </span>
            <em className="text-text">&ldquo;{item.note}&rdquo;</em>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          id={`reject-${item.id}`}
          variant="danger"
          size="sm"
          disabled={processing}
          onClick={() => onReject(item)}
          className="inline-flex items-center gap-1.5 text-caption"
        >
          <XCircle size={13} aria-hidden />
          Từ chối
        </Button>
        <Button
          type="button"
          id={`approve-${item.id}`}
          size="sm"
          disabled={processing}
          onClick={() => onApprove(item)}
          className="gap-1.5 font-bold shadow-xs"
        >
          <CheckCircle2 size={13} aria-hidden />
          {processing ? "Đang xử lý…" : "Phê duyệt"}
        </Button>
      </div>
    </Card>
  )
}


/** Nội dung PATCH /platform/organizations/:id khi duyệt hoặc từ chối một yêu cầu. */
export function approvalRequestBody(item: PendingApprovalItem, decision: "approve" | "reject"): Record<string, unknown> {
  if (item.type === "PUBLIC_CHAT_LIMITS") return { public_chat_limits_decision: decision }
  if (decision === "reject") {
    return item.type === "LANGUAGE_UNLOCK" ? { clear_pending_language_unlock: true } : { clear_pending_model_change: true }
  }
  if (item.type === "LANGUAGE_UNLOCK") return { unlocked_locales: ["vi", ...(item.requestedLocales ?? [])] }
  return { target_type: item.requestedModelType, note: "Phê duyệt bởi Admin SaaS từ màn hình Phê duyệt" }
}
