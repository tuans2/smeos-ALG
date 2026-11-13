import { resolveTxt } from "node:dns/promises"

/**
 * Đọc bản ghi TXT của một tên (checklist ALG 10.8). Không có bản ghi, tên không tồn tại hay DNS lỗi đều trả
 * mảng rỗng — người dùng thấy "chưa thấy bản ghi", bấm kiểm lại sau. Có hạn chờ để request không treo.
 */
export type TxtResolver = (name: string) => Promise<string[][]>

const TIMEOUT_MS = 5_000

export const resolveTxtRecords: TxtResolver = async (name) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      resolveTxt(name),
      new Promise<string[][]>((resolve) => { timer = setTimeout(() => resolve([]), TIMEOUT_MS) }),
    ])
  } catch {
    return []
  } finally {
    if (timer) clearTimeout(timer)
  }
}
