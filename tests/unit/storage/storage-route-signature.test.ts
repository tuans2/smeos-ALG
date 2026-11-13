import { beforeEach, describe, expect, it, vi } from "vitest"

const stored = new Map<string, { body: Uint8Array; contentType: string }>()
vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({
  getStorageProvider: () => ({
    put: async (key: string, body: Uint8Array, contentType: string) => {
      stored.set(key, { body, contentType })
    },
    get: async (key: string) => {
      const file = stored.get(key)
      if (!file) throw new Error("missing")
      return file.body
    },
  }),
}))

import { GET, PUT } from "@/app/api/v1/storage/[...key]/route"
import { signStorageUrl, verifyStorageSignature } from "@/modules/assets/infra/storage-signing"

const PNG: Uint8Array<ArrayBuffer> = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])
const MP4: Uint8Array<ArrayBuffer> = new Uint8Array([0, 0, 0, 0x20, ...Array.from("ftypisom", (c) => c.charCodeAt(0))])

function url(key: string, query = ""): string {
  return `http://localhost/api/v1/storage/${key}${query}`
}
function signed(key: string, method: "GET" | "PUT"): string {
  const exp = Date.now() + 60_000
  return `?exp=${exp}&sig=${signStorageUrl(key, exp, method)}`
}
function params(key: string) {
  return { params: Promise.resolve({ key: key.split("/") }) }
}
function put(key: string, query: string, body: Uint8Array<ArrayBuffer>, contentType = "image/png") {
  return PUT(new Request(url(key, query), { method: "PUT", headers: { "content-type": contentType }, body }), params(key))
}

beforeEach(() => stored.clear())

describe("chữ ký URL kho gắn với phương thức", () => {
  it("chữ ký GET không hợp lệ cho PUT và ngược lại", () => {
    const exp = Date.now() + 60_000
    expect(verifyStorageSignature("k", exp, signStorageUrl("k", exp, "GET"), "PUT")).toBe(false)
    expect(verifyStorageSignature("k", exp, signStorageUrl("k", exp, "PUT"), "GET")).toBe(false)
    expect(verifyStorageSignature("k", exp, signStorageUrl("k", exp, "PUT"), "PUT")).toBe(true)
  })
})

describe("/api/v1/storage/[...key]", () => {
  it("không miễn chữ ký cho tiền tố videos/ — cả đọc lẫn ghi", async () => {
    const key = "videos/org-a/job-1.mp4"
    stored.set(key, { body: MP4, contentType: "video/mp4" })
    expect((await GET(new Request(url(key)), params(key))).status).toBe(400)
    expect((await put(key, "", MP4, "video/mp4")).status).toBe(400)
    expect(stored.get(key)?.body).toBe(MP4)
  })

  it("URL xem đã ký không dùng để ghi đè tệp được", async () => {
    const key = "org/org-a/p/asset.png"
    expect((await put(key, signed(key, "GET"), PNG)).status).toBe(400)
    expect(stored.has(key)).toBe(false)
  })

  it("PUT đã ký hợp lệ: lưu với kiểu tệp từ key, bỏ qua content-type client gửi", async () => {
    const key = "org/org-a/p/asset.png"
    expect((await put(key, signed(key, "PUT"), PNG, "text/html")).status).toBe(200)
    expect(stored.get(key)?.contentType).toBe("image/png")
    const res = await GET(new Request(url(key, signed(key, "GET"))), params(key))
    expect(res.status).toBe(200)
  })

  it("PUT từ chối nội dung không khớp kiểu tệp và kiểu tệp ngoài danh sách", async () => {
    const html = new TextEncoder().encode("<svg onload=alert(1)>")
    const png = "org/org-a/p/x.png"
    expect((await put(png, signed(png, "PUT"), html)).status).toBe(400)
    const svg = "org/org-a/p/x.svg"
    expect((await put(svg, signed(svg, "PUT"), html, "image/svg+xml")).status).toBe(400)
    expect(stored.size).toBe(0)
  })

  it("PUT từ chối khi content-length khai vượt giới hạn", async () => {
    const key = "org/org-a/p/big.png"
    const req = new Request(url(key, signed(key, "PUT")), {
      method: "PUT",
      headers: { "content-length": String(500 * 1024 * 1024) },
      body: PNG,
    })
    expect((await PUT(req, params(key))).status).toBe(400)
    expect(stored.size).toBe(0)
  })
})
