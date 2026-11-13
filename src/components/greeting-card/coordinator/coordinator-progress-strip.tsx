import { Check } from "@/components/ui/icons"
import { coordinatorProgress } from "@/modules/greeting-card/domain/coordinator-progress"

/** Dải bước xưởng: ✓ bước đã xong, chấm đậm bước đang làm. */
export function CoordinatorProgressStrip(props: { status: string; productionStatus: string; deliveryStatus: string }) {
  const steps = coordinatorProgress(props)
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Tiến độ xưởng">
      {steps.map((s) => {
        const isFinished = s.state !== "pending" && s.state !== "current"
        return (
        <li key={s.key} className="flex flex-col items-center gap-1 text-center">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-caption font-bold ${
              isFinished
                ? "border-success bg-success text-surface"
                : s.state === "current"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-muted"
            }`}
          >
            {isFinished ? <Check size={14} aria-hidden="true" /> : null}
          </span>
          <span className={`text-caption ${s.state === "pending" ? "text-text-muted" : "font-semibold text-text"}`}>
            {s.label}
            <span className="sr-only">{isFinished ? " (đã xong)" : s.state === "current" ? " (đang làm)" : " (chưa tới)"}</span>
          </span>
        </li>
        )
      })}
    </ol>
  )
}
