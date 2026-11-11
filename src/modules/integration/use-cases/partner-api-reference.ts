import { buildIntegrationOpenApi } from "@/modules/integration/contracts/integration-openapi"

/**
 * Mô hình hiển thị của trang tài liệu API cho đối tác (`/tich-hop/tai-lieu-api`, ARC-024 B4, PO 11/11/2026).
 * Dựng từ CHÍNH tài liệu OpenAPI của Integration API (`buildIntegrationOpenApi`, cùng nguồn với
 * `integration.openapi.json`) — trang không viết tay danh sách endpoint/trường nên không lệch được khỏi mã.
 * Chỉ bề mặt `/integration/*`: API nội bộ, Console và `/public/*` không công bố cho đối tác (PO Q1).
 */
export interface ApiField {
  name: string
  /** Kiểu bằng tiếng Việt: "chuỗi", "số nguyên", "danh sách chuỗi"… */
  type: string
  required: boolean
  nullable: boolean
  deprecated: boolean
  description: string | null
  /** Giá trị cho phép, khi trường là danh mục cố định. */
  allowed: string[]
  /** Trường con (một cấp) khi trường là đối tượng. */
  children: ApiField[]
}

export interface ApiResponse {
  status: string
  description: string
  fields: ApiField[]
  /** Phản hồi có thể là `null` (vd. chưa nhập hồ sơ). */
  nullable: boolean
}

export interface ApiOperation {
  id: string
  method: string
  path: string
  summary: string
  description: string | null
  group: string
  auth: string[]
  query: ApiField[]
  body: ApiField[]
  responses: ApiResponse[]
  errors: string[]
}

export interface PartnerApiReference {
  title: string
  version: string
  description: string
  baseUrl: string
  operations: ApiOperation[]
}

type Schema = {
  type?: string | string[]
  properties?: Record<string, Schema>
  required?: string[]
  items?: Schema
  anyOf?: Schema[]
  enum?: unknown[]
  const?: unknown
  deprecated?: boolean
  description?: string
  additionalProperties?: Schema | boolean
  $ref?: string
}

const TYPE_LABEL: Record<string, string> = {
  string: "chuỗi",
  integer: "số nguyên",
  number: "số",
  boolean: "đúng/sai",
  object: "đối tượng",
  array: "danh sách",
  null: "rỗng",
}

const AUTH_LABEL: Record<string, string> = {
  integrationToken: "Khoá ứng dụng (Bearer)",
  smeosSso: "Phiên SSO (x-smeos-sso)",
}

/** Gộp `anyOf: [X, null]` và `type: [X, "null"]` thành một kiểu + cờ nullable. */
function unwrap(schema: Schema): { schema: Schema; nullable: boolean } {
  if (schema.anyOf) {
    const rest = schema.anyOf.filter((s) => s.type !== "null")
    const nullable = rest.length !== schema.anyOf.length
    if (rest.length === 1) return { schema: { ...rest[0], ...pick(schema) }, nullable }
  }
  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((t) => t !== "null")
    return { schema: { ...schema, type: types.length === 1 ? types[0]! : types }, nullable: types.length !== schema.type.length }
  }
  return { schema, nullable: false }
}

function pick(schema: Schema): Schema {
  return { ...(schema.deprecated ? { deprecated: true } : {}), ...(schema.description ? { description: schema.description } : {}) }
}

function typeLabel(schema: Schema): string {
  if (schema.const !== undefined) return `cố định "${String(schema.const)}"`
  if (schema.type === "array") return `danh sách ${schema.items ? typeLabel(unwrap(schema.items).schema) : ""}`.trim()
  if (schema.type === "object" && !schema.properties && schema.additionalProperties) return "bảng khoá → giá trị"
  if (typeof schema.type === "string") return TYPE_LABEL[schema.type] ?? schema.type
  if (Array.isArray(schema.type)) return schema.type.map((t) => TYPE_LABEL[t] ?? t).join(" hoặc ")
  return "tuỳ ý"
}

function fieldsOf(schema: Schema | undefined, depth = 0): ApiField[] {
  if (!schema) return []
  const object = unwrap(schema).schema
  const required = new Set(object.required ?? [])
  return Object.entries(object.properties ?? {}).map(([name, raw]) => {
    const { schema: field, nullable } = unwrap(raw)
    const inner = field.type === "array" && field.items ? unwrap(field.items).schema : field
    return {
      name,
      type: typeLabel(field),
      required: required.has(name),
      nullable,
      deprecated: raw.deprecated === true || field.deprecated === true,
      description: raw.description ?? field.description ?? null,
      allowed: (field.enum ?? []).map(String),
      children: depth < 1 && inner.properties ? fieldsOf(inner, depth + 1) : [],
    }
  })
}

type RawOperation = {
  operationId: string
  summary: string
  description?: string
  tags?: string[]
  security?: Record<string, unknown>[]
  parameters?: { name: string; in: string; required?: boolean; schema?: Schema; description?: string }[]
  requestBody?: { content?: Record<string, { schema?: Schema }> }
  responses: Record<string, { description?: string; $ref?: string; content?: Record<string, { schema?: Schema }> }>
}

function toOperation(path: string, method: string, op: RawOperation): ApiOperation {
  const responses: ApiResponse[] = []
  const errors: string[] = []
  for (const [status, response] of Object.entries(op.responses)) {
    if (response.$ref || Number(status) >= 400) {
      errors.push(status)
      continue
    }
    const schema = response.content?.["application/json"]?.schema
    responses.push({
      status,
      description: response.description ?? "",
      fields: fieldsOf(schema),
      nullable: schema ? unwrap(schema).nullable : false,
    })
  }
  const query = (op.parameters ?? [])
    .filter((p) => p.in === "query")
    .map((p): ApiField => {
      const { schema, nullable } = unwrap(p.schema ?? {})
      return {
        name: p.name,
        type: typeLabel(schema),
        required: p.required === true,
        nullable,
        deprecated: false,
        description: p.description ?? schema.description ?? null,
        allowed: (schema.enum ?? []).map(String),
        children: [],
      }
    })
  return {
    id: op.operationId,
    method: method.toUpperCase(),
    path,
    summary: op.summary,
    description: op.description ?? null,
    group: op.tags?.[0] ?? "Khác",
    auth: (op.security ?? []).flatMap((s) => Object.keys(s)).map((k) => AUTH_LABEL[k] ?? k),
    query,
    body: fieldsOf(op.requestBody?.content?.["application/json"]?.schema),
    responses,
    errors: errors.sort(),
  }
}

export function partnerApiReference(doc: Record<string, unknown> = buildIntegrationOpenApi()): PartnerApiReference {
  const info = doc.info as { title: string; version: string; description: string }
  const servers = doc.servers as { url: string }[]
  const paths = doc.paths as Record<string, Record<string, RawOperation>>
  const operations = Object.entries(paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => toOperation(path, method, op))
  )
  return { title: info.title, version: info.version, description: info.description, baseUrl: servers[0]?.url ?? "/api/v1", operations }
}
