import { describe, expect, it } from "vitest"

import { safeRemotePhotoUrl } from "../telegram-adapter"

/** Ảnh gửi kèm tin Telegram: máy chủ không tự tải URL hay đọc tệp theo dữ liệu tiệm nhập (rà soát cụm G). */
describe("safeRemotePhotoUrl", () => {
  it("chỉ nhận URL https công khai", () => {
    expect(safeRemotePhotoUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg")
  })

  it("từ chối http, đường dẫn tệp, khoá kho và địa chỉ máy nội bộ", () => {
    for (const raw of [
      "http://cdn.example.com/a.jpg",
      "/.env",
      "../../.env",
      "org/o1/a.jpg",
      "https://localhost/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://10.0.0.5/x?.onrender.com",
      "https://192.168.1.2/a.jpg",
      "https://172.20.0.1/a.jpg",
      "https://169.254.169.254/latest",
      "https://[::1]/a.jpg",
      "file:///etc/passwd",
      "",
    ]) {
      expect(safeRemotePhotoUrl(raw)).toBeNull()
    }
  })
})
