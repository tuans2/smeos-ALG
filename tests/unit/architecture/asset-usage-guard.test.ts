import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { ASSET_ID_REFERENCES, ASSET_ID_REFERENCES_IGNORED } from "@/modules/assets/infra/asset-usage-guard"
import { assetInUseMessage } from "@/modules/assets/domain/asset-lifecycle"

/**
 * SDAGF-012 (audit lại 04/11/2026): mọi cột trỏ tới `assets.id` phải được xét
 * khi xoá asset — chặn xoá (`ASSET_ID_REFERENCES`) hoặc bỏ qua có lý do
 * (`ASSET_ID_REFERENCES_IGNORED`). Bảng mới thêm cột `*asset_id*` mà không khai
 * thì CI đỏ, tránh xoá mất ảnh còn đang dùng.
 */
const SCHEMA = readFileSync(path.resolve(__dirname, "../../../prisma/schema.prisma"), "utf8")
/** Không phải tham chiếu tới asset khác: id của chính bảng asset, hàng đợi xoá. */
const NOT_A_REFERENCE = new Set(["assets.parent_asset_id", "storage_outbox.asset_id"])

function assetIdColumns(): string[] {
  const out: string[] = []
  for (const m of SCHEMA.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    for (const f of m[2]!.matchAll(/^\s+(\w*asset_ids?)\s+String/gm)) out.push(`${m[1]}.${f[1]}`)
  }
  return out
}

describe("xoá asset xét mọi nơi trỏ tới asset bằng id", () => {
  it("mọi cột *asset_id* trong lược đồ đã được khai", () => {
    const declared = new Set<string>([...ASSET_ID_REFERENCES, ...ASSET_ID_REFERENCES_IGNORED, ...NOT_A_REFERENCE])
    const missing = assetIdColumns().filter((c) => !declared.has(c))
    expect(missing).toEqual([])
  })

  it("thông báo chặn xoá nói rõ ảnh đang dùng ở đâu, không trùng lặp", () => {
    expect(assetInUseMessage(["payment_proof", "payment_proof", "product_image"])).toBe(
      "Ảnh đang được dùng làm chứng từ thanh toán, ảnh sản phẩm nên chưa xoá được. Gỡ ảnh khỏi nơi đang dùng trước."
    )
  })
})
