import React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { FloraOSGlobalCopilot } from "../floraos-global-copilot"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe("FloraOSGlobalCopilot (S3-04, UI-F-01)", () => {
  it("renders floating trigger button with accessible label and keyboard hint", () => {
    const html = renderToStaticMarkup(<FloraOSGlobalCopilot />)

    expect(html).toContain('aria-label="Mở ALG Copilot"')
    expect(html).toContain("ALG Copilot")
    expect(html).toContain("⌘K")
  })
})
