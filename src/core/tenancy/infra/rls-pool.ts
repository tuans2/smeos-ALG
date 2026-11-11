import pg from "pg"

import { log } from "@/core/observability/log"
import { TENANT_SCOPED_TABLES } from "../generated/tenant-table-registry"
import { currentDbContext, failsClosedOutsideContext, type DbContext } from "../db-context"

/**
 * Pool kết nối đặt ngữ cảnh tổ chức cho Row Level Security (ADR-013 D-I3, checklist ALG 1.18).
 *
 * Mỗi lần lấy một kết nối khỏi pool (truy vấn lẻ hoặc mở giao dịch), pool đặt ba biến phiên theo ngữ cảnh
 * của luồng đang chạy: `app.org_id`, `app.rls_system`, `app.rls_mode`. Kết nối nhớ giá trị đã đặt nên chỉ
 * tốn thêm một lệnh khi ngữ cảnh đổi. Đặt ở mức phiên và đặt lại ở MỖI lần lấy kết nối — không rò ngữ cảnh
 * giữa hai request dùng chung một kết nối. Giao dịch giữ nguyên kết nối nên cả giao dịch cùng một ngữ cảnh.
 */
export type RlsMode = "off" | "audit" | "enforce"

interface RlsSettings { orgId: string; system: string; mode: string }

const APPLIED = Symbol("smeos.rls.applied")
const WATCHED = Symbol("smeos.rls.watched")
const CTX = Symbol("smeos.rls.ctx")
type TrackedClient = pg.PoolClient & { [APPLIED]?: string; [WATCHED]?: boolean; [CTX]?: DbContext | undefined }

const TENANT_TABLES = new Set(TENANT_SCOPED_TABLES)

/** Bảng thuộc tổ chức mà câu SQL chạm tới (SQL do Prisma sinh, và SQL thô viết tay). */
export function tenantTablesIn(sql: string): string[] {
  const found = new Set<string>()
  for (const m of sql.matchAll(/"public"\."([a-z0-9_]+)"/g)) if (TENANT_TABLES.has(m[1]!)) found.add(m[1]!)
  for (const m of sql.matchAll(/\b(?:from|join|update|into)\s+"?([a-z0-9_]+)"?/gi)) {
    const t = m[1]!.toLowerCase()
    if (TENANT_TABLES.has(t)) found.add(t)
  }
  return [...found]
}

/**
 * Biến phiên tương ứng một ngữ cảnh. Chưa phân loại (ngoài mọi ngữ cảnh): trong tiến trình web không có quyền hệ
 * thống — `enforce` chặn (fail-closed, audit DB-01); ngoài web (script, test) chạy như hệ thống.
 */
export function rlsSettingsFor(ctx: DbContext | undefined, mode: RlsMode, failClosed = failsClosedOutsideContext()): RlsSettings {
  if (!ctx) return { orgId: "", system: failClosed ? "" : "on", mode }
  if (ctx.kind === "system") return { orgId: "", system: "on", mode }
  if (ctx.kind === "tenant" && ctx.organizationId) return { orgId: ctx.organizationId, system: "", mode }
  return { orgId: "", system: "", mode }
}

export interface RlsAuditEvent { kind: "pending" | "unclassified"; tables: string[]; route: string | null }

/** Nơi nhận sự kiện ghi nhận — test thay để đếm; mặc định ghi log có hạn mức theo bảng × đường dẫn. */
let auditSink: (e: RlsAuditEvent) => void = defaultAuditSink
const seen = new Map<string, number>()
const AUDIT_INTERVAL_MS = 10 * 60_000

/**
 * `DB_RLS_AUDIT_FILE` (chỉ khi rà soát: test, staging): ghi mọi sự kiện request-chưa-gắn-tổ-chức ra tệp, không hạn mức;
 * trong tiến trình web ghi cả truy vấn ngoài mọi ngữ cảnh (sẽ bị chặn ở `enforce`).
 */
function appendAuditFile(e: RlsAuditEvent): void {
  const file = process.env["DB_RLS_AUDIT_FILE"]
  if (!file || (e.kind !== "pending" && !failsClosedOutsideContext())) return
  void import("node:fs").then((fs) => fs.appendFileSync(file, `${JSON.stringify(e)}\n`)).catch(() => undefined)
}

function defaultAuditSink(e: RlsAuditEvent): void {
  appendAuditFile(e)
  const key = `${e.kind}|${e.route ?? "-"}|${e.tables.join(",")}`
  const now = Date.now()
  if ((seen.get(key) ?? 0) > now - AUDIT_INTERVAL_MS) return
  if (seen.size > 5000) seen.clear()
  seen.set(key, now)
  log.warn("db.rls.unscoped_query", { kind: e.kind, tables: e.tables.join(","), route: e.route ?? undefined })
}

export function setRlsAuditSink(sink: ((e: RlsAuditEvent) => void) | null): void {
  auditSink = sink ?? defaultAuditSink
}

export function recordRlsAudit(e: RlsAuditEvent): void {
  auditSink(e)
}

/** Ghi nhận truy vấn chạm bảng thuộc tổ chức khi request chưa gắn tổ chức, hoặc chạy ngoài mọi ngữ cảnh. */
function audit(ctx: DbContext | undefined, sql: string): void {
  if (ctx && ctx.kind !== "pending") return
  const tables = tenantTablesIn(sql)
  if (tables.length === 0) return
  auditSink({ kind: ctx ? "pending" : "unclassified", tables, route: ctx?.route ?? null })
}

const sqlOf = (q: unknown): string =>
  typeof q === "string" ? q : q && typeof q === "object" && typeof (q as { text?: unknown }).text === "string" ? (q as { text: string }).text : ""

export class RlsPool extends pg.Pool {
  constructor(config: pg.PoolConfig, private readonly mode: RlsMode) {
    super(config)
  }

  private async prepare(client: TrackedClient, ctx: DbContext | undefined): Promise<void> {
    client[CTX] = ctx
    if (this.mode !== "off" && !client[WATCHED]) {
      // Ghi nhận ở mức kết nối: bắt cả truy vấn trong giao dịch (adapter gọi thẳng `client.query`)
      const original = client.query.bind(client) as (...a: unknown[]) => unknown
      ;(client as unknown as { query: (...a: unknown[]) => unknown }).query = (...args: unknown[]) => {
        audit(client[CTX], sqlOf(args[0]))
        return original(...args)
      }
      client[WATCHED] = true
    }
    if (this.mode === "off") return
    const s = rlsSettingsFor(ctx, this.mode)
    const key = `${s.orgId}|${s.system}|${s.mode}`
    if (client[APPLIED] === key) return
    await (pg.Client.prototype.query as (this: pg.PoolClient, text: string, values: unknown[]) => Promise<unknown>).call(
      client,
      "SELECT set_config('app.org_id', $1, false), set_config('app.rls_system', $2, false), set_config('app.rls_mode', $3, false)",
      [s.orgId, s.system, s.mode],
    )
    client[APPLIED] = key
  }

  override connect(): Promise<pg.PoolClient>
  override connect(callback: (err: Error | undefined, client: pg.PoolClient | undefined, done: (release?: unknown) => void) => void): void
  override connect(callback?: (err: Error | undefined, client: pg.PoolClient | undefined, done: (release?: unknown) => void) => void): Promise<pg.PoolClient> | void {
    // Chụp ngữ cảnh ngay lúc xin kết nối — kết nối có thể được trả sau, từ luồng khác
    const ctx = currentDbContext()
    const ready = (super.connect() as Promise<TrackedClient>).then(async (client) => {
      try {
        await this.prepare(client, ctx)
      } catch (error) {
        client.release(error as Error)
        throw error
      }
      return client
    })
    if (!callback) return ready
    ready.then((client) => callback(undefined, client, (release) => client.release(release as Error | undefined)), (error: Error) => callback(error, undefined, () => {}))
  }
}
