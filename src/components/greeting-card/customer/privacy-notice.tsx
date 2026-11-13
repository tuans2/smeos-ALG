import { PRIVACY_POLICY_PATH, isPrivacyNoticeEnabled } from "@/lib/privacy-notice"
import { getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

/** Dòng chữ nhỏ dưới nút đặt hàng; không hiện gì khi chưa bật (xem `lib/privacy-notice.ts`). */
export function PrivacyNotice({ industryKey }: { industryKey?: string | null | undefined } = {}) {
  if (!isPrivacyNoticeEnabled()) return null
  const isHomestay = industryKey === "HOMESTAY"
  const isServices = industryKey === "SERVICES"

  const actionText = isHomestay ? "đặt phòng" : isServices ? "đặt lịch hẹn" : "đặt hàng"
  const purposeText = isHomestay ? "phục vụ việc lưu trú" : isServices ? "phục vụ dịch vụ" : "giao hàng"

  return (
    <p className="text-center text-caption text-text-muted">
      Khi {actionText}, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để {purposeText}.{" "}
      <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noreferrer" className="underline">
        Chính sách bảo mật
      </a>
    </p>
  )
}
