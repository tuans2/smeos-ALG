/**
 * Khuôn một hợp đồng chặng Creative Studio. Mỗi chặng khai: định danh, lời gọi
 * chính (endpoint + mã năng lực), schema `input`, schema `output` và một ví dụ
 * đầy đủ cho mỗi chiều — ví dụ đi vào trường `examples` của JSON Schema (mẫu để
 * điền) và được test kiểm lại bằng chính schema.
 */

import type { z } from "zod"

export type StageId =
  | "01" | "02" | "03" | "04" | "05"
  | "06a" | "06b" | "06c" | "06d"
  | "07" | "08" | "09" | "10" | "11" | "12" | "13" | "14"

export interface StageEndpoint {
  readonly method: "GET" | "POST" | "PUT" | "PATCH"
  readonly path: string
  /** Mã năng lực RBAC (`requireCapability`). */
  readonly capability: string
  /** Header `Idempotency-Key` bắt buộc (YC-U7). */
  readonly idempotencyKey?: boolean
}

export interface StageContract<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  readonly id: StageId
  /** Số chặng 1–14 trong hành trình (06a–06d đều là chặng 6). */
  readonly stage: number
  /** Mã chặng, vd. BRING; 06a–06d mang mã CREATE_<khu vực>. */
  readonly code: string
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly endpoint: StageEndpoint
  readonly input: I
  readonly output: O
  readonly examples: { readonly input: z.input<I>; readonly output: z.output<O> }
  /** Hợp đồng phụ ở ranh giới chặng (vd. query bàn giao Chặng 05) — cũng được sinh JSON. */
  readonly extras?: Readonly<Record<string, { readonly schema: z.ZodType; readonly example: unknown }>>
}

export function defineStage<I extends z.ZodType, O extends z.ZodType>(c: StageContract<I, O>): StageContract<I, O> {
  return c
}
