import { describe, expect, it } from "vitest"

import type { StorageProvider } from "@/core/ports"
import type { TenantContext } from "@/core/tenancy"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { BRAND_STYLES } from "../domain/brand-styles"
import { buildLogoSvg } from "../domain/logo-svg"
import { LOGO_PNG_SIZE, storeGeneratedLogo } from "./store-generated-logo"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u1", branchId: null, capabilities: new Set<string>() } as TenantContext

describe("lưu logo của phương án được chọn", () => {
  it("SVG tự dựng → PNG thật (sharp) → ghi kho theo khoá của tổ chức + bản ghi asset", async () => {
    const puts: Array<{ key: string; type: string; bytes: Uint8Array }> = []
    const created: Array<Record<string, unknown>> = []
    const storage = { put: async (key: string, bytes: Uint8Array, type: string) => { puts.push({ key, type, bytes }) } } as unknown as StorageProvider
    const assets = { create: async (_c: TenantContext, input: Record<string, unknown>) => { created.push(input); return input } } as unknown as IAssetRepository

    const svg = buildLogoSvg({ name: "Tiệm hoa Mộc Lan", initials: "ML", palette: BRAND_STYLES.LUXURY.palette, fontHeading: "Playfair Display", layout: "MONOGRAM" })
    const id = await storeGeneratedLogo(ctx, svg, { storage, assets })

    expect(puts).toHaveLength(1)
    expect(puts[0]!.key).toBe(`org/org-a/unfiled/${id}.png`)
    expect(puts[0]!.type).toBe("image/png")
    expect([...puts[0]!.bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(created[0]).toMatchObject({ id, kind: "MARKETING", width: LOGO_PNG_SIZE, metadata: { asset_type_code: "TH01" } })
  })
})
