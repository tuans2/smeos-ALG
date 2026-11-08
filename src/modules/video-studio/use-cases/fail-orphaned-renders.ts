import { failOrphanedVideoRenders } from "../infra/video-render-sweep"

/** Lượt quét job treo gọi sau khi đánh lỗi job quá hạn (audit hành trình V1, gói UJ-03). */
export function failOrphanedRenders(now: Date, staleMs: number): Promise<number> {
  return failOrphanedVideoRenders(now, staleMs)
}
