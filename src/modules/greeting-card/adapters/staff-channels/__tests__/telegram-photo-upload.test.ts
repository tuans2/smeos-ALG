import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ownPhotoUrl, uploadTelegramPhoto } from "../telegram-photo-upload"

/** Ảnh Telegram không tự tải được → máy chủ tải ảnh CỦA HỆ THỐNG rồi gửi tệp; URL lạ thì không (SSRF). */
describe("telegram photo upload fallback", () => {
  beforeEach(() => {
    vi.stubEnv("PUBLIC_APP_URL", "https://smeos-web.onrender.com")
    vi.stubEnv("STORAGE_ENDPOINT", "https://abc.r2.cloudflarestorage.com")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("chỉ nhận URL của ứng dụng hoặc kho ảnh", () => {
    expect(ownPhotoUrl("https://smeos-web.onrender.com/api/v1/public/drive-thumb-proxy?file_id=x")).toBeTruthy()
    expect(ownPhotoUrl("https://bucket.abc.r2.cloudflarestorage.com/org/o1/a.jpg?X-Amz=1")).toBeTruthy()
    expect(ownPhotoUrl("https://evil.example.com/a.jpg")).toBeNull()
    expect(ownPhotoUrl("https://smeos-web.onrender.com.evil.com/a.jpg")).toBeNull()
    expect(ownPhotoUrl("http://smeos-web.onrender.com/a.jpg")).toBeNull()
  })

  it("tải ảnh rồi gửi multipart sendPhoto", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { message_id: 7 } })))
    vi.stubGlobal("fetch", fetchMock)
    const res = await uploadTelegramPhoto("t", { chatId: "-100", photoUrl: "https://smeos-web.onrender.com/p.jpg", caption: "c" })
    expect(res).toEqual({ ok: true, messageId: 7 })
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeInstanceOf(FormData)
  })

  it("URL lạ: không tải gì", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const res = await uploadTelegramPhoto("t", { chatId: "-100", photoUrl: "https://evil.example.com/a.jpg", caption: "c" })
    expect(res.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("không phải ảnh: không gửi", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("<html>", { headers: { "content-type": "text/html" } }))
    vi.stubGlobal("fetch", fetchMock)
    const res = await uploadTelegramPhoto("t", { chatId: "-100", photoUrl: "https://smeos-web.onrender.com/p.jpg", caption: "c" })
    expect(res.ok).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
