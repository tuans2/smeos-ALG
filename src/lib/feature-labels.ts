/**
 * feature-labels.ts
 *
 * SSOT bảng dịch mã tính năng và nhãn tiếng Việt hiển thị trên giao diện (Job, Dashboard, Activity).
 */

export const NHAN_TINH_NANG: Record<string, string> = {
  "vision.analyze": "Phân tích ảnh",
  "media.optimize": "Tối ưu ảnh",
  "catalog.generate": "Tạo danh mục",
  "copy.generate": "Sinh nội dung bán hàng",
  "media.variant.cloud": "Sinh biến thể bối cảnh",
  "audio.generate": "Sinh âm thanh / Lồng tiếng",
  "video.render": "Dựng video sản phẩm",
  "market.sync": "Nghiên cứu thị trường",
}

export function tenTinhNang(feature: string): string {
  return NHAN_TINH_NANG[feature] ?? feature
}
