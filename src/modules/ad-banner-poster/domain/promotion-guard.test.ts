import { describe, expect, it } from "vitest"
import { enforceShopPromotion, shopPromotionBadge } from "./promotion-guard"

const copy = { headline: "Mừng sinh nhật", subHeadline: "Hoa tươi gửi người thương", promotionBadge: "GIẢM 50%", ctaText: "ĐẶT NGAY", validityText: "Chỉ hôm nay" }

describe("Ưu đãi trên poster chỉ theo Hồ sơ tiệm", () => {
  it("thay nhãn AI tự đặt bằng ưu đãi tiệm đang bật, bỏ thời hạn tự đặt", () => {
    expect(enforceShopPromotion(copy, ["Tặng thiệp"])).toMatchObject({ promotionBadge: "TẶNG THIỆP", validityText: "" })
  })

  it("tiệm chưa bật ưu đãi → nhãn rỗng", () => {
    expect(enforceShopPromotion(copy, [])?.promotionBadge).toBe("")
  })

  it("tiệm chưa bật ưu đãi mà tiêu đề vẫn hứa giảm giá → bỏ bản AI", () => {
    expect(enforceShopPromotion({ ...copy, headline: "Giảm 30% toàn bộ" }, [])).toBeNull()
  })

  it("chọn đúng ưu đãi người dùng muốn nếu tiệm có bật", () => {
    expect(shopPromotionBadge(["Giảm 10%", "Tặng thiệp"], "tặng thiệp")).toBe("TẶNG THIỆP")
    expect(shopPromotionBadge(["Giảm 10%"], "Giảm 50%")).toBe("GIẢM 10%")
    expect(shopPromotionBadge([], "Giảm 50%")).toBe("")
  })
})
