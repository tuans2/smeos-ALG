import sharp from "sharp"

/** Cạnh dài tối đa của ảnh đưa vào thumbnail — đủ nét cho khung 1200×630, giữ ảnh xem trước nhẹ. */
const MAX_EDGE = 1200

/**
 * Bộ dựng thumbnail (satori) chỉ đọc JPG/PNG: ảnh WEBP trong kho được đổi sang JPG.
 * Ảnh hỏng → null để thumbnail bỏ qua ảnh đó thay vì lỗi cả ảnh.
 */
export async function webpToJpegDataUrl(bytes: Uint8Array): Promise<string | null> {
  try {
    const jpeg = await sharp(bytes)
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`
  } catch {
    return null
  }
}
