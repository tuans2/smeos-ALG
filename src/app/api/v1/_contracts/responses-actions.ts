import { z } from "zod"

/**
 * Thao tác không trả bản ghi (chuẩn API Contract v1.1 §4, thay `{ ok: true }` / `{ success: true }` cũ):
 * `{ data: { <khoá>: string, <việc vừa làm>: true } }`, vd. `{ data: { id, deleted: true } }`.
 */
export function actionDone<K extends string, V extends string>(verb: V, key: K = "id" as K) {
  const shape = { [key]: z.string(), [verb]: z.literal(true) } as unknown as { [P in K]: z.ZodString } & { [P in V]: z.ZodLiteral<true> }
  return z.strictObject({ data: z.strictObject(shape) })
}
