"""`PassthroughEnhancer` — KHÔNG phải một enhancer.

Nó trả về đúng byte ảnh đưa vào, không sửa một pixel. Tên gọi nói thẳng điều
đó để không ai nhầm nó với một adapter thật.

Vì sao nó tồn tại: P9 làm Identity Guard trước, phần tăng cường ảnh thật
(Real-ESRGAN / API thương mại / model riêng) làm sau. Không có một
`ImageEnhancer` nào thì pipeline không chạy được end-to-end và Guard không
có gì để gác.

Cái nó cho, ngoài việc chạy được: một phép thử hồi quy thật. Ảnh so với chính
nó thì Guard PHẢI ra `SAFE` với cả bốn điểm bằng 1,0. Guard nói khác là Guard
hỏng. Không adapter thật nào cho được phép thử có đáp án biết trước như vậy.

`generated_flags` đều `false` — đúng sự thật, không có khâu sinh ảnh nào chạy.
"""

from __future__ import annotations

from media_ai.providers.base import KetQuaTangCuong


class PassthroughEnhancer:
    name = "passthrough"
    model_version = "khong-tang-cuong"

    def enhance(self, image: bytes, config: dict) -> KetQuaTangCuong:
        return {
            "image": image,
            "generated_flags": {
                "generative_fill_used": False,
                "requires_reshoot_warning": False,
            },
            "parameters": {
                "note": "Không tăng cường — adapter tạm của P9 đợt một",
                "config_da_nhan": config,
            },
        }
