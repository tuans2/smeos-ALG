import { describe, expect, test } from "vitest"

import { Prisma } from "@/generated/prisma/client"
import { missingSchemaColumns } from "../../helpers/database"

// 24/09/2026: DB test thiếu cột `campaign_packages.video_job_ids` → route trả 500,
// test:tenant chỉ báo "expected 500 to be 201". Bộ so cột phải bắt được.

function allColumns(): Set<string> {
  const ns = Prisma as unknown as Record<string, unknown>
  const out = new Set<string>()
  for (const model of Object.values(Prisma.ModelName) as string[]) {
    const fields = ns[`${model.charAt(0).toUpperCase()}${model.slice(1)}ScalarFieldEnum`] as Record<string, string> | undefined
    for (const c of Object.values(fields ?? {})) out.add(`${model}.${c}`)
  }
  return out
}

describe("missingSchemaColumns", () => {
  test("đọc được cột của mọi model, gồm cột mới nhất", () => {
    const cols = allColumns()
    expect(cols.has("campaign_packages.video_job_ids")).toBe(true)
    expect(missingSchemaColumns(cols)).toEqual([])
  })
  test("thiếu một cột → chỉ đúng cột đó", () => {
    const cols = allColumns()
    cols.delete("campaign_packages.video_job_ids")
    expect(missingSchemaColumns(cols)).toEqual(["campaign_packages.video_job_ids"])
  })
})
