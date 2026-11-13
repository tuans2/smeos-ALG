/**
 * Chủ đề hiển thị cho thẻ vuốt (Tinder-grade). Mỗi kiểu (01–12) chỉ khác
 * nhau ở token — bố cục, cử chỉ và khả năng đọc là một chuẩn chung.
 *
 * - `overlay`: ảnh phủ kín thẻ, chữ trắng trên dải tối phía dưới (Tinder).
 * - `glass`: ảnh phủ kín, thông tin nằm trong tấm kính mờ.
 * - `paper`: ảnh chiếm phần trên, thông tin trên nền giấy phía dưới.
 * - `polaroid`: ảnh có viền trắng như ảnh in, chữ viết tay bên dưới.
 */
export type SwipeInfoStyle = "overlay" | "glass" | "paper" | "polaroid"

export interface SwipeTheme {
  key: string
  /** Nền sân khấu phía sau chồng thẻ */
  stage: string
  /** Màu chữ trên sân khấu (tiêu đề bộ sưu tập, nút phụ) */
  stageText: string
  stageMuted: string
  card: string
  info: SwipeInfoStyle
  /** Nền vùng thông tin (paper/polaroid) */
  infoBg: string
  text: string
  muted: string
  accent: string
  font: string
  titleWeight: number
  /** Bo góc thẻ (px) — mỗi kiểu một nhịp riêng */
  radius: number
  /** Tiêu đề viết hoa giãn chữ (điện ảnh) */
  titleUpper?: boolean
  /** Dòng nhỏ phía trên tên mẫu */
  eyebrow?: string
  /** Băng dính giấy trang trí (mixed media) */
  tape?: boolean
  /** Viền khung trang trí bên trong thẻ (botanical) */
  innerFrame?: string
  photoFilter?: string
  /** Nút tròn điều khiển: nền và viền */
  controlBg: string
  controlBorder: string
  ctaBg: string
  ctaText: string
}

const SERIF = "var(--font-serif)"
const SANS = "var(--font-sans)"
const HAND = "var(--font-cursive)"

const LIKE = "#22c55e"
const NOPE = "#f43f5e"
export const SWIPE_SIGNAL = { like: LIKE, nope: NOPE, rewind: "#f59e0b", info: "#3b82f6" }

const darkControls = { controlBg: "rgba(255,255,255,0.08)", controlBorder: "rgba(255,255,255,0.14)" }
const lightControls = { controlBg: "#ffffff", controlBorder: "rgba(15,23,42,0.06)" }

const base: Omit<SwipeTheme, "key"> = {
  stage: "linear-gradient(180deg,#14110f 0%,#0b0a09 100%)",
  stageText: "#f5efe6",
  stageMuted: "rgba(245,239,230,0.6)",
  card: "#1c1917",
  info: "overlay",
  infoBg: "#ffffff",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.78)",
  accent: "#f3d6a4",
  font: SERIF,
  titleWeight: 500,
  radius: 28,
  ...darkControls,
  ctaBg: "#f3d6a4",
  ctaText: "#1c1917",
}

export const SWIPE_THEMES: Record<string, SwipeTheme> = {
  // 01 Editorial Luxury — tối, chữ serif, điểm nhấn vàng champagne
  "01": { ...base, key: "01", eyebrow: "Tuyển chọn" },
  // 02 Minimal Clean — trắng tinh, chữ không chân, tối giản
  "02": {
    ...base, key: "02", radius: 18, stage: "#f6f6f4", stageText: "#18181b", stageMuted: "#71717a", card: "#ffffff",
    info: "paper", infoBg: "#ffffff", text: "#18181b", muted: "#71717a", accent: "#18181b", font: SANS,
    titleWeight: 600, ...lightControls, ctaBg: "#18181b", ctaText: "#ffffff",
  },
  // 03 Cinematic Dark — đen sâu, ảnh tương phản cao
  "03": {
    ...base, key: "03", radius: 10, titleUpper: true, eyebrow: "Khung hình", stage: "radial-gradient(120% 80% at 50% 0%,#1f1a14 0%,#050505 70%)", card: "#000000",
    accent: "#e9b949", photoFilter: "contrast(1.08) saturate(1.1)", ctaBg: "#e9b949", ctaText: "#0a0a0a",
  },
  // 04 Romantic Pastel — hồng phấn, chữ serif mềm
  "04": {
    ...base, key: "04", radius: 36, eyebrow: "Dành tặng người thương", stage: "linear-gradient(180deg,#fff1f4 0%,#fde2e8 100%)", stageText: "#5b2333",
    stageMuted: "rgba(91,35,51,0.6)", card: "#fff7f9", info: "paper", infoBg: "#fff7f9", text: "#5b2333",
    muted: "rgba(91,35,51,0.65)", accent: "#d6336c", ...lightControls, ctaBg: "#d6336c", ctaText: "#ffffff",
  },
  // 05 Botanical Frame — giấy kem, khung lá mảnh
  "05": {
    ...base, key: "05", radius: 24, eyebrow: "Từ khu vườn", stage: "linear-gradient(180deg,#f3efe3 0%,#e7e1cf 100%)", stageText: "#2f3b24",
    stageMuted: "rgba(47,59,36,0.6)", card: "#fbf8ef", info: "paper", infoBg: "#fbf8ef", text: "#2f3b24",
    muted: "rgba(47,59,36,0.65)", accent: "#5c7a3e", innerFrame: "1px solid rgba(92,122,62,0.45)",
    ...lightControls, ctaBg: "#3f5a2a", ctaText: "#ffffff",
  },
  // 06 Glassmorphism — xanh đêm, thông tin trong tấm kính mờ
  "06": {
    ...base, key: "06", radius: 30, stage: "radial-gradient(100% 70% at 20% 0%,#1e3a8a 0%,#0b1226 60%,#05070f 100%)",
    stageText: "#e0e7ff", stageMuted: "rgba(224,231,255,0.6)", card: "#0b1226", info: "glass",
    accent: "#93c5fd", font: SANS, titleWeight: 600, ctaBg: "#e0e7ff", ctaText: "#0b1226",
  },
  // 07 Real Life – Shop Photo — ảnh thật, ánh vàng ấm của tiệm
  "07": {
    ...base, key: "07", radius: 20, eyebrow: "Ảnh chụp tại tiệm", stage: "linear-gradient(180deg,#2a1d12 0%,#120c07 100%)", accent: "#fbbf24",
    font: SANS, titleWeight: 600, photoFilter: "saturate(1.05) sepia(0.06)", ctaBg: "#fbbf24", ctaText: "#1c1207",
  },
  // 08 Real Life – Daylight — ánh sáng tự nhiên, sáng và ấm
  "08": {
    ...base, key: "08", radius: 22, eyebrow: "Dưới nắng sớm", stage: "linear-gradient(180deg,#fbf7f0 0%,#f1e8d8 100%)", stageText: "#3d2f1f",
    stageMuted: "rgba(61,47,31,0.6)", card: "#fffdf8", info: "paper", infoBg: "#fffdf8", text: "#3d2f1f",
    muted: "rgba(61,47,31,0.62)", accent: "#b45309", font: SANS, titleWeight: 600,
    photoFilter: "brightness(1.03) saturate(1.04)", ...lightControls, ctaBg: "#b45309", ctaText: "#ffffff",
  },
  // 09 Real Life – In Store — tiệm buổi tối, đèn vàng
  "09": {
    ...base, key: "09", radius: 20, eyebrow: "Góc tiệm buổi tối", stage: "linear-gradient(180deg,#1b1410 0%,#0d0907 100%)", accent: "#f59e0b",
    font: SANS, titleWeight: 600, ctaBg: "#f59e0b", ctaText: "#1b1410",
  },
  // 10 Real Life – Handheld — cầm trên tay, hiện đại, chữ không chân
  "10": {
    ...base, key: "10", radius: 32, stage: "linear-gradient(180deg,#1f2937 0%,#0f172a 100%)", accent: "#fda4af",
    font: SANS, titleWeight: 700, ctaBg: "#fb7185", ctaText: "#ffffff",
  },
  // 11 Lifestyle Context — kem be, như tạp chí nhà cửa
  "11": {
    ...base, key: "11", radius: 16, eyebrow: "Trong không gian sống", stage: "linear-gradient(180deg,#f5ede1 0%,#e9dcc6 100%)", stageText: "#3b2f22",
    stageMuted: "rgba(59,47,34,0.6)", card: "#fffaf2", info: "paper", infoBg: "#fffaf2", text: "#3b2f22",
    muted: "rgba(59,47,34,0.62)", accent: "#8a6a3f", ...lightControls, ctaBg: "#3b2f22", ctaText: "#fffaf2",
  },
  // 12 Mixed Media — ảnh in kiểu polaroid, chữ viết tay
  "12": {
    ...base, key: "12", radius: 6, tape: true, stage: "linear-gradient(180deg,#ece7df 0%,#ddd5c8 100%)", stageText: "#262220",
    stageMuted: "rgba(38,34,32,0.6)", card: "#fdfcf9", info: "polaroid", infoBg: "#fdfcf9", text: "#262220",
    muted: "rgba(38,34,32,0.6)", accent: "#c2410c", font: HAND, titleWeight: 700, ...lightControls,
    ctaBg: "#262220", ctaText: "#fdfcf9",
  },
  // Enterprise Luxury — rượu vang đậm, sang trọng cho khách doanh nghiệp
  enterprise: {
    ...base, key: "enterprise", radius: 22, eyebrow: "Quà tặng doanh nghiệp", stage: "linear-gradient(180deg,#2b0f17 0%,#12060a 100%)", accent: "#e8c8a0",
    ctaBg: "#e8c8a0", ctaText: "#2b0f17",
  },
  // Swipe Classic — giao diện sáng, quen thuộc như ứng dụng hẹn hò
  classic: {
    ...base, key: "classic", radius: 16, stage: "#f4f4f5", stageText: "#18181b", stageMuted: "#71717a", font: SANS,
    titleWeight: 700, accent: "#ffffff", ...lightControls, ctaBg: "#7a2e3b", ctaText: "#ffffff",
  },
}

const TEMPLATE_TO_THEME: Record<string, string> = {
  "editorial-luxury": "01", "minimal-clean": "02", "cinematic-dark": "03", "romantic-pastel": "04",
  "botanical-frame": "05", glassmorphism: "06", "real-life-shop": "07", "real-life-daylight": "08",
  "real-life-in-store": "09", "real-life-handheld": "10", "lifestyle-context": "11", "mixed-media": "12",
  "enterprise-luxury": "enterprise", "swipe-classic": "classic",
}

/** Nhận số kiểu ("03"), id mẫu ("cinematic-dark") hoặc khóa chủ đề. */
export function getSwipeTheme(key: string | undefined): SwipeTheme {
  const k = key ? (TEMPLATE_TO_THEME[key] ?? key) : "01"
  return SWIPE_THEMES[k] ?? SWIPE_THEMES["01"]!
}

export function isLightTheme(theme: SwipeTheme): boolean {
  return theme.info === "paper" || theme.info === "polaroid" || theme.key === "classic"
}
