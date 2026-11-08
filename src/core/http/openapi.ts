import { z } from "zod"

import { ERROR_CODES } from "./errors"

/**
 * Dựng tài liệu OpenAPI 3.1 từ lược đồ zod (chuẩn API Contract v1.1 §9, audit API đợt 4, PO 07/11/2026).
 * Hàm thuần: nhận danh sách operation đã khai lược đồ, trả đối tượng tài liệu — không đọc route, không
 * chạm mạng. Lược đồ đổi bằng `z.toJSONSchema` (JSON Schema 2020-12, đúng bản OpenAPI 3.1 dùng), cùng
 * cách ba bộ sinh `check:schemas:*` sẵn có. Không thêm dependency.
 */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete"

export type OpenApiResponse = {
  description: string
  /** Thân JSON. */
  schema?: z.ZodType
  /** Thân không phải JSON (vd. `image/*`) — mô tả là chuỗi nhị phân. */
  contentType?: string
}

export type OpenApiOperation = {
  method: HttpMethod
  /** Đường dẫn sau `servers[0].url`, tham số dạng `{slug}`. */
  path: string
  operationId: string
  summary: string
  description?: string
  tags: string[]
  /** Tên các `securitySchemes` — mỗi tên là một cách xác thực thay thế nhau. */
  security: string[]
  query?: z.ZodObject
  body?: z.ZodType
  /** Thân `multipart/form-data` (tải tệp) — trường tệp khai `z.file()`. */
  multipart?: z.ZodType
  /** Mã thành công → mô tả + lược đồ thân. */
  responses: Record<number, OpenApiResponse>
  /** Mã lỗi có thể gặp — thân luôn là envelope `Error` chung. */
  errors: number[]
  /** Phần mở rộng `x-*` (vd. `x-capability`). */
  extensions?: Record<`x-${string}`, unknown>
}

export type OpenApiDocumentInput = {
  title: string
  version: string
  description: string
  serverUrl: string
  securitySchemes: Record<string, Record<string, unknown>>
  operations: OpenApiOperation[]
}

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: "Sai lược đồ thân/query hoặc thân không phải JSON (`VALIDATION_FAILED`, `details.issues`)",
  401: "Thiếu hoặc sai token / phiên SSO (`UNAUTHENTICATED`)",
  402: "Gói thuê bao quá hạn — chỉ xem (`SUBSCRIPTION_OVERDUE`)",
  403: "Thiếu mã năng lực hoặc token của app không được đọc tài nguyên này (`CAPABILITY_DENIED`)",
  404: "Không tìm thấy, hoặc thuộc tổ chức khác (`NOT_FOUND`)",
  409: "Xung đột trạng thái (`CONFLICT`)",
  413: "Thân yêu cầu vượt 2 MB (`PAYLOAD_TOO_LARGE`, `details.max_bytes`)",
  422: "Vi phạm luật nghiệp vụ hoặc hết hạn mức (`UNPROCESSABLE_ENTITY`, `QUOTA_EXCEEDED`)",
  429: "Quá tần suất (`RATE_LIMITED`) — chờ theo `Retry-After`",
  500: "Lỗi hệ thống (`INTERNAL`) — không lộ chi tiết",
}

function jsonSchema(schema: z.ZodType, io: "input" | "output"): Record<string, unknown> {
  const out = z.toJSONSchema(schema, { target: "draft-2020-12", io, unrepresentable: "any" }) as Record<string, unknown>
  delete out.$schema
  return out
}

const RATE_LIMIT_HEADERS = {
  "RateLimit-Limit": { $ref: "#/components/headers/RateLimitLimit" },
  "RateLimit-Remaining": { $ref: "#/components/headers/RateLimitRemaining" },
  "RateLimit-Reset": { $ref: "#/components/headers/RateLimitReset" },
}

function parameters(op: OpenApiOperation): Record<string, unknown>[] {
  const fromPath = [...op.path.matchAll(/\{(\w+)\}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }))
  const fromQuery = Object.entries(op.query?.shape ?? {}).map(([name, child]) => ({
    name,
    in: "query",
    required: !(child as z.ZodType).safeParse(undefined).success,
    schema: jsonSchema(child as z.ZodType, "input"),
  }))
  return [...fromPath, ...fromQuery]
}

function operationObject(op: OpenApiOperation): Record<string, unknown> {
  const responses: Record<string, unknown> = {}
  for (const [status, response] of Object.entries(op.responses)) {
    responses[status] = {
      description: response.description,
      headers: RATE_LIMIT_HEADERS,
      ...(response.schema
        ? { content: { "application/json": { schema: jsonSchema(response.schema, "output") } } }
        : response.contentType
          ? { content: { [response.contentType]: { schema: { type: "string", format: "binary" } } } }
          : {}),
    }
  }
  for (const status of [...op.errors].sort((a, b) => a - b)) {
    responses[String(status)] = { $ref: `#/components/responses/Error${status}` }
  }
  const params = parameters(op)
  return {
    operationId: op.operationId,
    summary: op.summary,
    ...(op.description ? { description: op.description } : {}),
    tags: op.tags,
    security: op.security.map((name) => ({ [name]: [] })),
    ...(params.length ? { parameters: params } : {}),
    // Route nhận cả JSON lẫn multipart (vd. xác nhận giao có/không ảnh) khai cả hai kiểu trong cùng `requestBody`
    ...(op.body || op.multipart
      ? {
          requestBody: {
            required: true,
            content: {
              ...(op.body ? { "application/json": { schema: jsonSchema(op.body, "input") } } : {}),
              ...(op.multipart ? { "multipart/form-data": { schema: jsonSchema(op.multipart, "input") } } : {}),
            },
          },
        }
      : {}),
    responses,
    ...op.extensions,
  }
}

export function buildOpenApiDocument(input: OpenApiDocumentInput): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const op of input.operations) {
    paths[op.path] = { ...paths[op.path], [op.method]: operationObject(op) }
  }
  const statuses = [...new Set(input.operations.flatMap((op) => op.errors))].sort((a, b) => a - b)
  return {
    openapi: "3.1.0",
    info: { title: input.title, version: input.version, description: input.description },
    servers: [{ url: input.serverUrl }],
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    components: {
      securitySchemes: input.securitySchemes,
      headers: {
        RateLimitLimit: { description: "Số lượt tối đa trong cửa sổ của luật chặt nhất", schema: { type: "integer" } },
        RateLimitRemaining: { description: "Số lượt còn lại trong cửa sổ", schema: { type: "integer" } },
        RateLimitReset: { description: "Số giây tới khi cửa sổ mở lại", schema: { type: "integer" } },
        RetryAfter: { description: "Số giây nên chờ trước khi gọi lại (chỉ khi 429)", schema: { type: "integer" } },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          additionalProperties: false,
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              additionalProperties: false,
              properties: {
                code: { type: "string", enum: ERROR_CODES },
                message: { type: "string", description: "Câu tiếng Việt cho người dùng cuối" },
                details: { type: "object", description: "Lỗi validation: `issues` (mảng issue của zod)" },
              },
            },
          },
        },
      },
      responses: Object.fromEntries(
        statuses.map((status) => [
          `Error${status}`,
          {
            description: ERROR_DESCRIPTIONS[status] ?? "Lỗi",
            headers: status === 429 ? { ...RATE_LIMIT_HEADERS, "Retry-After": { $ref: "#/components/headers/RetryAfter" } } : {},
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        ])
      ),
    },
  }
}

/** Chuỗi JSON ổn định để commit và so khớp (thụt 2, xuống dòng cuối). */
export function serializeOpenApi(doc: Record<string, unknown>): string {
  return `${JSON.stringify(doc, null, 2)}\n`
}
