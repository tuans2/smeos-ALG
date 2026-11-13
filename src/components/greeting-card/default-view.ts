/**
 * Mở Thẻ chào thì vào thẳng chỗ làm việc của vai (kế hoạch lễ 20/10, J): người xác nhận tiền
 * (Điều hành) → bảng Điều hành; người điều phối đơn → bảng Điều phối; Sale → tab Bán hàng ở chế độ
 * Quản lý — cùng giao diện với Điều hành để hai bên phối hợp trên cùng một màn (PO 16/10/2026).
 * Suy từ năng lực, không từ tên vai — đây chỉ là ẩn hiện giao diện, máy chủ vẫn kiểm ở mọi endpoint.
 */
export type TheChaoDefaultView =
  | { viewMode: "wizard"; activeTab: "catalog" }
  | { viewMode: "manager"; activeTab: "payment" | "coordinator" | "sales" }

export function defaultTheChaoView(can: (code: string) => boolean): TheChaoDefaultView {
  if (can("R11")) return { viewMode: "manager", activeTab: "payment" }
  if (can("R3") || can("R4") || can("R5")) return { viewMode: "manager", activeTab: "coordinator" }
  if (can("R2")) return { viewMode: "manager", activeTab: "sales" }
  return { viewMode: "wizard", activeTab: "catalog" }
}
