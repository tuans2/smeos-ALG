import { expect, test, type APIRequestContext } from "@playwright/test"
import { approveAndLogin } from "./ux/helpers"

/**
 * E2E Test — Swipe Brochure / Thẻ Chào (03/10/2026, cập nhật 08/10 cho lễ 20/10)
 *
 * Luồng đầu cuối:
 *   Điều hành đăng ký → sửa Hồ sơ tiệm (hồ sơ mẫu bị chặn gửi link) → tạo catalog → tạo link /b/T01-xxx
 *   → Khách nhận phiên → xem mẫu hoa → chọn ưu đãi "Giảm 10%" → đặt → báo thanh toán
 *   → Điều hành xác nhận → Khách xem tracking → mở lại ở trình duyệt khác bằng 4 số cuối SĐT
 *
 * Yêu cầu: docker compose up -d + npm run dev đang chạy tại localhost:3200
 */

test.describe.configure({ mode: "serial" })

const BASE = "http://localhost:3200"

// Đăng ký tenant & lấy session cookie
async function registerTenant(request: APIRequestContext, suffix: string) {
  const email = `brochure-test-${suffix}@floraos-e2e.local`
  const orgName = `BrochureTest ${suffix}`

  // Đăng ký chờ superadmin duyệt (PO 22/10/2026): duyệt trong CSDL test rồi đăng nhập lấy cookie phiên
  const regRes = await request.post(`${BASE}/api/v1/auth/signup`, {
    data: { email, password: "Test@12345!", organization_name: orgName },
  })
  expect(regRes.status()).toBe(202)
  await approveAndLogin(request, email, "Test@12345!", BASE)
  return { email, orgName }
}

test.describe("Brochure / Thẻ Chào — Luồng chính", () => {
  // Một context dùng chung cho cả chuỗi: fixture `request` mặc định tạo context
  // mới mỗi ca nên mất cookie phiên giữa các bước.
  let request: APIRequestContext
  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext()
  })
  test.afterAll(async () => {
    await request.dispose()
  })

  let catalogId: string
  let productId: string
  let sendCode: string
  let orderId: string
  let orderCode: string
  let claimOpened: boolean
  const deliveryDate = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)

  test("1. Tạo catalog và link gửi khách", async () => {
    await registerTenant(request, Date.now().toString())

    // Tiệm mới (môi trường dev) mang hồ sơ mẫu "Tiệm Hoa Mộc Lan" — máy chủ chặn gửi link tới khi sửa
    const profileRes = await request.put(`${BASE}/api/v1/business-profile`, {
      data: { display_name: "Tiệm Hoa E2E", phone: "0901234567", address: "1 Lê Lợi, Quận 1" },
    })
    expect(profileRes.status()).toBe(200)

    // Tạo sản phẩm có giá (Thẻ chào không bán mẫu chưa có giá)
    const prodRes = await request.post(`${BASE}/api/v1/products`, {
      data: { code: `E2E-${Date.now()}`, name: "Bó hồng E2E", attributes: { price: 650000 } },
    })
    expect(prodRes.status()).toBe(201)
    productId = ((await prodRes.json()) as { id: string }).id

    // Tạo catalog
    const catRes = await request.post(`${BASE}/api/v1/greeting-card/catalogs`, {
      data: { code: `e2e-${Date.now()}`, name: "Catalog E2E Test", type: "STANDARD", product_ids: [productId] },
    })
    expect(catRes.status()).toBe(201)
    const catJson = await catRes.json() as { data: { id: string } }
    catalogId = catJson.data.id
    expect(catalogId).toBeTruthy()

    // Tạo send link
    const linkRes = await request.post(`${BASE}/api/v1/greeting-card/send-links`, {
      data: { catalog_id: catalogId, customer_name: "Khách E2E", prefix: "T99" },
    })
    expect(linkRes.status()).toBe(201)
    const linkJson = await linkRes.json() as { data: { sendCode: string } }
    sendCode = linkJson.data.sendCode
    expect(sendCode).toMatch(/^T99-[A-Z0-9]{8}$/)
  })

  test("2. Khách mở link brochure công khai", async () => {
    expect(sendCode).toBeTruthy()

    // Trình duyệt đầu tiên chạy trang nhận chủ phiên; API phiên chỉ trả cho chủ phiên
    const claim = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/claim`)
    expect(claim.status()).toBe(200)
    claimOpened = ((await claim.json()) as { opened: boolean }).opened
    const res = await request.get(`${BASE}/api/v1/public/brochure/${sendCode}`)
    expect(res.status()).toBe(200)

    const json = await res.json() as {
      session: { sendCode: string }
      catalog: { name: string }
      products: Array<{ id: string; price: number | null }>
    }
    expect(json.session.sendCode).toBe(sendCode)
    expect(json.catalog.name).toBe("Catalog E2E Test")
    expect(json.products[0]?.price).toBe(650000)
  })

  test("2a. Trình duyệt nhận phiên = báo đã mở, đúng một lần", async () => {
    expect(claimOpened).toBe(true)
    const again = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/open`)
    expect(((await again.json()) as { opened: boolean }).opened).toBe(false)
  })

  test("2b. Khách chọn mẫu — giá khách gửi lên bị bỏ qua", async () => {
    const res = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/select`, {
      data: { productId, product: { price: 1000 } },
    })
    expect(res.status()).toBe(200)
    const json = await res.json() as { data: { snapshot: { price: number } } }
    expect(json.data.snapshot.price).toBe(650000)
  })

  test("3. Khách đặt hoa qua brochure — ưu đãi Giảm 10% trên tổng đơn", async () => {
    expect(sendCode).toBeTruthy()

    const quote = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/quote`, {
      data: { selectedPromotionId: "promo-discount-10", deliveryDate },
    })
    expect(quote.status()).toBe(200)
    const quoteJson = await quote.json() as { quote: { totalVnd: number; promotionDiscountVnd?: number }; fullSlots: string[] }
    expect(quoteJson.quote).toMatchObject({ totalVnd: 585000, promotionDiscountVnd: 65000 })
    expect(quoteJson.fullSlots).toEqual([])

    const res = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/order`, {
      data: {
        confirmedTerms: true,
        selectedPromotionId: "promo-discount-10",
        customerName: "Khách E2E",
        customerPhone: "0901234599",
        recipientName: "Người nhận E2E",
        recipientPhone: "0912345699",
        deliveryDate,
        deliveryAddress: "123 Đường E2E, Quận 1, TP.HCM",
        cardMessage: "Chúc mừng E2E test!",
      },
    })
    expect(res.status()).toBe(201)

    const json = await res.json() as { orderId: string; orderCode: string; totalVnd: number }
    orderId = json.orderId
    orderCode = json.orderCode
    expect(orderId).toBeTruthy()
    expect(json.totalVnd).toBe(585000)
  })

  test("4. Khách báo đã chuyển khoản", async () => {
    expect(sendCode).toBeTruthy()

    // Tiệm mặc định bắt buộc ảnh bill (máy chủ kiểm) — tải ảnh PNG nhỏ trước khi báo
    const png = Buffer.from("89504E470D0A1A0A0000000D4948445200000001000000010806000000", "hex")
    const proof = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/payment-proof`, {
      multipart: { file: { name: "bill.png", mimeType: "image/png", buffer: png }, purpose: "DEPOSIT" },
    })
    expect(proof.status()).toBeLessThan(300)
    const { assetId } = (await proof.json()) as { assetId: string }

    const res = await request.post(`${BASE}/api/v1/public/brochure/${sendCode}/payment-notify`, { data: { proofAssetId: assetId } })
    expect(res.status()).toBeLessThan(300)
  })

  test("5. Admin xác nhận thanh toán", async () => {
    expect(orderId).toBeTruthy()

    const res = await request.post(
      `${BASE}/api/v1/greeting-card/orders/${orderId}/confirm-payment`,
      { data: { note: "Đã nhận CK — E2E test" } }
    )
    expect(res.status()).toBeLessThan(300)

    const json = await res.json() as { data: { status: string } }
    expect(json.data.status).toBe("CONFIRMED")
  })

  test("6. Khách xem trang theo dõi đơn hàng", async () => {
    expect(sendCode).toBeTruthy()

    const res = await request.get(`${BASE}/api/v1/public/brochure/tracking/${orderCode}`)
    expect(res.status()).toBe(200)
    const json = await res.json() as { order: { status: string } }
    expect(json.order.status).toBe("CONFIRMED")
  })

  test("6b. Theo dõi theo mã đơn: rút gọn; đúng 4 số cuối SĐT mới thấy đầy đủ", async () => {
    const anon = await request.get(`${BASE}/api/v1/public/brochure/tracking/${orderCode}`)
    const anonJson = await anon.json() as { order: { verified: boolean; cardMessage: string | null } }
    expect(anonJson.order).toMatchObject({ verified: false, cardMessage: null })
    expect(JSON.stringify(anonJson)).not.toContain("0901234599")

    const wrong = await request.post(`${BASE}/api/v1/public/brochure/tracking/${orderCode}`, { data: { phoneLast4: "0000" } })
    expect(wrong.status()).toBe(404)
    const right = await request.post(`${BASE}/api/v1/public/brochure/tracking/${orderCode}`, { data: { phoneLast4: "4599" } })
    expect(right.status()).toBe(200)
    const full = await right.json() as { order: { verified: boolean; cardMessage: string | null } }
    expect(full.order).toMatchObject({ verified: true, cardMessage: "Chúc mừng E2E test!" })
  })

  test("7. Tenant isolation — tenant khác không thấy catalog", async () => {
    await registerTenant(request, `other-${Date.now()}`)

    // Tenant mới không thấy catalog của tenant cũ
    const res = await request.get(`${BASE}/api/v1/greeting-card/catalogs`)
    expect(res.status()).toBe(200)
    const json = await res.json() as { data: unknown[] }
    const ids = (json.data as Array<{ id: string }>).map((c) => c.id)
    expect(ids).not.toContain(catalogId)
  })

  test("8. Trình duyệt khác: link đã có đơn hỏi 4 số cuối SĐT, đúng số thì vào lại được phiên", async ({ page, playwright }) => {
    expect(sendCode).toBeTruthy()
    const res = await page.goto(`${BASE}/b/${sendCode}`)
    expect(res?.status()).toBe(200)
    await expect(page.getByText("4 số cuối").first()).toBeVisible()

    const other = await playwright.request.newContext()
    try {
      expect((await other.get(`${BASE}/api/v1/public/brochure/${sendCode}`)).status()).toBe(404)
      const wrong = await other.post(`${BASE}/api/v1/public/brochure/${sendCode}/unlock`, { data: { phoneLast4: "0000" } })
      expect(wrong.status()).toBe(404)
      const right = await other.post(`${BASE}/api/v1/public/brochure/${sendCode}/unlock`, { data: { phoneLast4: "4599" } })
      expect(right.status()).toBe(200)
      expect((await other.get(`${BASE}/api/v1/public/brochure/${sendCode}`)).status()).toBe(200)
    } finally {
      await other.dispose()
    }
  })
})
