import type { AiRequestFilter } from "@/modules/ai-governance/use-cases/list-ai-requests"

/** Đọc bộ lọc từ query. Trần 5.000 hàng mỗi lượt — đặc tả 06 mục 18. */
export function readFilter(url: string): AiRequestFilter {
  const params = new URL(url).searchParams
  const parseDate = (value: string | null): Date | undefined => {
    if (!value) return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  const limit = Number(params.get("limit"))

  return {
    capability_code: params.get("capability_code") ?? undefined,
    from: parseDate(params.get("from")),
    to: parseDate(params.get("to")),
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 5000) : undefined,
  }
}
