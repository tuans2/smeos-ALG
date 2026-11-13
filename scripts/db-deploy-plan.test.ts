import { describe, expect, it } from "vitest"

import { planDeploy } from "./db-deploy-plan.mjs"

/** Bỏ `db push --accept-data-loss` lúc deploy (rà soát 21/10/2026, giai đoạn 3). */
describe("planDeploy", () => {
  it("đã có migration nền: chỉ chạy migrate deploy", () => {
    expect(planDeploy({ hasAppTables: true, hasMigrationsTable: true, baselineApplied: true })).toEqual(["deploy"])
  })

  it("CSDL rỗng: dựng từ đầu bằng migrate deploy", () => {
    expect(planDeploy({ hasAppTables: false, hasMigrationsTable: false, baselineApplied: false })).toEqual(["deploy"])
  })

  it("CSDL đang chạy bằng db push: kiểm lệch TRƯỚC khi đánh dấu nền", () => {
    expect(planDeploy({ hasAppTables: true, hasMigrationsTable: false, baselineApplied: false })).toEqual([
      "check-drift",
      "resolve-baseline",
      "deploy",
    ])
  })

  it("còn lịch sử migration thời floraos: cất đi, không xoá, rồi mới đánh dấu nền", () => {
    expect(planDeploy({ hasAppTables: true, hasMigrationsTable: true, baselineApplied: false })).toEqual([
      "check-drift",
      "archive-history",
      "resolve-baseline",
      "deploy",
    ])
  })
})
