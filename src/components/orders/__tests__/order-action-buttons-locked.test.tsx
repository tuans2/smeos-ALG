import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { OrderActionButtons } from "../order-action-buttons"

/** Audit N-05: Điều phối đang khoá "Sắp ra mắt" (production) thì không đưa nút "Theo dõi ở Điều phối" trên đơn. */
const render = () =>
  renderToStaticMarkup(
    <OrderActionButtons orderStatus="CONFIRMED" deliveryStatus="PENDING" onPrint={() => undefined} onCancelRequest={() => undefined} />
  )

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("OrderActionButtons — lối vào Điều phối", () => {
  it("khoá tắt: có link tới /dieu-phoi", () => {
    expect(render()).toContain('href="/dieu-phoi"')
  })

  it("khoá bật: không còn link tới /dieu-phoi, nút In vẫn còn", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production")
    const html = render()
    expect(html).not.toContain('href="/dieu-phoi"')
    expect(html).toContain("A6")
  })
})
