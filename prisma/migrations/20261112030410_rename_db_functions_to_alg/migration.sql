-- Đổi tên thương hiệu ALG (12/11/2026): đổi tên 5 hàm trigger `smeos_*` → `alg_*`.
-- Trigger trỏ tới hàm theo OID nên vẫn chạy sau khi đổi tên; không đổi thân hàm, không đụng dữ liệu.
-- Không đổi tên trigger (tên trigger không mang thương hiệu). Migration cũ giữ nguyên (đã chạy, không sửa tay).
ALTER FUNCTION smeos_fill_org_from_parent() RENAME TO alg_fill_org_from_parent;
ALTER FUNCTION smeos_organization_links_one_primary() RENAME TO alg_organization_links_one_primary;
ALTER FUNCTION smeos_customers_branch_from_order() RENAME TO alg_customers_branch_from_order;
ALTER FUNCTION smeos_append_only_guard() RENAME TO alg_append_only_guard;
ALTER FUNCTION smeos_fill_chat_counterpart() RENAME TO alg_fill_chat_counterpart;
