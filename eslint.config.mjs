import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

/**
 * `npm run lint` là một trong bốn cổng của CI. Cấu hình phẳng của ESLint 9;
 * mã sinh sẵn và thư mục worker Python nằm ngoài phạm vi.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "workers/**",
      "docker/**",
      // Cấu hình agent nội bộ (skill bên thứ ba), không phải mã sản phẩm
      ".agents/**",
      "next-env.d.ts",
      // Thu hoạch R2, chép nguyên vẹn — `npm run test:harvest` giữ nó xanh
      // không sửa một dòng (`YC-Q1`). Lint theo cấu hình của floraos-core
      // không áp dụng cho mã harvest từ một repo khác.
      "tests/maChucNang.test.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default config
