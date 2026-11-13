import { describe, it, expect } from "vitest";
import { determineTrendLifecycle, LIFECYCLE_SPECS } from "@/modules/market-intelligence/domain/trend-lifecycle";

describe("Trend Lifecycle Domain Logic (v2.0)", () => {
  it("xác định đúng trạng thái EMERGING khi tăng trưởng đột biến ở mức nền thấp", () => {
    const lifecycle = determineTrendLifecycle(55, 0.2, 50);
    expect(lifecycle).toBe("EMERGING");
    expect(LIFECYCLE_SPECS[lifecycle].shortLabel).toBe("Mới nổi");
  });

  it("xác định đúng trạng thái GROWING khi điểm cao và vận tốc dương", () => {
    const lifecycle = determineTrendLifecycle(75, 0.8, 25);
    expect(lifecycle).toBe("GROWING");
    expect(LIFECYCLE_SPECS[lifecycle].shortLabel).toBe("Đang tăng");
  });

  it("xác định đúng trạng thái PEAK khi điểm rất cao và tốc độ đi ngang", () => {
    const lifecycle = determineTrendLifecycle(90, 0.05, 2);
    expect(lifecycle).toBe("PEAK");
    expect(LIFECYCLE_SPECS[lifecycle].shortLabel).toBe("Đạt đỉnh");
  });

  it("xác định đúng trạng thái DECLINING khi vận tốc hoặc tăng trưởng âm sâu", () => {
    const lifecycle = determineTrendLifecycle(40, -0.5, -25);
    expect(lifecycle).toBe("DECLINING");
    expect(LIFECYCLE_SPECS[lifecycle].shortLabel).toBe("Hạ nhiệt");
  });

  it("mặc định rơi vào STABLE nếu không có đột biến", () => {
    const lifecycle = determineTrendLifecycle(60, 0.1, 5);
    expect(lifecycle).toBe("STABLE");
    expect(LIFECYCLE_SPECS[lifecycle].shortLabel).toBe("Ổn định");
  });
});
