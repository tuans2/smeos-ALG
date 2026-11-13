import { LinkUnavailable } from "@/components/greeting-card/customer/link-unavailable"

export default function BrochureNotFound() {
  return (
    <LinkUnavailable
      title="Link không tồn tại hoặc đã hết hạn"
      message="Đường dẫn xem bộ sưu tập này không tồn tại hoặc đã hết thời gian sử dụng. Vui lòng liên hệ với người gửi hoặc cửa hàng để nhận link mới."
    />
  )
}
