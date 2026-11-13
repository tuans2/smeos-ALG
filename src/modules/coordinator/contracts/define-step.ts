/**
 * Khuôn khai báo hợp đồng một bước điều phối trong Coordinator Module.
 * Tương tự defineStage của Creative Studio, mỗi bước khai: mã bước, endpoint,
 * schema input/output, và ví dụ kiểm thử.
 */

import type { z } from "zod"

export type StepId = "01" | "02" | "03" | "04" | "05" | "06" | "07"

export interface StepEndpoint {
  readonly method: "GET" | "POST" | "PUT" | "PATCH"
  readonly path: string
  readonly capability: string
}

export interface StepContract<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  readonly id: StepId
  readonly step: number
  readonly code: string
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly endpoint: StepEndpoint
  readonly input: I
  readonly output: O
  readonly examples: { readonly input: z.input<I>; readonly output: z.output<O> }
}

export function defineStep<I extends z.ZodType, O extends z.ZodType>(c: StepContract<I, O>): StepContract<I, O> {
  return c
}
