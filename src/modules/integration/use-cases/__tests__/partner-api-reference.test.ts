import { describe, expect, it } from "vitest"

import { INTEGRATION_OPERATIONS } from "@/modules/integration/contracts/integration-openapi"
import { SUNSET_FIELDS } from "@/modules/integration/domain/integration-field-sunset"
import { partnerApiReference } from "../partner-api-reference"

/** ARC-024 B4: trang tài liệu đối tác dựng từ chính OpenAPI tích hợp — đủ endpoint, đúng cờ sắp gỡ, không lộ API khác. */
describe("partnerApiReference", () => {
  const ref = partnerApiReference()

  it("đủ mọi operation của Integration API, và chỉ chúng", () => {
    expect(ref.operations.map((o) => `${o.method} ${o.path}`).sort()).toEqual(
      INTEGRATION_OPERATIONS.map((o) => `${o.method.toUpperCase()} ${o.path}`).sort()
    )
    for (const op of ref.operations) expect(op.path.startsWith("/integration/")).toBe(true)
    expect(ref.baseUrl).toBe("/api/v1")
  })

  it("trường sắp gỡ hiện cờ deprecated, cả ở đối tượng lồng (job trong POST /integration/jobs)", () => {
    const usage = ref.operations.find((o) => o.path === "/integration/usage")!.responses[0]!.fields
    expect(usage.filter((f) => f.deprecated).map((f) => f.name).sort()).toEqual([...SUNSET_FIELDS.usage].sort())
    const job = ref.operations.find((o) => o.path === "/integration/jobs")!.responses[0]!.fields.find((f) => f.name === "job")!
    expect(job.children.filter((f) => f.deprecated).map((f) => f.name).sort()).toEqual([...SUNSET_FIELDS.job].sort())
    expect(job.children.find((f) => f.name === "payload")!.deprecated).toBe(false)
  })

  it("kiểu, bắt buộc, giá trị cho phép và lỗi đọc được", () => {
    const usage = ref.operations.find((o) => o.path === "/integration/usage")!
    const status = usage.body.find((f) => f.name === "status")!
    expect(status).toMatchObject({ type: "chuỗi", required: true, allowed: ["COMPLETED", "REFUNDED"] })
    expect(usage.body.find((f) => f.name === "job_id")).toMatchObject({ required: false, nullable: true })
    expect(usage.auth).toEqual(["Khoá ứng dụng (Bearer)", "Phiên SSO (x-alg-sso)"])
    expect(usage.errors).toContain("429")
    expect(ref.operations.find((o) => o.path === "/integration/products")!.query.map((q) => q.name)).toContain("cursor")
  })
})
