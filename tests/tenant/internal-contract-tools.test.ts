import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-tools"
import { GET as promotions, POST as bannerCopy } from "@/app/api/v1/ad-banner-poster/copy/route"
import { POST as bannerRender } from "@/app/api/v1/ad-banner-poster/render/route"
import { POST as bannerSave } from "@/app/api/v1/ad-banner-poster/save/route"
import { GET as fieldCatalogs } from "@/app/api/v1/field-config/catalogs/route"
import { GET as fieldConfig, POST as createField, PUT as updateField } from "@/app/api/v1/field-config/route"
import { GET as fieldSettings } from "@/app/api/v1/field-config/settings/route"
import { GET as identity } from "@/app/api/v1/noi-bo/identity/route"
import { GET as proxyGet } from "@/app/api/v1/proxy/[...path]/route"
import { DELETE as removeOverride } from "@/app/api/v1/template-overrides/[templateKey]/[fieldKey]/route"
import { GET as listOverrides, PUT as putOverride } from "@/app/api/v1/template-overrides/route"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi nhóm công cụ (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. Không có khoá LLM → bản dựng sẵn. */
const BASE = "http://localhost/api/v1"
const CATALOG = "hop_dong_muc_uu_tien"
const PNG_1X1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

describe("hợp đồng — ấn phẩm quảng cáo, trường dữ liệu, ghi đè mẫu, định danh, proxy", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-cong-cu")
  })
  afterAll(async () => {
    await prisma.field_catalogs.deleteMany({ where: { key: CATALOG } })
    await disconnectDatabase()
  })

  it("ấn phẩm quảng cáo: ưu đãi, viết chữ, dựng, lưu thư viện", async () => {
    await expectContract(await promotions(get("/ad-banner-poster/copy")), 200, R.bannerPromotionsResponse, "banner-promotions")
    const copy = await expectContract(await bannerCopy(send("/ad-banner-poster/copy", "POST", { occasion_key: "women_day", occasion_label: "8/3", shop_name: "Tiệm hoa Mộc Lan", product_title: "Bó hồng pastel" })), 200, R.bannerCopyResponse, "banner-copy")
    const c = copy.copy as { headline: string; subHeadline: string; promotionBadge: string; ctaText: string }
    await expectContract(
      await bannerRender(send("/ad-banner-poster/render", "POST", { occasion_key: "women_day", occasion_label: "8/3", copy: c, brand_info: { shopName: "Tiệm hoa Mộc Lan", hotline: "0901234567" }, style_preset_id: "FESTIVE_SEASON", target_formats: ["1:1", "9:16"] })),
      200, R.bannerRenderResponse, "banner-render"
    )
    await expectContract(await bannerSave(send("/ad-banner-poster/save", "POST", { title: "Banner 8/3", asset_type_code: "BANNER", image_data: PNG_1X1, width: 1, height: 1 })), 201, R.bannerSavedResponse, "banner-save")
  })

  it("trường dữ liệu: cấu hình hiệu lực, danh mục, cài đặt, tạo, sửa", async () => {
    // Danh mục là bảng nền tảng (không theo tổ chức, `resetDatabase` không xoá) — gieo rồi dọn ở `afterAll`.
    await prisma.field_catalogs.deleteMany({ where: { key: CATALOG } })
    await prisma.field_catalogs.create({ data: { key: CATALOG, label: "Mức ưu tiên", values: { create: [{ code: "GAP", label: "Gấp", sort_order: 1 }, { code: "CU", label: "Cũ", is_active: false }] } } })
    await expectContract(await fieldCatalogs(get(`/field-config/catalogs?keys=${CATALOG}`)), 200, R.fieldCatalogsResponse, "field-catalogs")
    const created = await expectContract(await createField(send("/field-config", "POST", { entity: "ORDER", label: "Mã thẻ thành viên", dataType: "TEXT" })), 201, R.shopFieldCreatedResponse, "field-create")
    const key = String((created.data as { key: string }).key)
    await expectContract(await fieldConfig(get("/field-config?entity=ORDER")), 200, R.fieldConfigResponse, "field-config")
    await expectContract(await updateField(send("/field-config", "PUT", { key, label: "Mã thẻ hội viên", isEnabled: false })), 200, R.shopFieldUpdatedResponse, "field-update")
    await expectContract(await fieldSettings(get("/field-config/settings?entity=ORDER")), 200, R.fieldSettingsResponse, "field-settings")
  })

  it("ghi đè mẫu, định danh tổ chức, proxy", async () => {
    await expectContract(await putOverride(send("/template-overrides", "PUT", { templateFamily: "ST", templateKey: "sales_pitch_zalo", fieldKey: "greeting_line", value: "Chào anh/chị, Mộc Lan xin gửi mẫu hoa" })), 200, R.templateOverrideResponse, "override-put")
    await expectContract(await listOverrides(get("/template-overrides?templateKey=sales_pitch_zalo")), 200, R.templateOverridesResponse, "overrides")
    expect((await listOverrides(get("/template-overrides"))).status).toBe(400)
    expect((await putOverride(send("/template-overrides", "PUT", { templateFamily: "ST", templateKey: "khong-co", fieldKey: "x", value: "y" }))).status).toBe(400)
    const params = { params: Promise.resolve({ templateKey: "sales_pitch_zalo", fieldKey: "greeting_line" }) }
    await expectContract(await removeOverride(send("/template-overrides/sales_pitch_zalo/greeting_line", "DELETE"), params), 200, R.okResponse, "override-remove")
    expect((await removeOverride(send("/template-overrides/sales_pitch_zalo/greeting_line", "DELETE"), params)).status).toBe(404) // đã bỏ rồi
    expect((await bannerSave(send("/ad-banner-poster/save", "POST", { title: "x", asset_type_code: "BANNER", image_data: "aGVsbG8=" }))).status).toBe(400) // không phải PNG
    await expectContract(await identity(get("/noi-bo/identity")), 200, R.identityResponse, "identity")
    const px = (path: string, client = "SOCIALFLOW") => proxyGet(get(`/proxy/${path}?client=${client}`), { params: Promise.resolve({ path: path.split("/") }) })
    expect((await px("api/posts", "KHAC")).status).toBe(400)
    expect((await px("api/khong-duoc-phep")).status).toBe(404)
  })
})
