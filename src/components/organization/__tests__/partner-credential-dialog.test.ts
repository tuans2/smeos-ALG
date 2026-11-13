import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PartnerCredentialDetails, PartnerCredentialDialog } from "../partner-credential-dialog"

/** AUD-009: mật khẩu ban đầu của đối tác mới phải hiện cho Điều hành đúng một lần. */
describe("PartnerCredentialDialog", () => {
  const noop = () => {}

  it("không có mật khẩu tạm thì không hiện gì", () => {
    expect(renderToStaticMarkup(createElement(PartnerCredentialDialog, { credential: null, onClose: noop }))).toBe("")
  })

  it("hiện tên cửa hàng, email và mật khẩu ban đầu", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerCredentialDetails, {
        credential: { storeName: "Tiệm Hoa Cầu Giấy", email: "chutiem@vi-du.test", temporaryPassword: "Abc_123-xyz09QWE" },
        copied: false,
        onCopy: noop,
      })
    )
    expect(html).toContain("Tiệm Hoa Cầu Giấy")
    expect(html).toContain("chutiem@vi-du.test")
    expect(html).toContain("Abc_123-xyz09QWE")
    expect(html).toContain("Sao chép")
  })
})
