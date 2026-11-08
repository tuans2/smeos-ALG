"use client"

/** SVG do hệ thống tự dựng (đã thoát ký tự) → `data:` URL để hiện trong `<img>` (không chạy script). */
export function svgDataUrl(svg: string): string {
  let binary = ""
  for (const byte of new TextEncoder().encode(svg)) binary += String.fromCharCode(byte)
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadSvg(svg: string, filename: string) {
  save(new Blob([svg], { type: "image/svg+xml" }), filename)
}

/** Vẽ SVG lên canvas để tải bản PNG (dùng được cho Facebook/Zalo không nhận SVG). */
export async function downloadPng(svg: string, width: number, height: number, filename: string): Promise<void> {
  const img = new Image()
  img.decoding = "async"
  img.src = svgDataUrl(svg)
  await img.decode()
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  canvas.getContext("2d")?.drawImage(img, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (blob) save(blob, filename)
}

/** Tên tệp không dấu, gạch nối: "Tiệm Hoa Mộc Lan" → "tiem-hoa-moc-lan". */
export function fileSlug(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "thuong-hieu"
}
