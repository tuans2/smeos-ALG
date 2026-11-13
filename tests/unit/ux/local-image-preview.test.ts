import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { LocalImagePreview } from "@/components/upload/local-image-preview"
import { SubcontractPodPreview } from "@/components/greeting-card/subcontract/subcontract-pod-preview"
import { SubcontractQcPreview } from "@/components/greeting-card/subcontract/subcontract-qc-preview"

/** Ảnh xem trước tệp cục bộ vẽ lên canvas: không có object URL nào đi vào `src` (CodeQL js/xss-through-dom). */

const file = new File([new Uint8Array([1, 2, 3])], "hoa.jpg", { type: "image/jpeg" })
const noop = () => {}

describe("ảnh xem trước tệp cục bộ", () => {
  it("dựng canvas có nhãn trợ năng, đúng độ phân giải vẽ, không có <img>", () => {
    const html = renderToStaticMarkup(createElement(LocalImagePreview, { file, label: "Ảnh 1", width: 640, height: 360 }))
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Ảnh 1"')
    expect(html).toContain('width="640"')
    expect(html).toContain('height="360"')
    expect(html).not.toContain("<img")
  })

  it("phiếu giao hàng và phiếu QC xem trước bằng canvas, không dùng blob URL", () => {
    const pod = renderToStaticMarkup(createElement(SubcontractPodPreview, { file, submitting: false, onCancel: noop }))
    const qc = renderToStaticMarkup(createElement(SubcontractQcPreview, { selectedFile: file, uploadingQc: false, onCancel: noop, onUpload: noop }))
    for (const html of [pod, qc]) {
      expect(html).toContain("<canvas")
      expect(html).not.toContain("<img")
      expect(html).not.toContain("blob:")
    }
    expect(qc).toContain("hoa.jpg")
  })
})
