import { describe, expect, it } from "vitest"
import { AI_FIELDS, fillEmptyFields, visionToFields, type AiFieldValues } from "./vision-suggestions"

const empty = Object.fromEntries(AI_FIELDS.map((f) => [f, ""])) as AiFieldValues

const vision = {
  productName: "Bó hồng Juliet",
  components: [{ flowerType: "Hồng Juliet", quantityEstimate: 10, unit: "cành" }, { flowerType: "Cát tường" }],
  attributes: { mainColors: ["Hồng pastel"], secondaryColors: ["Trắng"], style: "Lãng mạn", shape: "Bó tròn" },
  packaging: { wrappingMaterial: "Giấy Hàn", wrappingColor: "Kem", ribbon: "Ruy băng lụa" },
  context: { likelyOccasions: ["Sinh nhật"] },
}

describe("vision-suggestions", () => {
  it("đổi kết quả phân tích thành giá trị từng trường", () => {
    const f = visionToFields(vision)
    expect(f).toMatchObject({ name: "Bó hồng Juliet", category: "Bó hoa tươi", occasion: "Sinh nhật", style: "Lãng mạn" })
    expect(f.components).toBe("Hồng Juliet (~10 cành), Cát tường")
    expect(f.colors).toBe("Hồng pastel, Trắng")
    expect(f.description).toContain("Gồm Hồng Juliet")
  })

  it("chỉ điền trường trống và chưa sửa tay; không có trường giá/mã", () => {
    const patch = fillEmptyFields({ ...empty, name: "Tên của tôi", style: "" }, visionToFields(vision), new Set(["style"]))
    expect(patch.name).toBeUndefined()
    expect(patch.style).toBeUndefined()
    expect(patch.colors).toBe("Hồng pastel, Trắng")
    expect(Object.keys(patch)).not.toContain("price")
    expect(Object.keys(patch)).not.toContain("code")
  })

  it("AI không biết thì để trống, không bịa", () => {
    expect(fillEmptyFields(empty, visionToFields({}), new Set())).toEqual({})
  })
})
