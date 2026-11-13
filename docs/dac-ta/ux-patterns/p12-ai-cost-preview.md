# Pattern UX-P12 — AI Cost Preview

## Mục tiêu
Thực thi 03c UX-019: người dùng biết trước tác vụ AI tốn bao nhiêu.

## Quy tắc
- Ngay cạnh CTA: số credit dự kiến và số còn lại ("dùng 4 credit · còn 26") — `src/components/ui/cost-preview.tsx`.
- Thay đổi tùy chọn làm đổi chi phí → cập nhật ngay.
- Vượt hạn mức: chặn trước khi gửi, nêu cách xử lý; không để backend từ chối sau khi người dùng đã chờ.
- Số liệu lấy từ server; ghi "dự kiến" khi chưa chắc chắn.
