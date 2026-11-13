export type UsageSummary = {
  by_feature: { feature: string; quantity: number; cost_credit: number }[]
  credit_used: number
  credit_balance: number
}

export type AuditLogEntry = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  before: unknown
  after: unknown
  created_at: string
}

export type AiRequestItem = {
  id: string
  capability_code: string
  model_key: string
  outcome: string
  cost_usd: number
  quality_score: number | null
  created_at: string
}

export function metricLabel(feature: string): string {
  const labels: Record<string, string> = {
    reach: "Lượt tiếp cận (Reach)",
    engagement: "Tương tác (Engagement)",
    inbox: "Khách hỏi (Inbox)",
    conversion: "Chuyển đổi đơn hàng",
    "top-post": "Bài viết nổi bật",
    "best-product": "Sản phẩm bán chạy",
    roi: "Tỷ suất hoàn vốn (ROI)",
  }
  return labels[feature] ?? feature
}
