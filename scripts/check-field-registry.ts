/**
 * ĐP-3 §6.2 mục 3.12 — `npm run check:field-registry`.
 *
 * Kiểm:
 *   1. Mọi trường lõi trong Sổ đăng ký bằng code có dòng `field_definitions`
 *      tương ứng (origin = CORE) — seed (`nap-danh-muc-truong.ts`) đã chạy.
 *   2. Mỗi định nghĩa trường lõi tự nó hợp lệ (`validateCoreFieldDefinition`).
 *   3. `field_definitions.catalog_key` (khi có) trỏ tới một `field_catalogs`
 *      có thật — không trường mồ côi.
 *   4. Mỗi `field_catalog_values.behavior` (khi có) là mã hành vi có thật
 *      trong `behaviors.ts`, đúng `behavior_kind` của danh mục cha.
 *   5. `field_config_overrides` không trỏ tới một `field_key`/`catalog_key:code`
 *      không còn tồn tại — không ghi đè mồ côi.
 *
 * Không cần DB (mục 1) chạy được cả khi chưa `db push` — sẽ báo thiếu hết,
 * đúng ý nghĩa "seed chưa chạy". Cần DB cho các mục 3–5.
 */
import { prisma } from "../src/core/tenancy/infra/prisma"
import { ALL_CORE_FIELD_DEFINITIONS } from "../src/modules/field-platform/domain/all-core-fields"
import { validateCoreFieldDefinition } from "../src/modules/field-platform/domain/core-field-registry"
import { isKnownBehaviorCode } from "../src/modules/field-platform/domain/behaviors"

async function main(): Promise<void> {
  const problems: string[] = []

  for (const def of ALL_CORE_FIELD_DEFINITIONS) {
    problems.push(...validateCoreFieldDefinition(def))
  }

  const definitions = await prisma.field_definitions.findMany()
  const definitionKeys = new Set(definitions.map((d) => d.key))

  for (const def of ALL_CORE_FIELD_DEFINITIONS) {
    if (!definitionKeys.has(def.key)) {
      problems.push(`Trường lõi ${def.key} chưa có dòng field_definitions — chạy scripts/nap-danh-muc-truong.ts`)
    }
  }

  const catalogs = await prisma.field_catalogs.findMany()
  const catalogByKey = new Map(catalogs.map((c) => [c.key, c]))

  for (const def of definitions) {
    if (def.catalog_key && !catalogByKey.has(def.catalog_key)) {
      problems.push(`field_definitions.${def.key} trỏ tới danh mục không tồn tại: ${def.catalog_key}`)
    }
  }

  const catalogValues = await prisma.field_catalog_values.findMany()
  for (const value of catalogValues) {
    const catalog = catalogByKey.get(value.catalog_key)
    if (!catalog) {
      problems.push(`field_catalog_values ${value.catalog_key}:${value.code} thuộc danh mục không tồn tại`)
      continue
    }
    if (catalog.governance === "BEHAVIOR") {
      if (!value.behavior || !catalog.behavior_kind || !isKnownBehaviorCode(catalog.behavior_kind, value.behavior)) {
        problems.push(
          `field_catalog_values ${value.catalog_key}:${value.code} — behavior "${value.behavior}" không có thật trong behaviors.ts cho behavior_kind ${catalog.behavior_kind}`
        )
      }
    }
  }

  const overrides = await prisma.field_config_overrides.findMany()
  const catalogValueKeys = new Set(catalogValues.map((v) => `${v.catalog_key}:${v.code}`))
  for (const override of overrides) {
    if (override.target === "FIELD" && !definitionKeys.has(override.override_key)) {
      problems.push(`field_config_overrides mồ côi — trường ${override.override_key} không tồn tại (tổ chức ${override.organization_id})`)
    }
    if (override.target === "CATALOG_VALUE" && !catalogValueKeys.has(override.override_key)) {
      problems.push(`field_config_overrides mồ côi — giá trị danh mục ${override.override_key} không tồn tại (tổ chức ${override.organization_id})`)
    }
  }

  if (problems.length > 0) {
    console.error(`❌ check:field-registry — ${problems.length} vấn đề:\n`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exitCode = 1
    return
  }

  console.log(`✓ Sổ đăng ký trường khớp: ${ALL_CORE_FIELD_DEFINITIONS.length} trường lõi, ${catalogs.length} danh mục, ${catalogValues.length} giá trị, ${overrides.length} ghi đè.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
