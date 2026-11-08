import { describe, expect, it } from "vitest"

import { PII_FIELDS } from "@/core/security/pii-fields"
import { Prisma } from "@/generated/prisma/client"

/**
 * ADR-014 D-P3, bước P-5d-1: bản sao bản mã `*_enc` của P-5a/P-5b không còn trong client Prisma (`@ignore` trong
 * `schema.prisma`) — ứng dụng không đọc, không ghi. Đây là điều kiện để P-5d-2 xoá cột trong lúc bản này còn phục vụ
 * (migration chạy ở pre-deploy, trước khi bản mới thay bản cũ): client còn cột nào thì mọi lệnh đọc bảng đó sẽ lỗi.
 */
const SCALAR_FIELDS: Record<keyof typeof PII_FIELDS, Record<string, string>> = {
  customers: Prisma.CustomersScalarFieldEnum,
  leads: Prisma.LeadsScalarFieldEnum,
  greeting_sessions: Prisma.Greeting_sessionsScalarFieldEnum,
  order_recipients: Prisma.Order_recipientsScalarFieldEnum,
  order_coordinations: Prisma.Order_coordinationsScalarFieldEnum,
}

describe("P-5d-1 — client không còn cột `*_enc`", () => {
  it("bảng có dữ liệu cá nhân: không cột nào kết thúc bằng `_enc`; cột cá nhân vẫn có", () => {
    for (const [model, fields] of Object.entries(SCALAR_FIELDS)) {
      const names = Object.keys(fields)
      expect(names.filter((n) => n.endsWith("_enc")), model).toEqual([])
      for (const field of Object.keys(PII_FIELDS[model as keyof typeof PII_FIELDS])) expect(names, `${model}.${field}`).toContain(field)
    }
  })
})
