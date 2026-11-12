"use client"

import { Heart } from "@/components/ui/icons"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useApi } from "@/components/greeting-card/greeting-api"

type HeartRow = {
  productId: string
  code: string
  name: string
  imageUrl: string | null
  hearts: number
  privateHearts: number
  publicHearts: number
}

const TOP = 10

/** Bảng "Mẫu được thả tim nhiều nhất" — cộng mọi khách đã xem bộ sưu tập (mỗi khách 1 tim/mẫu). */
export function CatalogHeartsPanel({ catalogId }: { catalogId: string }) {
  const res = useApi<{ data: { totalHearts: number; rows: HeartRow[] } }>(`/api/v1/greeting-card/catalogs/${catalogId}/hearts`)
  const data = res.data?.data
  const max = data?.rows[0]?.hearts ?? 0

  return (
    <section aria-labelledby="hearts-title" className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 id="hearts-title" className="text-body font-extrabold text-text flex items-center gap-2">
          <Heart size={18} className="text-danger" fill="currentColor" aria-hidden="true" />
          <span>Mẫu được thả tim nhiều nhất</span>
        </h3>
        {data && <span className="text-caption text-text-muted">Tổng {data.totalHearts} tim</span>}
      </div>
      <p className="text-caption text-text-muted mt-1">
        Tính từ link gửi riêng và link bộ sưu tập công khai; mỗi khách tối đa 1 tim cho một mẫu, bỏ tim thì trừ lại.
      </p>

      {res.isLoading ? (
        <div className="mt-4"><SkeletonBlock lines={3} /></div>
      ) : res.error ? (
        <p role="alert" className="mt-3 text-body-sm text-danger">Không tải được số tim, vui lòng thử lại.</p>
      ) : !data || data.rows.length === 0 ? (
        <p className="mt-3 text-body-sm text-text-muted">Chưa có khách nào thả tim mẫu trong bộ sưu tập này.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2.5">
          {data.rows.slice(0, TOP).map((r, i) => (
            <li key={r.productId} className="flex items-center gap-3">
              <span className="w-5 text-right text-caption font-bold text-text-muted tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-body-sm font-semibold text-text">{r.name}</span>
                  <span className="shrink-0 text-body-sm font-bold text-danger tabular-nums">♥ {r.hearts}</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
                  <div className="h-full rounded-full bg-danger" style={{ width: `${max > 0 ? (r.hearts / max) * 100 : 0}%` }} />
                </div>
                <p className="mt-0.5 text-caption text-text-muted">
                  #{r.code} · link riêng {r.privateHearts} · link công khai {r.publicHearts}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
