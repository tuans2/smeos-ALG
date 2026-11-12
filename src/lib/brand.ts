/**
 * Thương hiệu nền tảng (đổi nhận diện ALG mức 3, 12/11/2026 — chờ PO xác nhận).
 * Một nơi duy nhất cho tên và logo hiển thị; màu và phông nằm ở `src/styles/tokens/` (preset `alg`).
 * Tên hiển thị "ALG" (viết tắt AVI Lotus Group) — chủ dự án chốt 12/11/2026.
 */
export const BRAND = {
  productName: "ALG",
  companyName: "AVI Lotus Group",
  logo: {
    horizontalDark: "/brand/avi-lotus/logo-horizontal-dark.png",
    horizontalWhite: "/brand/avi-lotus/logo-horizontal-white.png",
    verticalDark: "/brand/avi-lotus/logo-vertical-dark.png",
    iconDark: "/brand/avi-lotus/icon-dark.png",
    /** Kích thước gốc của tệp PNG (để giữ đúng tỉ lệ khi hiển thị) */
    horizontalSize: { width: 1400, height: 346 },
  },
} as const
