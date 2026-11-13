import * as React from "react"
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react"

/**
 * Bộ icon chuẩn ALG (Phosphor, PO 30/10/2026) — giữ tên kiểu lucide để thay
 * `from "@/components/ui/icons"` bằng `from "@/components/ui/icons"` mà không đổi chỗ dùng.
 * Mặc định nét `regular`; `strokeWidth ≥ 2.5` → `bold`; có `fill` → `fill`.
 * Ô icon lớn dùng `IconTile` (`app-icon.tsx`). Icon mới: thêm vào đây, không import lucide.
 */

type IconProps = Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  weight?: IconWeight
}

export type LucideProps = IconProps
export type LucideIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>

/** Bọc icon Phosphor theo prop kiểu lucide (`strokeWidth`, `fill`) — dùng chung cho mọi tệp trong `icon-set/`. */
export function w(P: PhosphorIcon): LucideIcon {
  const C = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, strokeWidth, absoluteStrokeWidth, weight, fill, ...rest },
    ref,
  ) {
    void absoluteStrokeWidth
    const auto: IconWeight = fill && fill !== "none" ? "fill" : Number(strokeWidth) >= 2.5 ? "bold" : "regular"
    return <P ref={ref} size={size} weight={weight ?? auto} {...(rest as Record<string, unknown>)} />
  })
  C.displayName = P.displayName
  return C
}
