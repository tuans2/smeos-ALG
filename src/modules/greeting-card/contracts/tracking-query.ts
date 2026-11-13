import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { TRACKING_CATEGORIES } from "../domain/tracking-filters"
import { PIPELINE_STEPS } from "../domain/tracking-pipeline-types"
import { KANBAN_MAX_PER_COLUMN, SORT_FIELDS, type KanbanColumnLimits } from "../domain/tracking-views"
import { TRACKING_VIEWS, type TrackingQueryParams } from "../use-cases/query-tracking"

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const STEP_IDS = PIPELINE_STEPS.map((s) => s.id) as [string, ...string[]]

const schema = z.object({
  view: z.enum(TRACKING_VIEWS).default("list"),
  q: z.string().max(100).optional(),
  category: z.enum(TRACKING_CATEGORIES.map((c) => c.id) as [string, ...string[]]).optional(),
  steps: z.string().max(400).optional(),
  saleId: z.string().max(64).optional(),
  channel: z.string().max(100).optional(),
  type: z.enum(["ORDER", "SESSION"]).optional(),
  sla: z.enum(["NONE", "ON_TRACK", "DUE_SOON", "OVERDUE", "ATTENTION"]).optional(),
  owner: z.enum(["SALE", "ADMIN", "COORDINATOR"]).optional(),
  deliveryFrom: DATE.optional(),
  deliveryTo: DATE.optional(),
  from: DATE.optional(),
  to: DATE.optional(),
  sort: z.enum(SORT_FIELDS).default("urgency"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Kanban "Xem thêm": `STEP_2_CHOOSING:40,STEP_6_ARRANGING:60` */
  expand: z.string().max(600).optional(),
  cursor: z.string().regex(/^\d{1,6}$/).optional(),
  statusMode: z.enum(["ACTIVE", "DISMISSED", "ALL"]).default("ACTIVE"),
})

/** `?view=&q=&steps=A,B&sla=&...` → tham số lớp truy vấn. Lịch tối đa 62 ngày. */
export function parseTrackingQuery(url: URL): TrackingQueryParams {
  const raw = Object.fromEntries([...url.searchParams.entries()].filter(([, v]) => v !== ""))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues.map((i) => i.path.join(".")) })
  const d = parsed.data
  const steps = d.steps?.split(",").filter(Boolean)
  if (steps?.some((s) => !STEP_IDS.includes(s))) throw validationFailed({ steps: "Bước không hợp lệ" })
  const columnLimits = parseColumnLimits(d.expand)
  if (d.from && d.to && (Date.parse(d.to) - Date.parse(d.from)) / 86_400_000 > 62) throw validationFailed({ to: "Lịch xem tối đa 62 ngày" })
  return {
    view: d.view,
    filter: {
      q: d.q, category: d.category as TrackingQueryParams["filter"]["category"], steps: steps as TrackingQueryParams["filter"]["steps"],
      saleId: d.saleId, channel: d.channel, type: d.type, sla: d.sla, owner: d.owner, deliveryFrom: d.deliveryFrom, deliveryTo: d.deliveryTo,
      statusMode: d.statusMode,
    },
    sort: { field: d.sort, dir: d.dir },
    limit: d.limit,
    columnLimits,
    cursor: d.cursor,
    from: d.from,
    to: d.to,
  }
}

/** `STEP_ID:n,...` → số thẻ riêng của từng cột Kanban; sai bước hoặc số → 422. */
function parseColumnLimits(raw: string | undefined): KanbanColumnLimits | undefined {
  if (!raw) return undefined
  const out: KanbanColumnLimits = {}
  for (const part of raw.split(",").filter(Boolean)) {
    const [step, n] = part.split(":")
    const count = Number(n)
    if (!step || !STEP_IDS.includes(step) || !Number.isInteger(count) || count < 1 || count > KANBAN_MAX_PER_COLUMN) {
      throw validationFailed({ expand: "Số thẻ của cột không hợp lệ" })
    }
    out[step as keyof KanbanColumnLimits] = count
  }
  return out
}
