import { describe, expect, it } from "vitest"
import { createPickedMediaUrls } from "@/components/greeting-card/coordinator/picked-media-urls"

/** Vòng đời URL video đã chọn ở form ảnh/video Điều phối: không thu hồi URL của video vẫn đang hiển thị. */
function fakeUrlApi() {
  let n = 0
  const revoked: string[] = []
  return {
    revoked,
    api: { createObjectURL: () => `blob:test/${++n}`, revokeObjectURL: (url: string) => void revoked.push(url) },
  }
}

describe("URL video đã chọn", () => {
  it("bỏ một video chỉ thu hồi URL của video đó; các video còn lại giữ URL", () => {
    const { api, revoked } = fakeUrlApi()
    const urls = createPickedMediaUrls(api)
    const a = urls.create(new Blob())
    const b = urls.create(new Blob())
    const c = urls.create(new Blob())
    urls.release(b)
    expect(revoked).toEqual([b])
    expect(revoked).not.toContain(a)
    expect(revoked).not.toContain(c)
  })

  it("đóng màn thu hồi phần còn lại, mỗi URL đúng một lần; ảnh (url null) bỏ qua", () => {
    const { api, revoked } = fakeUrlApi()
    const urls = createPickedMediaUrls(api)
    const a = urls.create(new Blob())
    const b = urls.create(new Blob())
    urls.release(a)
    urls.release(a)
    urls.release(null)
    urls.releaseAll()
    urls.releaseAll()
    expect(revoked).toEqual([a, b])
  })
})
