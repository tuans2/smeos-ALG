import { describe, expect, it } from "vitest"
import {
  canResume, createCollectionSession, currentIndex, decide, fromLegacySwipes, goNext, goPrevious, jumpTo, restart, toggleLike, undo,
} from "../collection-session"

const ORDER = ["a", "b", "c"]
const NOW = new Date("2026-10-06T08:00:00Z")
const fresh = () => createCollectionSession({ sessionId: "s1", collectionId: "c1", order: ORDER, now: NOW })

describe("collection-session", () => {
  it("phiên mới bắt đầu ở mẫu đầu, đã xem mẫu đó, chưa có đơn", () => {
    const s = fresh()
    expect(s.currentProductId).toBe("a")
    expect(s.viewedProductIds).toEqual(["a"])
    expect(s.orderId).toBeNull()
    expect(s.onboarded).toBe(false)
  })

  it("thích nhiều mẫu, bỏ qua mẫu khác, hết bộ sưu tập thì current = null", () => {
    let s = decide(fresh(), ORDER, "like", NOW)
    s = decide(s, ORDER, "skip", NOW)
    s = decide(s, ORDER, "like", NOW)
    expect(s.likedProductIds).toEqual(["a", "c"])
    expect(s.skippedProductIds).toEqual(["b"])
    expect(s.currentProductId).toBeNull()
    expect(currentIndex(s, ORDER)).toBe(3)
    expect(s.viewedProductIds).toEqual(["a", "b", "c"])
  })

  it("quay lại mẫu trước không làm mất Thích/Bỏ qua; từ màn cuối quay về mẫu cuối", () => {
    let s = decide(decide(fresh(), ORDER, "like", NOW), ORDER, "skip", NOW)
    s = goPrevious(s, ORDER, NOW)
    expect(s.currentProductId).toBe("b")
    expect(s.likedProductIds).toEqual(["a"])
    expect(s.skippedProductIds).toEqual(["b"])
    const end = decide(decide(s, ORDER, "skip", NOW), ORDER, "skip", NOW)
    expect(goPrevious(end, ORDER, NOW).currentProductId).toBe("c")
    expect(goPrevious(fresh(), ORDER, NOW)).toEqual(fresh())
  })

  it("đổi ý trên mẫu đã quyết thì ghi đè, không trùng hai danh sách", () => {
    let s = decide(fresh(), ORDER, "skip", NOW)
    s = decide(goPrevious(s, ORDER, NOW), ORDER, "like", NOW)
    expect(s.likedProductIds).toEqual(["a"])
    expect(s.skippedProductIds).toEqual([])
  })

  it("hoàn tác xoá lựa chọn của mẫu trước", () => {
    const s = undo(decide(fresh(), ORDER, "like", NOW), ORDER, NOW)
    expect(s.currentProductId).toBe("a")
    expect(s.likedProductIds).toEqual([])
  })

  it("mẫu đang xem bị gỡ khỏi bộ sưu tập → về mẫu chưa quyết đầu tiên", () => {
    const s = decide(fresh(), ORDER, "like", NOW) // current = b
    expect(currentIndex(s, ["a", "c"])).toBe(1)
  })

  it("chỉ hỏi tiếp tục khi đã lướt và chưa có đơn; xem lại từ đầu giữ hướng dẫn", () => {
    expect(canResume(fresh(), ORDER)).toBe(false)
    const s = { ...decide(fresh(), ORDER, "like", NOW), onboarded: true }
    expect(canResume(s, ORDER)).toBe(true)
    expect(canResume({ ...s, orderId: "o1" }, ORDER)).toBe(false)
    const r = restart(s, ORDER, NOW)
    expect(r).toMatchObject({ currentProductId: "a", likedProductIds: [], onboarded: true, sessionId: "s1" })
  })

  it("nhảy tới mẫu bất kỳ; id lạ thì giữ nguyên", () => {
    expect(jumpTo(fresh(), ORDER, "c", NOW).currentProductId).toBe("c")
    expect(jumpTo(fresh(), ORDER, "zz", NOW).currentProductId).toBe("a")
  })

  it("chuyển lịch sử vuốt bản cũ, dừng ở lượt lệch thứ tự", () => {
    const s = fromLegacySwipes([{ id: "a", dir: "like" }, { id: "b", dir: "nope" }, { id: "x", dir: "like" }], fresh(), ORDER)
    expect(s.likedProductIds).toEqual(["a"])
    expect(s.skippedProductIds).toEqual(["b"])
    expect(s.currentProductId).toBe("c")
    expect(s.onboarded).toBe(true)
  })

  it("kiểu Story: goNext chỉ di chuyển, không đổi tim; ở mẫu cuối → màn cuối rồi đứng yên", () => {
    const s1 = goNext(fresh(), ORDER, NOW)
    expect(s1).toMatchObject({ currentProductId: "b", likedProductIds: [], skippedProductIds: [] })
    const end = goNext(goNext(s1, ORDER, NOW), ORDER, NOW)
    expect(currentIndex(end, ORDER)).toBe(ORDER.length)
    expect(goNext(end, ORDER, NOW)).toBe(end)
  })

  it("thả tim bật/tắt trên mẫu đang xem, không tự sang mẫu khác", () => {
    const on = toggleLike(fresh(), ORDER, NOW)
    expect(on.liked).toBe(true)
    expect(on.session).toMatchObject({ currentProductId: "a", likedProductIds: ["a"] })
    const off = toggleLike(on.session, ORDER, NOW)
    expect(off.liked).toBe(false)
    expect(off.session.likedProductIds).toEqual([])
  })

  it("mở lại link: đã đi qua mẫu đầu (dù chưa thả tim) thì hỏi tiếp tục", () => {
    expect(canResume(goNext(fresh(), ORDER, NOW), ORDER)).toBe(true)
  })
})
