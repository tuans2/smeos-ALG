import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Ban } from "@/components/ui/icon-set/ban"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  type TaskFailureKind,
  type TaskUiState,
  isTaskBusy,
  reportedProgress,
  taskStateLabel,
} from "@/lib/ui-system/task-state"

export interface TaskStatusProps {
  state: TaskUiState
  /** Tên việc đang làm, ví dụ "Dựng video" — ghép trước nhãn trạng thái. */
  title?: string | undefined
  /** Mô tả thêm bằng ngôn ngữ nghiệp vụ (lý do lỗi, bước hiện tại). */
  detail?: string | undefined
  /** Kết quả đã xong nhưng còn chờ duyệt. */
  needsReview?: boolean | undefined
  failureKind?: TaskFailureKind | undefined
  /** Chỉ truyền khi backend báo tiến độ thật — không truyền số ước lượng. */
  progress?: number | null | undefined
  elapsedSeconds?: number | undefined
  /** Mã hỗ trợ an toàn để người dùng báo CSKH (03c UX-020). */
  supportCode?: string | undefined
  onRetry?: (() => void) | undefined
  retryLabel?: string | undefined
  onCancel?: (() => void) | undefined
  className?: string | undefined
}

const TONE: Record<TaskUiState, string> = {
  idle: "border-border bg-surface text-text-muted",
  validating: "border-info-border bg-info-bg text-info-text",
  submitting: "border-info-border bg-info-bg text-info-text",
  queued: "border-info-border bg-info-bg text-info-text",
  running: "border-info-border bg-info-bg text-info-text",
  succeeded: "border-success-border bg-success-bg text-success-text",
  failed: "border-danger-border bg-danger-bg text-danger-text",
  canceled: "border-border bg-surface-alt text-text-muted",
}

function StateIcon({ state }: { state: TaskUiState }) {
  const cls = "h-4 w-4 shrink-0"
  if (state === "succeeded") return <CheckCircle2 className={cls} aria-hidden="true" />
  if (state === "failed") return <AlertCircle className={cls} aria-hidden="true" />
  if (state === "canceled") return <Ban className={cls} aria-hidden="true" />
  if (state === "queued" || state === "idle") return <Clock className={cls} aria-hidden="true" />
  return <Loader2 className={cn(cls, "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds} giây`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m} phút ${s} giây` : `${m} phút`
}

/**
 * Hiển thị trạng thái một tác vụ nền theo đúng sự thật từ backend (UX-P04).
 * Không có tiến độ thật thì không vẽ phần trăm.
 */
export function TaskStatus({
  state,
  title,
  detail,
  needsReview = false,
  failureKind = "retryable",
  progress,
  elapsedSeconds,
  supportCode,
  onRetry,
  retryLabel = "Thử lại",
  onCancel,
  className,
}: TaskStatusProps) {
  const pct = isTaskBusy(state) ? reportedProgress(progress) : null
  const label = taskStateLabel(state, needsReview)
  const showRetry = state === "failed" && failureKind === "retryable" && !!onRetry

  return (
    <div
      role={state === "failed" ? "alert" : "status"}
      aria-live={state === "failed" ? "assertive" : "polite"}
      className={cn("flex flex-col gap-2 rounded-xl border px-3.5 py-3 text-body-sm", TONE[state], className)}
    >
      <div className="flex items-start gap-2.5">
        <StateIcon state={state} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {title ? `${title} · ${label}` : label}
            {pct !== null && <span className="ml-1 tabular-nums">{pct}%</span>}
          </p>
          {detail && <p className="mt-0.5 text-text-muted">{detail}</p>}
          {isTaskBusy(state) && elapsedSeconds !== undefined && elapsedSeconds > 0 && (
            <p className="mt-0.5 text-meta text-text-muted">Đã chờ {formatElapsed(elapsedSeconds)}</p>
          )}
          {state === "failed" && supportCode && (
            <p className="mt-0.5 text-meta text-text-muted">Mã hỗ trợ: {supportCode}</p>
          )}
        </div>
        {(showRetry || (onCancel && isTaskBusy(state))) && (
          <div className="flex shrink-0 gap-1.5">
            {showRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {onCancel && isTaskBusy(state) && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Hủy
              </Button>
            )}
          </div>
        )}
      </div>
      {pct !== null && <Progress value={pct} />}
    </div>
  )
}
