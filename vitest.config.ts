import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    // Harvest R2 dùng `node:test`, không dùng vitest — xem
    // `npm run test:harvest`. Vitest không polyfill `node:test`.
    exclude: ["tests/maChucNang.test.ts", "node_modules/**"],
    setupFiles: ["tests/setup.ts"],
    // Bộ test cách ly dùng chung một cơ sở dữ liệu và dọn bảng giữa các
    // trường hợp, nên chạy tuần tự trong một tiến trình.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      /**
       * `server-only` là một cái chốt CHỈ dành cho trình dựng của Next.js:
       * `index.js` của nó ném lỗi ngay khi được nạp, và chỉ điều kiện xuất
       * `react-server` mới đổi nó thành một mô-đun rỗng. Vitest không bật
       * điều kiện đó, nên bất kỳ tệp test nào chạm tới một mô-đun có
       * `import "server-only"` sẽ đổ ở bước NẠP, trước khi ca thử đầu tiên
       * kịp chạy — lỗi hiện ra là "This module cannot be imported from a
       * Client Component module", nghe như lỗi của mã, nhưng không phải.
       *
       * Ở đây mã đang thử CHÍNH LÀ mã máy chủ, nên cái chốt không có việc
       * gì để làm; thay nó bằng một mô-đun rỗng. Chốt thật vẫn nguyên ở bản
       * dựng production — đây chỉ là cấu hình của bộ chạy test.
       *
       * Sinh ra khi `storage-provider-factory.ts` (lượt gom kho tệp S3/R2)
       * thêm `import "server-only"`: năm suite `tests/tenant/` đọc tới nó
       * qua chuỗi route → use-case → factory, và cả năm tắt cùng lúc.
       */
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
})
