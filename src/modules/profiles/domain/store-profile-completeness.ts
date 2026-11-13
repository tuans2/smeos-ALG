/**
 * Độ đầy đủ của hồ sơ cửa hàng và thương hiệu (công cụ 51, module Thương hiệu).
 *
 * Một hồ sơ là nguồn dữ liệu chung cho trang chia sẻ cửa hàng, danh thiếp và
 * các công cụ tạo nội dung — nên mỗi mục ghi rõ nó được dùng ở đâu, để người
 * dùng hiểu vì sao cần điền. Thuần: không import hạ tầng.
 */
import { isValidEmail } from "@/modules/organization/domain/credentials"
import { isValidHexColor } from "./profile-rules"

export type ProfileSection = "INFO" | "BRANDING"

export type ProfileUsage = "SHARE_PAGE" | "BUSINESS_CARD" | "CONTENT"

export interface StoreProfileSnapshot {
  readonly business: {
    readonly display_name: string
    readonly phone: string | null
    readonly email: string | null
    readonly address: string | null
    readonly description: string | null
    readonly operating_hours: Record<string, unknown> | null
    readonly social_links: Record<string, unknown> | null
  } | null
  readonly brand: {
    readonly logo_asset_id: string | null
    readonly primary_color: string | null
    readonly tone_of_voice: string | null
  } | null
}

export interface ProfileChecklistItem {
  readonly key: string
  readonly label: string
  /** Điền mục này giúp được gì — hiện cho người dùng */
  readonly benefit: string
  readonly section: ProfileSection
  /** Bắt buộc để trang chia sẻ và danh thiếp dùng được */
  readonly essential: boolean
  readonly usedIn: readonly ProfileUsage[]
  readonly done: boolean
}

export interface StoreProfileCompleteness {
  /** 0–100, mục thiết yếu nặng gấp đôi */
  readonly percent: number
  readonly items: readonly ProfileChecklistItem[]
  readonly missing: readonly ProfileChecklistItem[]
  /** Đủ mục thiết yếu để tạo trang chia sẻ / danh thiếp */
  readonly readyToShare: boolean
}

const filled = (v: string | null | undefined): boolean => Boolean(v && v.trim())

const hasAnyValue = (v: Record<string, unknown> | null | undefined): boolean =>
  Boolean(v && Object.values(v).some((x) => (typeof x === "string" ? x.trim() : x)))

/** Số điện thoại Việt Nam: 8–11 chữ số, cho phép +84, khoảng trắng, dấu chấm, gạch. */
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/[\s.\-()]/g, "").replace(/^\+84/, "0")
  return /^\d{8,11}$/.test(digits)
}

export function evaluateStoreProfile(snapshot: StoreProfileSnapshot): StoreProfileCompleteness {
  const b = snapshot.business
  const br = snapshot.brand

  const items: ProfileChecklistItem[] = [
    {
      key: "display_name", label: "Tên cửa hàng", section: "INFO", essential: true,
      benefit: "Hiện trên mọi trang chia sẻ, danh thiếp và ấn phẩm",
      usedIn: ["SHARE_PAGE", "BUSINESS_CARD", "CONTENT"],
      done: filled(b?.display_name),
    },
    {
      key: "phone", label: "Số điện thoại liên hệ", section: "INFO", essential: true,
      benefit: "Khách bấm gọi hoặc nhắn Zalo ngay từ trang chia sẻ",
      usedIn: ["SHARE_PAGE", "BUSINESS_CARD"],
      done: filled(b?.phone) && isPlausiblePhone(b?.phone ?? ""),
    },
    {
      key: "address", label: "Địa chỉ cửa hàng", section: "INFO", essential: true,
      benefit: "Khách tìm đường đến cửa hàng",
      usedIn: ["SHARE_PAGE", "BUSINESS_CARD"],
      done: filled(b?.address),
    },
    {
      key: "logo", label: "Logo", section: "BRANDING", essential: true,
      benefit: "Khách nhận ra cửa hàng trên danh thiếp và ảnh xem trước link",
      usedIn: ["SHARE_PAGE", "BUSINESS_CARD", "CONTENT"],
      done: filled(br?.logo_asset_id),
    },
    {
      key: "primary_color", label: "Màu thương hiệu", section: "BRANDING", essential: false,
      benefit: "Ấn phẩm và trang chia sẻ dùng đúng màu của cửa hàng",
      usedIn: ["SHARE_PAGE", "BUSINESS_CARD", "CONTENT"],
      done: filled(br?.primary_color) && isValidHexColor(br?.primary_color ?? ""),
    },
    {
      key: "description", label: "Giới thiệu ngắn", section: "INFO", essential: false,
      benefit: "Một đoạn mô tả cửa hàng cho khách mới",
      usedIn: ["SHARE_PAGE", "CONTENT"],
      done: filled(b?.description),
    },
    {
      key: "operating_hours", label: "Giờ mở cửa", section: "INFO", essential: false,
      benefit: "Khách biết khi nào đến hoặc liên hệ được",
      usedIn: ["SHARE_PAGE"],
      done: hasAnyValue(b?.operating_hours),
    },
    {
      key: "email", label: "Thư điện tử", section: "INFO", essential: false,
      benefit: "Kênh liên hệ cho khách doanh nghiệp",
      usedIn: ["BUSINESS_CARD"],
      done: filled(b?.email) && isValidEmail(b?.email ?? ""),
    },
    {
      key: "social_links", label: "Mạng xã hội", section: "INFO", essential: false,
      benefit: "Khách theo dõi trang Facebook, Zalo hoặc TikTok của cửa hàng",
      usedIn: ["SHARE_PAGE", "BUSINESS_CARD"],
      done: hasAnyValue(b?.social_links),
    },
    {
      key: "tone_of_voice", label: "Giọng văn thương hiệu", section: "BRANDING", essential: false,
      benefit: "Nội dung AI viết ra đúng phong cách cửa hàng",
      usedIn: ["CONTENT"],
      done: filled(br?.tone_of_voice),
    },
  ]

  const weight = (i: ProfileChecklistItem) => (i.essential ? 2 : 1)
  const total = items.reduce((s, i) => s + weight(i), 0)
  const got = items.filter((i) => i.done).reduce((s, i) => s + weight(i), 0)
  const missing = items
    .filter((i) => !i.done)
    .sort((a, c) => Number(c.essential) - Number(a.essential))

  return {
    percent: Math.round((got / total) * 100),
    items,
    missing,
    readyToShare: items.every((i) => !i.essential || i.done),
  }
}
