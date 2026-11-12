import { assertLoadTestDatabaseName } from "@/core/runtime/load-test"

/**
 * Chốt chặn của công cụ thử tải (ADR-015 D-O7): sinh dữ liệu ghi hàng triệu dòng — tuyệt đối không chạy trên production.
 * Luật ở `assertLoadTestDatabaseName` (có test).
 */
export function assertLoadTestDatabase(): string {
  return assertLoadTestDatabaseName(process.env["DATABASE_URL"] ?? "", process.env["LOAD_TEST_DATABASE"] ?? "")
}
