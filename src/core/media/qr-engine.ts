import QRCode from "qrcode"

export interface QRCodeOptions {
  width?: number
  margin?: number
  darkColor?: string
  lightColor?: string
  /** "H" khi đặt logo giữa mã (chịu che ~30%); mặc định "M". */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H"
}

/**
 * Sinh mã QR dạng Data URL PNG
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const { width = 400, margin = 2, darkColor = "#000000", lightColor = "#ffffff", errorCorrectionLevel = "M" } = options
  return QRCode.toDataURL(text, {
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel,
  })
}

/**
 * Sinh mã QR dạng chuỗi SVG
 */
export async function generateQRCodeSvg(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const { width = 400, margin = 2, darkColor = "#000000", lightColor = "#ffffff", errorCorrectionLevel = "M" } = options
  return QRCode.toString(text, {
    type: "svg",
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel,
  })
}

/**
 * Tải trực tiếp Data URL về máy người dùng
 */
export function triggerDownload(dataUrl: string, filename: string): void {
  if (typeof window === "undefined") return
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
