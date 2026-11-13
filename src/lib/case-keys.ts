/**
 * Đổi kiểu tên khoá CẤP ĐẦU của một đối tượng (chuẩn API v1.1 §3, PO D-69): thân/query của route nội bộ dùng
 * snake_case, còn use-case và form giữ camelCase. Chỉ đổi cấp đầu — đối tượng lồng (cấu hình, `customFields` có khoá
 * do người dùng đặt) giữ nguyên để không làm hỏng dữ liệu.
 */
type Camel<S extends string> = S extends `${infer H}_${infer T}` ? `${H}${Capitalize<Camel<T>>}` : S
type Snake<S extends string> = S extends `${infer H}${infer T}`
  ? `${H extends Uppercase<H> ? (H extends Lowercase<H> ? H : `_${Lowercase<H>}`) : H}${Snake<T>}`
  : S

export type CamelKeys<T> = { [K in keyof T as K extends string ? Camel<K> : K]: T[K] }
export type SnakeKeys<T> = { [K in keyof T as K extends string ? Snake<K> : K]: T[K] }

export const toCamel = (key: string): string => key.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase())
export const toSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

/** `{ order_id: 1 }` → `{ orderId: 1 }` (cấp đầu). */
export function camelKeys<T extends object>(value: T): CamelKeys<T> {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [toCamel(k), v])) as CamelKeys<T>
}

/** `{ orderId: 1 }` → `{ order_id: 1 }` (cấp đầu). */
export function snakeKeys<T extends object>(value: T): SnakeKeys<T> {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [toSnake(k), v])) as SnakeKeys<T>
}
