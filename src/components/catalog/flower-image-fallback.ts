/**
 * SSOT Fallback Flower Images
 * Đảm bảo 100% giao diện Catalog và Landing Page luôn có hình ảnh hoa chân thực, rực rỡ
 * ngay cả khi sản phẩm chưa tải ảnh hoặc ảnh từ URL bên ngoài bị lỗi kết nối.
 */

export const DEFAULT_FLOWER_IMAGES: string[] = [
  "/images/flowers/g001.jpeg",
  "/images/flowers/g002.jpeg",
  "/images/flowers/g010.jpeg",
  "/images/flowers/g041.jpg",
  "/images/flowers/g042.jpg",
  "/images/flowers/g043.jpg",
  "/images/flowers/g044.jpg",
  "/images/flowers/g050.jpeg",
  "/images/flowers/g070.jpeg",
]

import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"
import { urlHostIs } from "@/lib/url-host"

export const FLORIST_STORY_IMAGE = "/images/flowers/g040.jpg"

export function resolveFlowerImage(imageUrl: string | null | undefined, index: number = 0): string {
  if (imageUrl && imageUrl.trim().length > 0) {
    if (urlHostIs(imageUrl, "drive.google.com")) {
      const proxied = driveThumbProxySrc(imageUrl)
      if (proxied) return proxied
    }
    return imageUrl
  }
  const safeIdx = Math.abs(index)
  return DEFAULT_FLOWER_IMAGES[safeIdx % DEFAULT_FLOWER_IMAGES.length] ?? "/images/flowers/g001.jpeg"
}
