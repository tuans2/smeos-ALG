import { LinkUnavailable } from "@/components/greeting-card/customer/link-unavailable"

export default function ShareLinkNotFound() {
  return (
    <LinkUnavailable
      title="Link không tồn tại hoặc đã hết hạn"
      message="Đường dẫn xem bộ sưu tập này không còn hiệu lực hoặc đã hết thời gian sử dụng. Vui lòng liên hệ người gửi hoặc cửa hàng để nhận link mới."
    />
  )
}
