import { z } from "zod"
import { describe, expect, it } from "vitest"

import * as res from "@/modules/integration/contracts/http-responses"
import { SUNSET_FIELDS, type SunsetKind } from "@/modules/integration/domain/integration-field-sunset"

/**
 * ARC-024 (PO 11/11/2026): lược đồ phản hồi (nguồn của `integration.openapi.json`) đánh dấu `deprecated` + tuỳ chọn
 * ĐÚNG bộ trường mà máy chủ bỏ từ ngày gỡ (`withoutSunsetFields`) — không thiếu, không thừa.
 */
const SCHEMAS: Record<SunsetKind, z.ZodType> = {
  asset: res.assetResponse,
  job: res.generationJobResponse,
  usage: res.usageResponse,
  masterImageAsset: res.masterImageResponse.shape.master,
  catalogLink: res.catalogLinkRecord,
}

describe("lược đồ Integration API ↔ danh sách trường sắp gỡ", () => {
  for (const [kind, schema] of Object.entries(SCHEMAS) as [SunsetKind, z.ZodType][]) {
    it(`${kind}: đúng các trường deprecated, không còn bắt buộc`, () => {
      const json = z.toJSONSchema(schema, { target: "draft-2020-12", io: "output" }) as {
        properties: Record<string, { deprecated?: boolean }>
        required?: string[]
      }
      const deprecated = Object.entries(json.properties).filter(([, p]) => p.deprecated).map(([k]) => k).sort()
      expect(deprecated).toEqual([...SUNSET_FIELDS[kind]].sort())
      for (const field of SUNSET_FIELDS[kind]) expect(json.required ?? []).not.toContain(field)
    })
  }
})
