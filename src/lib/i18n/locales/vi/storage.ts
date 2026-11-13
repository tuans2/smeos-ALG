/**
 * storage.ts — Từ điển màn hình Kho ảnh & nội dung (08-kho-du-lieu.md SSOT)
 */

export const storageVi = {
  header: {
    title: "Kho ảnh & nội dung",
    description: "Tìm lại mọi ảnh, video, âm thanh, nội dung, bộ sưu tập chung và bộ sưu tập riêng cửa hàng đã tạo. Mục đã xóa được giữ 30 ngày trong Thùng rác.",
    uploadButton: "Tải ảnh mới",
  },
  tabs: {
    rawPhotos: "Ảnh gốc",
    approvedPhotos: "Ảnh đã duyệt",
    salesPitches: "Kịch bản tư vấn",
    trash: "Thùng rác (30 ngày)",
  },
  filters: {
    searchPlaceholder: "Tìm theo tên, mã sản phẩm, dịp hoặc thành phần…",
  },
  actions: {
    analyzePhoto: "Phân tích ảnh",
    createCopy: "Tạo bài viết bán hàng",
    copyPitch: "Sao chép kịch bản",
    restore: "Khôi phục",
    permanentDelete: "Xóa vĩnh viễn",
  },
} as const

export type StorageDictionary = typeof storageVi
