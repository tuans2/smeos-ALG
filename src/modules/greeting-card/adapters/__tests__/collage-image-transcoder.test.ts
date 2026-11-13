import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { webpToJpegDataUrl } from "../collage-image-transcoder"

describe("webpToJpegDataUrl", () => {
  it("đổi ảnh WEBP sang JPG để thumbnail đọc được", async () => {
    const webp = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#e07a3a" } }).webp().toBuffer()
    const url = await webpToJpegDataUrl(webp)
    expect(url?.startsWith("data:image/jpeg;base64,")).toBe(true)
    const meta = await sharp(Buffer.from(url!.split(",")[1]!, "base64")).metadata()
    expect(meta.format).toBe("jpeg")
  })
  it("ảnh hỏng → null", async () => {
    expect(await webpToJpegDataUrl(new Uint8Array([1, 2, 3]))).toBeNull()
  })
})
