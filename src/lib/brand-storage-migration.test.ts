import { describe, expect, it } from "vitest"
import { migrateLegacyBrandKeys } from "./brand-storage-migration"

function memoryStorage(init: Record<string, string>): Storage {
  const m = new Map(Object.entries(init))
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  }
}

describe("chuyển khoá trình duyệt sang tên ALG", () => {
  it("đổi smeos_/smeos./smeos:/floraos: sang alg, giữ phần còn lại, xoá khoá cũ", () => {
    const s = memoryStorage({
      smeos_nav_groups_v2: "a",
      "smeos.tai-anh.lastJobId__org": "b",
      "smeos:brochure:T01": "c",
      "floraos:visitor": "d",
      khac: "giữ",
    })
    expect(migrateLegacyBrandKeys(s)).toBe(4)
    expect(s.getItem("alg_nav_groups_v2")).toBe("a")
    expect(s.getItem("alg.tai-anh.lastJobId__org")).toBe("b")
    expect(s.getItem("alg:brochure:T01")).toBe("c")
    expect(s.getItem("alg:visitor")).toBe("d")
    expect(s.getItem("khac")).toBe("giữ")
    expect(s.getItem("smeos_nav_groups_v2")).toBeNull()
  })

  it("khoá mới đã có thì giữ; smeos thắng floraos khi trùng", () => {
    const s = memoryStorage({ alg_locale: "en", smeos_locale: "vi", smeos_x: "moi", floraos_x: "cu" })
    migrateLegacyBrandKeys(s)
    expect(s.getItem("alg_locale")).toBe("en")
    expect(s.getItem("alg_x")).toBe("moi")
    expect(s.length).toBe(2)
  })

  it("chạy lại không đổi gì; kho lỗi không ném", () => {
    const s = memoryStorage({ alg_a: "1" })
    expect(migrateLegacyBrandKeys(s)).toBe(0)
    const broken = { get length(): number { throw new Error("chặn") } } as unknown as Storage
    expect(migrateLegacyBrandKeys(broken)).toBe(0)
  })
})
