/**
 * Vòng đời object URL của video người dùng vừa chọn (ảnh xem trước vẽ bằng canvas, không cần URL).
 * Bỏ một tệp → thu hồi đúng URL của tệp đó; đóng màn → thu hồi phần còn lại; mỗi URL thu hồi đúng một lần.
 * Trước đây một effect theo danh sách đã chọn thu hồi URL của cả những video vẫn đang hiển thị.
 */
export interface PickedMediaUrls {
  create(file: Blob): string
  release(url: string | null | undefined): void
  releaseAll(): void
}

export function createPickedMediaUrls(
  api: { createObjectURL(file: Blob): string; revokeObjectURL(url: string): void } = URL
): PickedMediaUrls {
  const live = new Set<string>()
  return {
    create(file) {
      const url = api.createObjectURL(file)
      live.add(url)
      return url
    },
    release(url) {
      if (!url || !live.delete(url)) return
      api.revokeObjectURL(url)
    },
    releaseAll() {
      for (const url of live) api.revokeObjectURL(url)
      live.clear()
    },
  }
}
