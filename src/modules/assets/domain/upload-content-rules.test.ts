import { describe, expect, it } from "vitest"

import { checkUploadContent, maxUploadBytes } from "./upload-content-rules"

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const MP4 = new Uint8Array([0, 0, 0, 0x20, ...Array.from("ftypisom", (c) => c.charCodeAt(0))])
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>")

describe("checkUploadContent", () => {
  it("nhận tệp có byte đầu khớp phần mở rộng, kiểu tệp lấy từ key", () => {
    expect(checkUploadContent("org/o/p/a.png", PNG)).toEqual({ ok: true, contentType: "image/png" })
    expect(checkUploadContent("org/o/p/a.jpg", JPG)).toEqual({ ok: true, contentType: "image/jpeg" })
    expect(checkUploadContent("org/o/p/a.mp4", MP4)).toEqual({ ok: true, contentType: "video/mp4" })
    expect(checkUploadContent("org/o/p/a.csv", new TextEncoder().encode("ten,gia\nhoa,1"))).toMatchObject({ ok: true })
  })

  it("từ chối tệp HTML/script đổi tên thành ảnh", () => {
    expect(checkUploadContent("org/o/p/a.jpg", HTML)).toEqual({ ok: false, reason: "content_mismatch" })
    expect(checkUploadContent("org/o/p/a.png", JPG)).toEqual({ ok: false, reason: "content_mismatch" })
  })

  it("từ chối tệp rỗng, CSV nhị phân và kiểu tệp ngoài danh sách", () => {
    expect(checkUploadContent("org/o/p/a.png", new Uint8Array())).toEqual({ ok: false, reason: "content_mismatch" })
    expect(checkUploadContent("org/o/p/a.csv", new Uint8Array([0x41, 0x00]))).toEqual({ ok: false, reason: "content_mismatch" })
    expect(checkUploadContent("org/o/p/a.svg", HTML)).toEqual({ ok: false, reason: "unsupported_type" })
    expect(checkUploadContent("org/o/p/a.html", HTML)).toEqual({ ok: false, reason: "unsupported_type" })
  })

  it("từ chối tệp vượt giới hạn theo kiểu", () => {
    const max = maxUploadBytes("org/o/p/a.png")!
    const big = new Uint8Array(max + 1)
    big.set(PNG)
    expect(checkUploadContent("org/o/p/a.png", big)).toEqual({ ok: false, reason: "too_large" })
  })
})

describe("maxUploadBytes", () => {
  it("ảnh nhỏ hơn video; kiểu lạ không có giới hạn (không tải lên được)", () => {
    expect(maxUploadBytes("a.jpg")!).toBeLessThan(maxUploadBytes("a.mp4")!)
    expect(maxUploadBytes("a.exe")).toBeNull()
    expect(maxUploadBytes("khong-duoi")).toBeNull()
  })
})
