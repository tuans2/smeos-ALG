// Dùng chung cho máy chủ (`app/(app)/san-pham/page.tsx`) và client (`use-product-list.ts`).
// Không đặt trong tệp "use client": máy chủ import hằng số từ đó sẽ nhận tham chiếu client, không phải giá trị.

export const PRODUCT_PAGE_SIZE = "100"

/** URL trang đầu khi chưa lọc — máy chủ render sẵn trang này. */
export const INITIAL_PRODUCT_LIST_URL = `/api/v1/products?limit=${PRODUCT_PAGE_SIZE}`

export type ProductListPage<T> = { data: T[]; next_cursor: string | null; total?: number; truncated?: boolean }
