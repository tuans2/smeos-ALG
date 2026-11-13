"use client"

import { useEffect, useState } from "react"
import { useApi } from "@/components/greeting-card/greeting-api"
import type { TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import type { TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"

/** Quy trình theo dõi (máy chủ đã lọc theo quyền xem) + người đang đăng nhập; tự làm mới mỗi phút. */
export function useWorklist() {
  const pipeline = useApi<{ data: TrackingPipelineItem[] }>("/api/v1/greeting-card/tracking-pipeline", { refreshInterval: 60_000 })
  const me = useApi<{ user: { id: string } }>("/api/v1/auth/me")
  return {
    items: pipeline.data?.data ?? [],
    userId: me.data?.user.id ?? null,
    error: pipeline.error as Error | undefined,
    isLoading: pipeline.isLoading,
    refresh: () => pipeline.mutate(),
  }
}

/** Trạng thái việc của từng đơn cho bảng Điều phối (chỉ đơn, kèm thời gian chuẩn) — làm mới cùng nhịp bảng đơn. */
export function useCoordinatorWork() {
  const work = useApi<{ data: TrackingViewItem[] }>("/api/v1/greeting-card/coordinator-work", { refreshInterval: 30_000 })
  return { items: work.data?.data ?? [], refresh: () => work.mutate() }
}

/** Đồng hồ cho "ở bước này bao lâu" — cập nhật mỗi phút, không gọi Date.now() lúc render. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
