import { describe, it, expect, vi, afterEach } from "vitest"
import { translate, missingKeyLabel } from "../server"
import { viDictionary } from "../locales/vi"
import { enDictionary } from "../locales/en"
import type { TranslationKey } from "../types"

function leafKeys(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k)
  )
}

describe("i18n — toàn vẹn từ điển & an toàn khi thiếu khóa", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("vi và en đối xứng ở mọi cấp khóa (không chỉ cấp 1)", () => {
    const viKeys = new Set(leafKeys(viDictionary))
    const enKeys = new Set(leafKeys(enDictionary))
    expect([...viKeys].filter((k) => !enKeys.has(k))).toEqual([])
    expect([...enKeys].filter((k) => !viKeys.has(k))).toEqual([])
  })

  it("không có chuỗi rỗng trong từ điển gốc tiếng Việt", () => {
    const empty = leafKeys(viDictionary).filter((k) => translate("vi", k as TranslationKey) === k)
    expect(empty).toEqual([])
  })

  it("production: thiếu khóa trả nhãn thân thiện, không lộ mã khóa", () => {
    vi.stubEnv("NODE_ENV", "production")
    const out = translate("en", "orders.list.emptyStateMissing" as TranslationKey)
    expect(out).toBe("Empty state missing")
    expect(out).not.toContain(".")
  })

  it("dev/test: thiếu khóa trả nguyên key để lập trình viên phát hiện", () => {
    expect(translate("vi", "orders.nope.key" as TranslationKey)).toBe("orders.nope.key")
  })

  it("missingKeyLabel tách camelCase và gạch dưới", () => {
    expect(missingKeyLabel("a.b.deliveryDate")).toBe("Delivery date")
    expect(missingKeyLabel("a.empty_state")).toBe("Empty state")
  })
})
