import { describe, expect, it } from "vitest"

import { filterMarketplaceStores } from "../partner-marketplace-filter"
import { driveThumbnailUrl, extractDriveIds, matchKeyOf, normalizeTier, rowToProfile, rowsToProfiles, searchTextOf } from "../partner-marketplace-row-mapper"

function row(overrides: Record<number, string>): string[] {
  const r = Array.from({ length: 75 }, () => "")
  for (const [i, v] of Object.entries(overrides)) r[Number(i)] = v
  return r
}

const DRIVE = "https://drive.google.com/open?id=1-nA1o5JGhJUl0tKfNCpouAi0glR3qhRI, https://drive.google.com/file/d/1B32-1PUTZVhOs99vs-oPto1Sjh6VW08m/view"

describe("rowToProfile — 75 cột khảo sát", () => {
  it("cột 62 là phí giao hàng, 63 loại ảnh, 64 link ảnh, 65 giấy tờ, 73 hạng, 74 ghi chú (không lệch cột)", () => {
    const p = rowToProfile(
      row({ 5: "Lucky Floris", 13: "0900000000", 62: "tự lo", 63: "Mặt tiền", 64: DRIVE, 65: "GPKD", 72: "80", 73: "Hạng Tăng trưởng", 74: "ghi chú" })
    )!
    expect(p.facilityAndDelivery.deliveryFeePolicy).toBe("tự lo")
    expect(p.media.requiredPhotoTypes).toBe("Mặt tiền")
    expect(p.media.rawImageUrls).toBe(DRIVE)
    expect(p.media.driveImageIds).toEqual(["1-nA1o5JGhJUl0tKfNCpouAi0glR3qhRI", "1B32-1PUTZVhOs99vs-oPto1Sjh6VW08m"])
    expect(p.media.requiredDocuments).toBe("GPKD")
    expect(p.scoreAndTier.totalScore).toBe("80")
    expect(p.scoreAndTier.suggestedTier).toBe("Hạng Tiêu Chuẩn") // Tăng trưởng đã gộp
    expect(p.scoreAndTier.additionalNotes).toBe("ghi chú")
    expect(p.identity.ownerName).toBe("Lucky Floris")
  })

  it("dòng thiếu tên cửa hàng → null; hạng trống → hạng mặc định", () => {
    expect(rowToProfile(row({ 13: "0900" }))).toBeNull()
    expect(rowToProfile(row({ 5: "A" }))!.scoreAndTier.suggestedTier).toBe("Hạng Tiêu Chuẩn")
  })

  it("rowsToProfiles bỏ tiêu đề, dòng trống; đếm dòng thiếu tên; tên trùng giữ dòng sau", () => {
    const { profiles, skipped } = rowsToProfiles([row({ 5: "Tên" }), row({ 5: "Shop A", 13: "1" }), row({}), row({ 13: "x" }), row({ 5: "  shop   a ", 13: "2" })])
    expect(skipped).toBe(1)
    expect(profiles).toHaveLength(1)
    expect(profiles[0]!.contact.phone).toBe("2")
  })

  it("gộp Hạng Tăng trưởng vào Hạng Tiêu Chuẩn; hạng khác giữ nguyên", () => {
    expect(normalizeTier("Hạng Tăng trưởng")).toBe("Hạng Tiêu Chuẩn")
    expect(normalizeTier("  hạng tăng TRƯỞNG ")).toBe("Hạng Tiêu Chuẩn")
    expect(normalizeTier("")).toBe("Hạng Tiêu Chuẩn")
    expect(normalizeTier("Hạng Đạt Chứng nhận")).toBe("Hạng Đạt Chứng nhận")
    expect(driveThumbnailUrl("abc_DEF-123")).toBe("https://drive.google.com/thumbnail?id=abc_DEF-123&sz=w1000")
  })

  it("extractDriveIds bỏ trùng; matchKeyOf chuẩn hoá", () => {
    expect(extractDriveIds("x?id=abcdefghijk y?id=abcdefghijk")).toEqual(["abcdefghijk"])
    expect(matchKeyOf("  Lucky   FLORIS ")).toBe("lucky floris")
  })
})

describe("filterMarketplaceStores", () => {
  const mk = (name: string, tier: string, address: string, phone: string) => {
    const store = { ...rowToProfile(row({ 5: name, 13: phone, 15: address, 73: tier, 64: DRIVE }))!, id: name }
    return { store, searchText: searchTextOf(store) }
  }
  const entries = [mk("Hoa A", "Hạng Tăng trưởng", "12 Cầu Giấy", "0911"), mk("Hoa B", "", "5 Đống Đa", "0922")]

  it("đếm theo hạng trên toàn bộ, lọc theo hạng/khu vực/từ khoá", () => {
    expect(filterMarketplaceStores(entries).tierCounts).toEqual({ all: 2, "Hạng Tiêu Chuẩn": 2 })
    // Hồ sơ cũ còn lưu "Hạng Tăng trưởng" vẫn được đếm/lọc vào Hạng Tiêu Chuẩn
    const old = { ...entries[0]!, store: { ...entries[0]!.store, scoreAndTier: { ...entries[0]!.store.scoreAndTier, suggestedTier: "Hạng Tăng trưởng" } } }
    expect(filterMarketplaceStores([old], { tier: "Hạng Tiêu Chuẩn" }).total).toBe(1)
    expect(filterMarketplaceStores(entries, { tier: "Hạng Tiêu Chuẩn" }).total).toBe(2)
    expect(filterMarketplaceStores(entries, { district: "cầu giấy" }).total).toBe(1)
    expect(filterMarketplaceStores(entries, { search: "0922", field: "contact.phone" }).stores[0]!.id).toBe("Hoa B")
    expect(filterMarketplaceStores(entries, { search: "đống đa" }).total).toBe(1)
  })

  it("trường lạ không được dùng làm đường dẫn — rơi về tìm mọi thông tin; link Drive không nằm trong chuỗi tìm", () => {
    expect(filterMarketplaceStores(entries, { search: "hoa a", field: "constructor.prototype" }).total).toBe(1)
    expect(filterMarketplaceStores(entries, { search: "drive.google" }).total).toBe(0)
  })
})
