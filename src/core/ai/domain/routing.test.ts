import { describe, expect, it } from "vitest"

import { aiCapability } from "./ai-capabilities"
import {
  nextEscalation,
  nextFallback,
  selectModel,
  type AiModelCandidate,
  type AiPolicy,
} from "./routing"

const base: Omit<AiModelCandidate, "key"> = {
  provider: "nha_cung_cap_a",
  enabled: true,
  measureState: "SAN_XUAT",
  leavesInfra: true,
  qualityClass: "trung_binh",
  costClass: "trung_binh",
  latencyClass: "trung_binh",
  capabilities: ["product_vision"],
  licenseComplete: true,
}

const model = (key: string, over: Partial<AiModelCandidate> = {}): AiModelCandidate => ({
  ...base,
  key,
  ...over,
})

const vision = aiCapability("product_vision")
const openPolicy: AiPolicy = { allowedModels: [] }

describe("bộ định tuyến — năm ràng buộc của D17", () => {
  it("ràng buộc 1: mô hình chưa đo không được chọn tự động", () => {
    const decision = selectModel(
      [model("chua_do", { measureState: "CHUA_DO" }), model("thu_nghiem", { measureState: "THU_NGHIEM" })],
      openPolicy,
      { capability: vision }
    )
    expect(decision.kind).toBe("tu_choi")
    if (decision.kind === "tu_choi") {
      expect(decision.reason).toBe("KHONG_CO_MO_HINH_DU_DIEU_KIEN")
      expect(decision.rejected.map((r) => r.reason)).toContain("chua_do_tren_bo_anh_vang")
    }
  })

  it("ràng buộc 1, ngoại lệ: tổ chức thu trần về đúng một mô hình thì mô hình chưa đo vẫn chạy", () => {
    const decision = selectModel([model("cuc_bo", { measureState: "THU_NGHIEM" })], {
      allowedModels: ["cuc_bo"],
    }, { capability: vision })
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") expect(decision.model.key).toBe("cuc_bo")
  })

  it("ràng buộc 2: mô hình ngoài trần của tổ chức bị loại, dù tốt hơn", () => {
    const decision = selectModel(
      [model("trong_tran"), model("ngoai_tran", { qualityClass: "cao" })],
      { allowedModels: ["trong_tran", "mot_mo_hinh_khac"] },
      { capability: vision }
    )
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") {
      expect(decision.model.key).toBe("trong_tran")
      expect(decision.rejected).toEqual([{ key: "ngoai_tran", reason: "ngoai_tran_to_chuc" }])
    }
  })

  it("ràng buộc 3: mô hình đã chốt vào payload thắng, không tra lại", () => {
    const decision = selectModel(
      [model("da_chot", { qualityClass: "thap" }), model("tot_hon", { qualityClass: "cao" })],
      openPolicy,
      { capability: vision, pinnedModelKey: "da_chot" }
    )
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") {
      expect(decision.model.key).toBe("da_chot")
      expect(decision.pinned).toBe(true)
    }
  })

  it("ràng buộc 3: trần đổi sau khi job xếp hàng thì mô hình đã chốt bị từ chối, không âm thầm đổi sang mô hình khác", () => {
    const decision = selectModel([model("da_chot"), model("con_lai")], {
      allowedModels: ["con_lai"],
    }, { capability: vision, pinnedModelKey: "da_chot" })
    expect(decision.kind).toBe("tu_choi")
    if (decision.kind === "tu_choi") expect(decision.reason).toBe("PINNED_NGOAI_TRAN")
  })

  it("ràng buộc 4: thác chỉ leo lên — không có mô hình lớp cao hơn thì trả null", () => {
    const current = model("dang_chay", { qualityClass: "cao" })
    const leo = nextEscalation(current, [current, model("re_hon", { qualityClass: "thap" })], openPolicy, {
      capability: vision,
    })
    expect(leo).toBeNull()
  })

  it("ràng buộc 4: có mô hình lớp cao hơn thì leo lên đúng mô hình đó", () => {
    const current = model("dang_chay", { qualityClass: "thap" })
    const leo = nextEscalation(current, [current, model("cao_hon", { qualityClass: "cao" })], openPolicy, {
      capability: vision,
    })
    expect(leo?.key).toBe("cao_hon")
  })

  it("ràng buộc 5: lời gọi SENSITIVE chỉ chạy mô hình không đưa dữ liệu rời hạ tầng", () => {
    const decision = selectModel(
      [model("goi_ra_ngoai", { leavesInfra: true }), model("tai_cho", { leavesInfra: false })],
      openPolicy,
      { capability: vision, privacy: "SENSITIVE" }
    )
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") expect(decision.model.key).toBe("tai_cho")
  })

  it("ràng buộc 5: sàn của chính năng lực áp dù lời gọi không nêu mức nào", () => {
    const decision = selectModel([model("goi_ra_ngoai", { capabilities: ["customer_segmentation"] })], openPolicy, {
      capability: aiCapability("customer_segmentation"),
    })
    expect(decision.kind).toBe("tu_choi")
  })

  it("ràng buộc 5: dự phòng không vượt sàn — hết đường thì trả null thay vì gửi ra ngoài", () => {
    const failed = model("tai_cho_a", { leavesInfra: false, provider: "a" })
    const duPhong = nextFallback(
      failed,
      [failed, model("ngoai_b", { leavesInfra: true, provider: "b" })],
      openPolicy,
      { capability: vision, privacy: "SENSITIVE" }
    )
    expect(duPhong).toBeNull()
  })

  it("dự phòng đổi sang nhà cung cấp khác, cùng lớp hoặc cao hơn", () => {
    const failed = model("a1", { provider: "a" })
    const duPhong = nextFallback(
      failed,
      [failed, model("a2", { provider: "a" }), model("b1", { provider: "b" })],
      openPolicy,
      { capability: vision }
    )
    expect(duPhong?.key).toBe("b1")
  })

  it("mô hình thiếu một ô giấy phép không bao giờ chạy — D18", () => {
    const decision = selectModel([model("thieu_giay_phep", { licenseComplete: false })], openPolicy, {
      capability: vision,
    })
    expect(decision.kind).toBe("tu_choi")
    if (decision.kind === "tu_choi") {
      expect(decision.rejected).toEqual([{ key: "thieu_giay_phep", reason: "thieu_o_giay_phep" }])
    }
  })

  it("năng lực tất định không đi qua bộ định tuyến", () => {
    const decision = selectModel([model("bat_ky", { capabilities: ["watermark"] })], openPolicy, {
      capability: aiCapability("watermark"),
    })
    expect(decision.kind).toBe("tu_choi")
    if (decision.kind === "tu_choi") expect(decision.reason).toBe("NANG_LUC_TAT_DINH")
  })

  it("không có ngưỡng thì chạy lớp chất lượng cao nhất ngay lượt đầu — thác không có gì để phát hiện", () => {
    const decision = selectModel(
      [model("re", { qualityClass: "thap" }), model("tot", { qualityClass: "cao" })],
      openPolicy,
      { capability: vision }
    )
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") expect(decision.model.key).toBe("tot")
  })

  it("có ngưỡng thì bắt đầu từ lớp thấp nhất rồi để thác leo lên", () => {
    const decision = selectModel(
      [model("re", { qualityClass: "thap" }), model("tot", { qualityClass: "cao" })],
      openPolicy,
      { capability: vision, cascade: true }
    )
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") expect(decision.model.key).toBe("re")
  })

  it("không có mục tiêu chất lượng thì lấy lớp cao nhất, rồi rẻ hơn", () => {
    const decision = selectModel(
      [
        model("cao_dat", { qualityClass: "cao", costClass: "cao" }),
        model("cao_re", { qualityClass: "cao", costClass: "thap" }),
        model("thap", { qualityClass: "thap", costClass: "thap" }),
      ],
      openPolicy,
      { capability: vision }
    )
    expect(decision.kind).toBe("chon")
    if (decision.kind === "chon") expect(decision.model.key).toBe("cao_re")
  })
})

describe("thứ tự ưu tiên nhà cung cấp của tổ chức (PO 25/09/2026)", () => {
  const ds = [
    model("gpt", { provider: "openai", qualityClass: "cao" }),
    model("claude", { provider: "anthropic", qualityClass: "cao", measureState: "THU_NGHIEM" }),
    model("gemini", { provider: "google", qualityClass: "cao", measureState: "THU_NGHIEM" }),
    model("claude_nho", { provider: "anthropic", qualityClass: "trung_binh", measureState: "THU_NGHIEM" }),
    model("la_chua_chon", { provider: "khac", qualityClass: "cao", measureState: "THU_NGHIEM" }),
  ]

  it("chọn đúng bên đứng đầu thứ tự, kể cả khi chưa đo (tổ chức tự chọn)", () => {
    const d = selectModel(ds, openPolicy, { capability: vision, preferredModelKeys: ["claude", "gpt"] })
    expect(d.kind === "chon" && d.model.key).toBe("claude")
  })

  it("mô hình chưa đo KHÔNG có trong thứ tự thì vẫn không được chọn tự động", () => {
    const d = selectModel([ds[4]!], openPolicy, { capability: vision, preferredModelKeys: ["claude"] })
    expect(d.kind).toBe("tu_choi")
  })

  it("dự phòng đi theo thứ tự của tổ chức, kể cả xuống lớp đã xếp", () => {
    const req = { capability: vision, preferredModelKeys: ["claude", "gemini", "claude_nho"] }
    expect(nextFallback(ds[1]!, ds, openPolicy, req)?.key).toBe("gemini")
    expect(nextFallback(ds[2]!, ds, openPolicy, req, ["claude"])?.key).toBe("claude_nho")
    expect(nextFallback(ds[3]!, ds, openPolicy, req, ["claude", "gemini"])).toBeNull()
  })

  it("thứ tự không vượt trần của tổ chức", () => {
    const d = selectModel(ds, { allowedModels: ["gpt"] }, { capability: vision, preferredModelKeys: ["claude", "gpt"] })
    expect(d.kind === "chon" && d.model.key).toBe("gpt")
  })
})
