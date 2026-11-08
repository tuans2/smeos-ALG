import { describe, expect, it } from "vitest"
import { z } from "zod"

import { accepted, created, noContent, page } from "@/core/http/contract-responses"
import { AppError } from "@/core/http/errors"
import { DEFAULT_PAGE_LIMIT, decodeCursor, encodeCursor, pageQuery, toPage } from "@/core/http/pagination"

/** Phân trang chuẩn API Contract v1.1 §6 (PO chốt 07/11/2026: mặc định 25, `{ data, next_cursor }`). */
describe("pagination", () => {
  const schema = z.object(pageQuery)

  it("mặc định 25, nhận 1–100", () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(25)
    expect(schema.parse({})).toEqual({ limit: 25 })
    expect(schema.parse({ limit: "100", cursor: "abc" })).toEqual({ limit: 100, cursor: "abc" })
    for (const limit of ["0", "101", "2.5", "abc"]) expect(schema.safeParse({ limit }).success).toBe(false)
  })

  it("toPage cắt dòng dư và dựng con trỏ mờ từ dòng cuối", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }]
    const result = toPage(rows, 2)
    expect(result.data).toEqual([{ id: "a" }, { id: "b" }])
    expect(result.next_cursor).not.toBe("b")
    expect(decodeCursor(result.next_cursor as string)).toEqual({ id: "b" })
    expect(toPage(rows, 3).next_cursor).toBeNull()
  })

  it("toPage nhận khoá sắp xếp riêng", () => {
    const rows = [{ id: "a", created_at: "2026-11-01" }, { id: "b", created_at: "2026-11-02" }]
    const next = toPage(rows, 1, (row) => ({ created_at: row.created_at, id: row.id })).next_cursor as string
    expect(decodeCursor(next)).toEqual({ created_at: "2026-11-01", id: "a" })
  })

  it("con trỏ hỏng/giả → 400 cursor, không phải 500", () => {
    for (const raw of ["%%%", encodeCursor({ id: "a" }).slice(0, 3), Buffer.from("[1]").toString("base64url"), Buffer.from("{}").toString("base64url")]) {
      const error = (() => {
        try {
          decodeCursor(raw)
        } catch (e) {
          return e
        }
      })()
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).details).toHaveProperty("cursor")
    }
  })
})

describe("contract responses", () => {
  it("201 kèm Location, 202 { data }, 204 không thân, trang { data, next_cursor }", async () => {
    const c = created({ id: "p-1" }, "/api/v1/price-lists/p-1")
    expect(c.status).toBe(201)
    expect(c.headers.get("location")).toBe("/api/v1/price-lists/p-1")
    expect(await c.json()).toEqual({ data: { id: "p-1" } })
    expect((await accepted({ job_id: "j" }).json())).toEqual({ data: { job_id: "j" } })
    const n = noContent()
    expect(n.status).toBe(204)
    expect(await n.text()).toBe("")
    expect(await page({ data: [1], next_cursor: null }).json()).toEqual({ data: [1], next_cursor: null })
  })
})
