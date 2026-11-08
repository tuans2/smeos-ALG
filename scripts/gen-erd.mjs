#!/usr/bin/env node
// Sinh ERD theo miền từ prisma/schema.prisma (kế hoạch DB, bước P3-03 / ARC-027).
// Chạy: npm run gen:erd — test `tests/unit/architecture/erd.test.ts` đỏ khi tệp sinh lệch schema hoặc có model
// chưa xếp miền (thêm model mới → thêm vào DOMAINS bên dưới rồi chạy lại).
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export const SCHEMA_PATH = "prisma/schema.prisma"
export const OUTPUT_PATH = "docs/kien-truc/ERD_THEO_MIEN.md"

/** Miền → bảng. Mỗi model đúng một miền. */
export const DOMAINS = [
  ["Tổ chức, người dùng, phân quyền", [
    "organizations", "organization_links", "industries", "workspaces", "branches", "users", "sessions", "memberships", "roles",
    "role_capabilities", "capability_overrides", "custom_domains", "business_profiles", "idempotency_keys",
  ]],
  ["Nền tảng và quản trị theo tầng", [
    "platform_operators", "platform_role_capabilities", "platform_settings", "platform_secrets", "tenant_data_keys", "platform_audit_logs",
    "platform_access_logs", "decision_registry", "governance_decisions", "audit_logs", "reconciliation_findings",
  ]],
  ["Khách hàng và bán hàng", [
    "customers", "customer_consents", "customer_interactions", "customer_occasions", "customer_segments", "occasions", "leads",
    "quotations", "quotation_items", "quotation_revisions", "vouchers", "voucher_batches", "voucher_redemptions", "pricing_rules",
    "shop_reviews",
  ]],
  ["Đơn hàng và điều phối", [
    "orders", "order_items", "order_recipients", "shared_order_access", "order_events", "order_payments", "order_assignments", "order_coordinations",
    "order_exceptions", "order_qc_records", "order_info_requests", "order_change_requests", "order_approval_requests", "partners",
    "partner_marketplace_stores", "partner_marketplace_share_links", "product_bookings", "staff_notifications",
  ]],
  ["Thẻ chào", [
    "greeting_catalogs", "greeting_catalog_products", "greeting_catalog_events", "greeting_sessions", "greeting_journey_events",
    "greeting_messages", "greeting_message_reads", "greeting_notifications", "greeting_payment_events", "greeting_integrations",
    "greeting_share_links", "store_share_links", "catalog_links", "short_links", "link_events", "landing_pages",
  ]],
  ["Sản phẩm và nguyên liệu", [
    "products", "product_variants", "product_images", "product_inventory", "product_recipes", "product_recipe_items",
    "product_revisions", "product_change_requests", "product_copies", "product_import_batches", "product_analyses",
    "product_analysis_runs", "materials", "material_price_history", "flower_taxonomy", "flower_confusable_pairs", "print_renditions",
    "field_definitions", "field_catalogs", "field_catalog_values", "field_config_overrides", "template_overrides",
  ]],
  ["AI, nội dung, marketing", [
    "ai_capabilities", "ai_models", "ai_policies", "ai_requests", "ai_evaluations", "provider_cost_entries", "provider_health",
    "generation_jobs", "job_events", "journey_runs", "content_drafts", "content_generations", "content_metrics",
    "content_opportunities", "campaigns", "campaign_packages", "brand_profiles", "brand_library_items", "brand_library_versions",
    "video_jobs", "video_scenes", "voice_clones", "music_tracks", "topics", "topic_scores", "topic_signals", "trend_signals",
    "trend_timeseries", "research_runs", "market_sources",
  ]],
  ["Thông báo và trò chuyện", [
    "notification_channel_activations", "notification_inbox", "notification_org_policies", "notification_store_defaults",
    "notification_user_preferences", "chat_channel_integrations", "chat_conversations", "chat_messages",
    "internal_chat_conversations", "internal_chat_messages", "internal_chat_participants",
  ]],
  ["Tích hợp và kênh bán", [
    "integration_connections", "integration_events", "integration_sync_cursors", "integration_tokens", "sales_channel_listings",
    "sales_channel_orders",
  ]],
  ["Gói dịch vụ, hạn mức, tệp", [
    "subscriptions", "subscription_invoices", "credit_transactions", "usage", "usage_limits", "assets", "asset_usages", "storage_outbox",
  ]],
]

/** Mỗi model → cột khoá (PK, FK, `organization_id`) và quan hệ tới bảng cha. */
export function parseModels(schemaText) {
  const models = new Map()
  for (const m of schemaText.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const [, name, body] = m
    const fields = new Map()
    const relations = []
    const uniques = new Set()
    let ids = []
    for (const raw of body.split("\n")) {
      const line = raw.replace(/\/\/.*$/, "")
      const f = line.match(/^\s+(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$/)
      if (f && !line.trim().startsWith("@@")) {
        const [, field, type, mod, rest] = f
        const rel = rest.match(/@relation\((?:"[^"]*",\s*)?[^)]*fields:\s*\[([^\]]+)\]/)
        if (rel) relations.push({ parent: type, fields: rel[1].split(",").map((s) => s.trim()), optional: mod === "?" })
        else if (mod !== "[]") fields.set(field, { type, pk: /@id\b/.test(rest), unique: /@unique\b/.test(rest) })
      }
      const id = line.match(/^\s+@@id\(\[([^\]]+)\]/)
      if (id) ids = id[1].split(",").map((s) => s.trim())
      const uq = line.match(/^\s+@@unique\(\[([^\]]+)\]/)
      if (uq) uniques.add(uq[1].split(",").map((s) => s.trim()).join(","))
    }
    for (const [field, info] of fields) if (info.pk) ids.push(field)
    models.set(name, { fields, relations, ids, uniques })
  }
  return models
}

function cardinality(model, rel) {
  const key = rel.fields.join(",")
  const one = model.ids.join(",") === key || model.uniques.has(key) || (rel.fields.length === 1 && model.fields.get(rel.fields[0])?.unique)
  return `${rel.optional ? "|o" : "||"}--${one ? "o|" : "o{"}`
}

function entity(name, model) {
  const fk = new Set(model.relations.flatMap((r) => r.fields))
  const keys = [...model.fields].filter(([field, info]) => info.pk || fk.has(field) || field === "organization_id" || model.ids.includes(field))
  if (keys.length === 0) return `  ${name}`
  const rows = keys.map(([field, info]) => {
    const tags = [model.ids.includes(field) ? "PK" : null, fk.has(field) ? "FK" : null].filter(Boolean).join(",")
    return `    ${info.type.replace(/[^A-Za-z0-9_]/g, "")} ${field}${tags ? ` ${tags}` : ""}`
  })
  return `  ${name} {\n${rows.join("\n")}\n  }`
}

export function buildErdDoc(schemaText) {
  const models = parseModels(schemaText)
  const domainOf = new Map(DOMAINS.flatMap(([domain, tables]) => tables.map((t) => [t, domain])))
  const missing = [...models.keys()].filter((m) => !domainOf.has(m))
  const unknown = [...domainOf.keys()].filter((t) => !models.has(t))
  if (missing.length || unknown.length) {
    throw new Error(`gen-erd: model chưa xếp miền: [${missing.join(", ")}] · miền có bảng không còn: [${unknown.join(", ")}]`)
  }
  const out = [
    "<!-- TỆP SINH TỰ ĐỘNG từ prisma/schema.prisma — không sửa tay. Chạy `npm run gen:erd`. -->",
    "# ERD theo miền",
    "",
    "Sinh từ `prisma/schema.prisma` bởi `scripts/gen-erd.mjs` (kế hoạch DB, bước P3-03). Mỗi miền: bảng của miền với cột khoá",
    "(PK, FK, `organization_id`) và khoá ngoại tới bảng cha; bảng của miền khác chỉ hiện tên. Cột đầy đủ, ý nghĩa và quy tắc",
    "ở đặc tả `docs/dac-ta/07-database-specification.md`. `tests/unit/architecture/erd.test.ts` đỏ khi tệp này lệch schema.",
    "",
    `Tổng: ${models.size} bảng, ${DOMAINS.length} miền.`,
    "",
  ]
  for (const [domain, tables] of DOMAINS) {
    const own = new Set(tables)
    const lines = []
    const outside = new Set()
    for (const t of tables) {
      for (const rel of models.get(t).relations) {
        lines.push(`  ${rel.parent} ${cardinality(models.get(t), rel)} ${t} : "${rel.fields.join(", ")}"`)
        if (!own.has(rel.parent)) outside.add(rel.parent)
      }
    }
    for (const [name, model] of models) {
      if (own.has(name)) continue
      for (const rel of model.relations) {
        if (own.has(rel.parent)) {
          lines.push(`  ${rel.parent} ${cardinality(model, rel)} ${name} : "${rel.fields.join(", ")}"`)
          outside.add(name)
        }
      }
    }
    out.push(`## ${domain}`, "", `Bảng: ${tables.map((t) => `\`${t}\``).join(", ")}.`, "", "```mermaid", "erDiagram")
    for (const t of tables) out.push(entity(t, models.get(t)))
    for (const t of [...outside].sort()) out.push(`  ${t}`)
    out.push(...[...new Set(lines)].sort(), "```", "")
  }
  return out.join("\n")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUTPUT_PATH, buildErdDoc(readFileSync(SCHEMA_PATH, "utf8")))
  console.log(`gen-erd: đã ghi ${OUTPUT_PATH}`)
}
