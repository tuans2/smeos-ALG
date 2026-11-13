import { describe, expect, it, vi } from "vitest"

import { callCapability, type AiGatewayDeps } from "./gateway"
import type { AiModelCandidate } from "./domain/routing"

const model = (key: string, over: Partial<AiModelCandidate> = {}): AiModelCandidate => ({
  key,
  provider: key,
  enabled: true,
  measureState: "SAN_XUAT",
  leavesInfra: true,
  qualityClass: "trung_binh",
  costClass: "trung_binh",
  latencyClass: "trung_binh",
  capabilities: ["content_generation"],
  licenseComplete: true,
  ...over,
})

function deps(over: Partial<AiGatewayDeps> = {}): AiGatewayDeps & {
  requests: unknown[]
  evaluations: unknown[]
} {
  const requests: unknown[] = []
  const evaluations: unknown[] = []
  return {
    requests,
    evaluations,
    policyFor: async () => ({ allowedModels: [] }),
    eligibleModels: async () => [model("a")],
    thresholdFor: async () => 0.75,
    recordRequest: async (row) => {
      requests.push(row)
    },
    recordEvaluation: async (row) => {
      evaluations.push(row)
    },
    ...over,
  }
}

const fullScores = { factual: 0.9, brand: 0.9, platform: 0.9, readability: 0.9 }

describe("cổng AI", () => {
  it("đủ điểm thì chấp nhận, ghi một hàng sổ chi phí và một hàng điểm chấm", async () => {
    const d = deps()
    const result = await callCapability(
      { capability: "content_generation", entity: { type: "post", id: "p1" } },
      async () => ({ ok: true, output: "bài viết", scores: fullScores, costUsd: 0.01, latencyMs: 900 }),
      d
    )

    expect(result.kind).toBe("xong")
    if (result.kind === "xong") {
      expect(result.output).toBe("bài viết")
      expect(result.evaluation.needsReview).toBe(false)
      expect(result.attempts).toEqual([
        { model: "a", outcome: "ACCEPTED", latencyMs: 900, costUsd: 0.01 },
      ])
    }
    expect(d.requests).toHaveLength(1)
    expect(d.evaluations).toHaveLength(1)
  })

  it("điểm dưới ngưỡng thì LEO THÁC sang mô hình lớp cao hơn, ghi cả hai lượt", async () => {
    const d = deps({
      eligibleModels: async () => [
        model("re", { qualityClass: "thap" }),
        model("tot", { qualityClass: "cao" }),
      ],
    })
    const run = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, output: "lượt một", scores: { ...fullScores, brand: 0.5 } })
      .mockResolvedValueOnce({ ok: true, output: "lượt hai", scores: fullScores })

    const result = await callCapability({ capability: "content_generation" }, run, d)

    expect(run).toHaveBeenCalledTimes(2)
    expect(result.kind).toBe("xong")
    if (result.kind === "xong") {
      expect(result.output).toBe("lượt hai")
      expect(result.model.key).toBe("tot")
      expect(result.attempts.map((a) => a.outcome)).toEqual(["ESCALATED", "ACCEPTED"])
    }
    // Ba lời gọi mô hình vẫn là MỘT lượt nghiệp vụ — credit trừ ở điểm tạo job,
    // không trừ theo số hàng ở đây (`YC-G13`).
    expect(d.requests).toHaveLength(2)
  })

  it("không còn mô hình lớp cao hơn thì nhận kết quả kèm needsReview, không bỏ đi", async () => {
    const d = deps()
    const result = await callCapability(
      { capability: "content_generation" },
      async () => ({ ok: true, output: "tạm được", scores: { ...fullScores, brand: 0.5 } }),
      d
    )
    expect(result.kind).toBe("xong")
    if (result.kind === "xong") {
      expect(result.evaluation.needsReview).toBe(true)
      expect(result.attempts.at(0)?.outcome).toBe("NEEDS_REVIEW")
    }
  })

  it("nhà cung cấp hỏng thì đổi sang nhà cung cấp khác và ghi lượt hỏng", async () => {
    const d = deps({
      eligibleModels: async () => [model("a", { provider: "a" }), model("b", { provider: "b" })],
    })
    const run = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "502 từ nhà cung cấp" })
      .mockResolvedValueOnce({ ok: true, output: "chạy bằng dự phòng", scores: fullScores })

    const result = await callCapability({ capability: "content_generation" }, run, d)

    expect(result.kind).toBe("xong")
    if (result.kind === "xong") {
      expect(result.model.key).toBe("b")
      expect(result.attempts.map((a) => a.outcome)).toEqual(["FAILED", "ACCEPTED"])
    }
  })

  it("hỏng mà không còn đường dự phòng thì trả khong_chay_duoc, không im lặng", async () => {
    const d = deps()
    const result = await callCapability(
      { capability: "content_generation" },
      async () => ({ ok: false, message: "hết hạn mức nhà cung cấp" }),
      d
    )
    expect(result.kind).toBe("khong_chay_duoc")
    if (result.kind === "khong_chay_duoc") {
      expect(result.reason).toBe("HET_DUONG_DU_PHONG")
      expect(result.attempts).toEqual([{ model: "a", outcome: "FAILED" }])
    }
  })

  it("không mô hình nào đủ điều kiện thì không gọi adapter lần nào", async () => {
    const run = vi.fn()
    const result = await callCapability(
      { capability: "content_generation" },
      run,
      deps({ eligibleModels: async () => [] })
    )
    expect(run).not.toHaveBeenCalled()
    expect(result.kind).toBe("khong_chay_duoc")
  })

  it("thiếu kênh chấm thì đẩy sang người soát kèm lý do, và KHÔNG leo thác", async () => {
    const d = deps({
      eligibleModels: async () => [
        model("re", { qualityClass: "thap" }),
        model("tot", { qualityClass: "cao" }),
      ],
    })
    const run = vi.fn().mockResolvedValue({ ok: true, output: "x", scores: { factual: 0.9 } })

    const result = await callCapability(
      { capability: "content_generation", entity: { type: "post", id: "p9" } },
      run,
      d
    )

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.kind).toBe("xong")
    if (result.kind === "xong") {
      expect(result.evaluation.needsReview).toBe(true)
      expect(result.evaluation.reason).toContain("thieu_kenh_cham")
    }
  })

  it("gọi một năng lực tất định qua cổng là lỗi lập trình, không phải một lựa chọn", async () => {
    await expect(
      callCapability({ capability: "watermark" }, async () => ({ ok: true, output: 1 }), deps())
    ).rejects.toThrow(/tất định/)
  })
})
