import { extendTailwindMerge } from "tailwind-merge"

// Cỡ chữ tự đặt trong `@theme` (globals.css) — khai báo để `text-caption`… được hiểu là
// cỡ chữ, không bị coi là màu chữ và xoá nhầm `text-white`/`text-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "meta", "body-sm", "body", "title-sm", "title", "display", "display-lg", "display-xl"],
    },
  },
})

/** Ghép class; class xung đột viết sau thắng (className đè variant/size của component). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "))
}

/** Bỏ dấu tiếng Việt và đưa về chữ thường để tìm kiếm / so sánh không phân biệt dấu */
export function stripVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
}
