import Link from "next/link"
import { BadgePercent } from "@/components/ui/icon-set/badge-percent"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import { Ticket } from "@/components/ui/icon-set/ticket"

const LINKS = [
  { key: "uu-dai", href: "/uu-dai", label: "Chương trình ưu đãi", icon: BadgePercent },
  { key: "ma-giam-gia", href: "/uu-dai/ma-giam-gia", label: "Mã giảm giá", icon: Ticket },
  { key: "bang-gia", href: "/bang-gia", label: "Bảng giá", icon: FileSpreadsheet },
] as const

export type PromotionsHubKey = (typeof LINKS)[number]["key"]

/**
 * Điều hướng chung của nhóm Ưu đãi (Bước 3 · Quảng bá sản phẩm). Ưu đãi ở đây và ở
 * Cài đặt → Ưu đãi là CÙNG một dữ liệu (ma trận ưu đãi) — sửa chỗ nào cũng hiện như nhau.
 */
export function PromotionsHubNav({ active }: { active: PromotionsHubKey }) {
  return (
    <nav aria-label="Ưu đãi và giảm giá" className="flex flex-wrap gap-2 print:hidden">
      {LINKS.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? "page" : undefined}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-semibold ${
            key === active ? "border-primary bg-primary-muted text-primary" : "border-border bg-surface text-text hover:border-primary"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}
