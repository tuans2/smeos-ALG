import sharp from "sharp"

/**
 * Đổi logo SVG (do `logo-svg.ts` tự dựng, không nhận SVG từ người dùng) sang PNG để lưu vào kho như mọi ảnh
 * khác — kho không nhận SVG (luật kiểm nội dung tải lên). Nền trong suốt.
 */
export async function svgToPng(svg: string, size: number): Promise<Uint8Array> {
  const png = await sharp(Buffer.from(svg, "utf8"), { density: 288 })
    .resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  return new Uint8Array(png)
}
