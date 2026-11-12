/**
 * Ngưỡng tăng trưởng bảng (ADR-015 D-O6, bước O-10): bảng vượt 20 triệu dòng hoặc 10 GB mới xét phân vùng theo tháng
 * (migration SQL tay, Prisma vẫn đọc bảng cha); dưới ngưỡng thì hạn lưu (ADR-014 D-P4) là cơ chế giữ bảng nhỏ. Cảnh báo
 * sớm ở 70% ngưỡng. Thuần, không import hạ tầng.
 */
export const PARTITION_ROW_THRESHOLD = 20_000_000
export const PARTITION_BYTES_THRESHOLD = 10 * 1024 ** 3
export const EARLY_WARNING_RATIO = 0.7

export interface TableSize { table: string; rows: number; bytes: number }
export type GrowthLevel = "partition" | "watch"
export interface GrowthFinding extends TableSize { level: GrowthLevel }

export function growthFindings(tables: readonly TableSize[]): GrowthFinding[] {
  const out: GrowthFinding[] = []
  for (const t of tables) {
    const ratio = Math.max(t.rows / PARTITION_ROW_THRESHOLD, t.bytes / PARTITION_BYTES_THRESHOLD)
    if (ratio >= 1) out.push({ ...t, level: "partition" })
    else if (ratio >= EARLY_WARNING_RATIO) out.push({ ...t, level: "watch" })
  }
  return out.sort((x, y) => y.bytes - x.bytes)
}
