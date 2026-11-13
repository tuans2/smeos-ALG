/**
 * Chỉ đạo khung hình ảnh biến thể (Đợt 1 nâng cấp chất lượng, 24/09/2026):
 * ưu tiên giá trị người gọi → cảnh của kịch bản → mặc định; và hằng số hai
 * phía TS ↔ worker Python không được lệch nhau.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  LIGHT_DIRECTIONS,
  VARIANT_PLACEMENTS,
  VARIANT_SHOTS,
  inferLightDirection,
  resolveVariantDirection,
  variantDirectionPayload,
} from "@/modules/media/domain/variant-direction-rules"

const ROOT = path.resolve(__dirname, "../../..")
const py = (f: string) => readFileSync(path.join(ROOT, "workers/media_ai", f), "utf8")
const tuple = (src: string, name: string) => {
  const m = src.match(new RegExp(`^${name} = \\(([^)]*)\\)`, "m"))
  return m ? [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null
}

describe("inferLightDirection", () => {
  it.each([
    ["Ánh sáng ấm từ cửa sổ bên trái", "left"],
    ["đèn nến hắt từ phía phải", "right"],
    ["Đèn trần chiếu từ trên cao", "above"],
    ["ánh sáng chính diện, mềm", "front"],
    ["soft key light from the right", "right"],
  ])("%s → %s", (text, expected) => {
    expect(inferLightDirection(text)).toBe(expected)
  })

  it("không nhận ra thì null", () => {
    expect(inferLightDirection("ánh sáng hoàng hôn ấm áp")).toBeNull()
    expect(inferLightDirection("")).toBeNull()
  })
})

describe("resolveVariantDirection", () => {
  const canh = { shot: "wide", lighting: "nắng chiếu từ bên phải", palette: ["đỏ", "kem", "đỏ", " "] }

  it("không gửi gì, không kịch bản → mặc định khung đúng tỉ lệ, cỡ trung, sáng trái", () => {
    const d = resolveVariantDirection({})
    expect(d).toEqual({
      fillMode: "full_frame",
      composition: { shot: "medium", placement: "center" },
      lighting: { direction: "left" },
      palette: [],
      fromPlan: [],
    })
  })

  it("thiếu thì lấy từ đúng cảnh của kịch bản và ghi vết", () => {
    const d = resolveVariantDirection({}, canh)
    expect(d.composition.shot).toBe("wide")
    expect(d.lighting.direction).toBe("right")
    expect(d.palette).toEqual(["đỏ", "kem"])
    expect(d.fromPlan).toEqual(["shot", "lighting", "palette"])
  })

  it("giá trị người gọi thắng kịch bản", () => {
    const d = resolveVariantDirection(
      { fillMode: "pad", composition: { shot: "close" }, lighting: { direction: "above" }, palette: ["white"], seed: 7 },
      canh
    )
    expect(d.fillMode).toBe("pad")
    expect(d.composition.shot).toBe("close")
    expect(d.lighting.direction).toBe("above")
    expect(d.palette).toEqual(["white"])
    expect(d.seed).toBe(7)
    expect(d.fromPlan).toEqual([])
  })

  it("payload snake_case cho worker", () => {
    expect(variantDirectionPayload(resolveVariantDirection({ seed: 42 }, canh))).toEqual({
      fill_mode: "full_frame",
      composition: { shot: "wide", placement: "center" },
      lighting: { direction: "right" },
      palette: ["đỏ", "kem"],
      seed: 42,
      direction_from_plan: ["shot", "lighting", "palette"],
    })
  })
})

describe("hằng số TS ↔ worker Python không lệch", () => {
  it("cỡ cảnh, vị trí (image/composition.py) và hướng sáng (providers/background/base.py)", () => {
    expect(tuple(py("image/composition.py"), "SHOTS")).toEqual([...VARIANT_SHOTS])
    expect(tuple(py("image/composition.py"), "PLACEMENTS")).toEqual([...VARIANT_PLACEMENTS])
    expect(tuple(py("providers/background/base.py"), "HUONG_SANG")).toEqual([...LIGHT_DIRECTIONS])
  })
})
