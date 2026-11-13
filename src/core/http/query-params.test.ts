import { describe, expect, it } from "vitest"
import { AppError } from "./errors"
import { enumParam } from "./query-params"

const STATUSES = ["DRAFT", "SENT"] as const
const url = (q: string) => new URL(`http://localhost/x${q}`)

describe("enumParam", () => {
  it("trả giá trị hợp lệ", () => {
    expect(enumParam(url("?status=SENT"), "status", STATUSES)).toBe("SENT")
  })

  it("thiếu hoặc rỗng → undefined", () => {
    expect(enumParam(url(""), "status", STATUSES)).toBeUndefined()
    expect(enumParam(url("?status="), "status", STATUSES)).toBeUndefined()
  })

  it("ngoài danh sách → lỗi kiểm tra dữ liệu (400), nêu trường và giá trị cho phép", () => {
    let err: unknown
    try {
      enumParam(url("?status=sent"), "status", STATUSES)
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(AppError)
    expect(err).toMatchObject({ code: "VALIDATION_FAILED", details: { status: "Phải là một trong: DRAFT, SENT" } })
  })
})
