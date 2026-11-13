import { describe, expect, it } from "vitest"
import { generateQRCodeDataUrl, generateQRCodeSvg } from "../qr-engine"

describe("qr-engine", () => {
  it("generates png data url correctly", async () => {
    const url = "https://app.avilotusgroup.com/c/hoa-khai-truong"
    const dataUrl = await generateQRCodeDataUrl(url)
    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })

  it("generates svg string correctly", async () => {
    const url = "https://app.avilotusgroup.com/c/hoa-khai-truong"
    const svg = await generateQRCodeSvg(url)
    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
  })
})
