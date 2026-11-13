import { LinkUnavailable } from "@/components/greeting-card/customer/link-unavailable"

export default function CatalogSlugNotFound() {
  return (
    <LinkUnavailable
      title="Link không tồn tại hoặc đã hết hạn"
      message="Bộ sưu tập này không còn hiệu lực. Vui lòng liên hệ cửa hàng để nhận link mới."
    />
  )
}
