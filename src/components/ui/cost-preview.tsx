import { cn } from "@/lib/utils"

export interface CostPreviewProps {
  /** Số credit dự kiến cho lần bấm này. 0 = miễn phí. */
  cost: number
  /** Số credit còn lại của tổ chức, lấy từ server. Không biết thì để `null`. */
  remaining?: number | null
  /** Chi phí chưa chắc chắn (phụ thuộc kết quả). */
  estimated?: boolean
  className?: string
}

export function isCostAffordable(cost: number, remaining: number | null | undefined): boolean {
  return remaining === null || remaining === undefined || remaining >= cost
}

/**
 * Chi phí AI đặt ngay cạnh nút (03c UX-019, UX-P12): "Dùng 2 credit · còn 26".
 * Khi không đủ, nút gửi phải bị khóa bằng `isCostAffordable` trước khi gửi request.
 */
export function CostPreview({ cost, remaining, estimated = false, className }: CostPreviewProps) {
  const enough = isCostAffordable(cost, remaining)
  const costText = cost === 0 ? "Miễn phí" : `${estimated ? "Dự kiến " : ""}dùng ${cost} credit`
  const remainText = remaining === null || remaining === undefined ? "" : ` · còn ${remaining}`

  return (
    <p
      className={cn("text-meta", enough ? "text-text-muted" : "font-semibold text-danger-text", className)}
      aria-live="polite"
    >
      {costText}
      {remainText}
      {!enough && " — chưa đủ credit, hãy nạp thêm trước khi tạo"}
    </p>
  )
}
