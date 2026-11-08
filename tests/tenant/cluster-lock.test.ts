import { afterAll, describe, expect, it } from "vitest"

import { runExclusive } from "@/core/runtime/infra/cluster-lock"

import { disconnectDatabase } from "../helpers/database"

/**
 * UJ-11 (audit hành trình 06/11/2026, S2): bộ quét chạy trong mọi tiến trình web. `runExclusive` bảo đảm mỗi
 * lượt chỉ một tiến trình làm; lượt chen giữa trả `null` ngay, khoá được nhả khi xong hoặc lỗi.
 */
describe("runExclusive — một tiến trình mỗi lượt", () => {
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hai lượt cùng lúc: một lượt chạy, lượt kia bỏ qua (null)", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    let locked!: () => void
    const holding = new Promise<void>((r) => (locked = r))
    let runs = 0
    const first = runExclusive("test_cluster_lock", async () => {
      runs++
      locked()
      await gate
      return "xong"
    })
    // Chờ tín hiệu phát từ bên trong lượt đầu (đã giữ khoá) thay vì ngủ cố định — CI tải nặng có thể chậm hơn 200 ms.
    await holding
    const second = await runExclusive("test_cluster_lock", async () => {
      runs++
      return "chen"
    })
    release()
    expect(await first).toBe("xong")
    expect(second).toBeNull()
    expect(runs).toBe(1)
  })

  it("khoá được nhả sau khi lượt trước lỗi — lượt sau chạy bình thường", async () => {
    await expect(runExclusive("test_cluster_lock_err", async () => { throw new Error("hỏng") })).rejects.toThrow("hỏng")
    expect(await runExclusive("test_cluster_lock_err", async () => 1)).toBe(1)
  })

  it("khoá khác tên không chặn nhau", async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const first = runExclusive("test_lock_a", async () => { await gate; return "a" })
    await new Promise((r) => setTimeout(r, 200))
    expect(await runExclusive("test_lock_b", async () => "b")).toBe("b")
    release()
    expect(await first).toBe("a")
  })
})
