/**
 * Kiểu domain dùng `readonly`, còn `z.output` của zod thì không. `DeepMutable`
 * bỏ `readonly` để so kiểu domain với hợp đồng (`conformance.ts`) và để dùng
 * đầu ra hàm domain thật làm ví dụ (`toExample`).
 */

export type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? DeepMutable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
      : T

/** Bản sao JSON thuần — đúng dạng dữ liệu đi qua HTTP. */
export function toExample<T>(value: T): DeepMutable<T> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<T>
}
