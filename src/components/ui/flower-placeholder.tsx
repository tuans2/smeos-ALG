// Ảnh sản phẩm chưa có thật trong bản demo này — dùng hình hoa cách điệu
// (theo mô-típ logo ALG) làm chỗ trống rõ ràng, không giả làm ảnh thật.

export function FlowerPlaceholder({
  size = 24,
  color,
  className,
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
      <path d="M50,50 C47,40 33,26 50,14 C67,26 53,40 50,50 Z" fill={color ?? "currentColor"} />
    </svg>
  )
}
