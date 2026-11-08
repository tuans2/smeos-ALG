import type { z } from "zod"

import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { requireIntegrationContext, type IntegrationContext } from "@/modules/integration/use-cases/resolve-integration-context"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"

import { isAuthorizedCronRequest } from "./cron-auth"
import { unauthenticated, validationFailed } from "./errors"
import { enforceRateLimit } from "./rate-limit"
import { handle } from "./response"

/**
 * Hợp đồng route theo chuẩn API Contract v1.1 (PO chốt 07/11/2026, audit đợt 3). Một khai báo gom
 * xác thực, mã năng lực, giới hạn tần suất, `Idempotency-Key`, lược đồ zod của thân/query — thay vì
 * mỗi route tự viết lại (và quên) từng bước. Bọc `handle()`, nên envelope lỗi, RLS, audit, header
 * `RateLimit-*` giữ nguyên. Route mới dưới `/api/v1` bắt buộc dùng (`route-contract-ratchet.test.ts`).
 *
 * Tên trường thân/query của route mới là snake_case — kiểm ngay lúc khai báo (ném khi nạp module).
 */
export type RouteAuth =
  /** Phiên người dùng + mã năng lực. `capability: null` chỉ cho dữ liệu của chính người gọi, kèm lý do. */
  | { kind: "tenant"; capability: string }
  | { kind: "tenant"; capability: null; reason: string }
  | { kind: "platform"; capability: string }
  /** Máy gọi máy (`/integration/*`) — trần 600/phút/token đã nằm trong `requireIntegrationContext`. */
  | { kind: "integration" }
  /** Không đăng nhập — bắt buộc `rateLimit` theo IP. */
  | { kind: "public" }
  /** Cron nội bộ — `CRON_SECRET`. */
  | { kind: "cron" }
  /** Chữ ký webhook, URL ký… do handler tự kiểm — phải ghi lý do. */
  | { kind: "custom"; reason: string }

type Per<A extends RouteAuth> = A extends { kind: "public" } ? "ip"
  : A extends { kind: "integration" } ? "ip" | "organization"
  : A extends { kind: "tenant" } ? "ip" | "user" | "organization"
  : A extends { kind: "platform" } ? "ip" | "user"
  : "ip"

export type RouteRateLimit<A extends RouteAuth> = { scope: string; limit: number; windowMs: number; per: Per<A> }

type ActorOf<A extends RouteAuth> = A extends { kind: "tenant" } ? { ctx: TenantContext }
  : A extends { kind: "platform" } ? { pctx: PlatformContext }
  : A extends { kind: "integration" } ? { ic: IntegrationContext }
  : Record<never, never>

export type RouteInput<A extends RouteAuth, B, Q, P> = ActorOf<A> & {
  request: Request
  params: P
  body: B
  query: Q
  /** Có khi `idempotency: "required"`. */
  idempotencyKey: string | null
}

type RouteSpec<A extends RouteAuth, B, Q, P> = {
  auth: A
  idempotency?: "required"
  body?: z.ZodType<B>
  query?: z.ZodType<Q>
  handler: (input: RouteInput<A, B, Q, P>) => Promise<Response>
} & (A extends { kind: "public" } ? { rateLimit: RouteRateLimit<A> } : { rateLimit?: RouteRateLimit<A> })

type Actor = { ctx?: TenantContext; pctx?: PlatformContext; ic?: IntegrationContext }

export function defineRoute<A extends RouteAuth, B = undefined, Q = undefined, P = Record<string, string>>(
  spec: RouteSpec<A, B, Q, P>
): (request: Request, context?: { params: Promise<P> }) => Promise<Response> {
  if (spec.body) assertSnakeCaseKeys(spec.body, "body")
  if (spec.query) assertSnakeCaseKeys(spec.query, "query")
  const rateLimit = spec.rateLimit as RouteRateLimit<RouteAuth> | undefined

  return handle<[context?: { params: Promise<P> }]>(async (request, context) => {
    // Công khai: chặn tần suất trước mọi việc khác (kể cả đọc thân)
    if (spec.auth.kind === "public" && rateLimit) await enforceRateLimit(request, ruleFor(rateLimit, {}))
    const actor = await authenticate(request, spec.auth)
    if (spec.auth.kind !== "public" && rateLimit) await enforceRateLimit(request, ruleFor(rateLimit, actor))

    const idempotencyKey = readIdempotencyKey(request)
    if (spec.idempotency === "required" && !idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc có header Idempotency-Key" })
    }
    const query = spec.query ? parseWith(spec.query, Object.fromEntries(new URL(request.url).searchParams)) : undefined
    const body = spec.body ? parseWith(spec.body, await request.json()) : undefined
    const params = (context ? await context.params : {}) as P

    const input = { ...actor, request, params, body, query, idempotencyKey } as RouteInput<A, B, Q, P>
    return spec.handler(input)
  })
}

async function authenticate(request: Request, auth: RouteAuth): Promise<Actor> {
  switch (auth.kind) {
    case "tenant": {
      const { ctx } = await requireTenantContext(request)
      if (auth.capability !== null) requireCapability(ctx, auth.capability)
      return { ctx }
    }
    case "platform": {
      const pctx = await requirePlatformContext(request)
      requirePlatformCapability(pctx, auth.capability)
      return { pctx }
    }
    case "integration":
      return { ic: await requireIntegrationContext(request) }
    case "cron":
      if (!isAuthorizedCronRequest(request)) throw unauthenticated()
      return {}
    case "public":
    case "custom":
      return {}
  }
}

function ruleFor(rule: RouteRateLimit<RouteAuth>, actor: Actor) {
  const base = { scope: rule.scope, limit: rule.limit, windowMs: rule.windowMs }
  if (rule.per === "ip") return base
  const organizationId = actor.ctx?.organizationId ?? actor.ic?.organizationId
  if (rule.per === "organization" && organizationId) return { ...base, subject: `org:${organizationId}` }
  const userId = actor.ctx?.userId ?? actor.pctx?.userId
  if (rule.per === "user" && userId) return { ...base, subject: `user:${userId}` }
  throw new Error(`defineRoute: không đếm được rateLimit.per = "${rule.per}" cho route này`)
}

/** `safeParse` → 400 `details.issues` (cùng dạng các route hiện có — PO giữ `issues`, 07/11/2026). */
function parseWith<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return parsed.data
}

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/
type ZodDef = { type?: string; shape?: Record<string, unknown>; element?: unknown; innerType?: unknown; in?: unknown; options?: unknown[] }

/** Đi qua lược đồ zod (object, mảng, optional/nullable/default, pipe, union) và đòi khoá snake_case. */
export function assertSnakeCaseKeys(schema: unknown, path: string): void {
  const def = (schema as { _zod?: { def?: ZodDef } })?._zod?.def
  if (!def) return
  if (def.type === "object" && def.shape) {
    for (const [key, child] of Object.entries(def.shape)) {
      if (!SNAKE_CASE.test(key)) {
        throw new Error(`defineRoute: trường "${path}.${key}" phải viết snake_case (chuẩn API Contract v1.1 §3)`)
      }
      assertSnakeCaseKeys(child, `${path}.${key}`)
    }
    return
  }
  for (const child of [def.element, def.innerType, def.in, ...(def.options ?? [])]) {
    if (child) assertSnakeCaseKeys(child, path)
  }
}
