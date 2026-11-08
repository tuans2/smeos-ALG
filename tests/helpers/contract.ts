import { appendFileSync, mkdirSync } from "node:fs"
import path from "node:path"

import { expect } from "vitest"
import type { z } from "zod"

/**
 * Kiểm một phản hồi theo hợp đồng `strictObject` (audit API đợt 4–6): sai mã HTTP, thiếu/thừa trường, sai
 * kiểu → đỏ. Đặt `CAPTURE_CONTRACT_DIR=<thư mục>` để GHI mẫu JSON thật (mỗi lần gọi một dòng
 * `<tên>.jsonl`) khi cần cập nhật hợp đồng — chế độ ghi bỏ qua bước kiểm lược đồ, vẫn kiểm mã HTTP.
 */
export async function expectContract(
  response: Response,
  status: number,
  schema: z.ZodType | null,
  sample?: string
): Promise<Record<string, unknown>> {
  const text = await response.text()
  expect(response.status, text.slice(0, 500)).toBe(status)
  const body: unknown = text ? JSON.parse(text) : null
  const dir = process.env.CAPTURE_CONTRACT_DIR
  if (dir && sample) {
    mkdirSync(dir, { recursive: true })
    appendFileSync(path.join(dir, `${sample}.jsonl`), `${JSON.stringify(body)}\n`)
    return body as Record<string, unknown>
  }
  if (schema) {
    const parsed = schema.safeParse(body)
    expect(parsed.success ? [] : parsed.error.issues, `phản hồi lệch hợp đồng${sample ? ` (${sample})` : ""}`).toEqual([])
  }
  return body as Record<string, unknown>
}
