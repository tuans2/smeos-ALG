#!/usr/bin/env python3
"""Đọc SARIF của CodeQL (thư mục), ghi tóm tắt vào trang job và thoát mã 1 khi có phát hiện mức cao/nghiêm trọng MỚI.

Phát hiện có sẵn nằm trong `scripts/codeql-baseline.json` (mốc nợ theo cặp luật × tệp, chỉ được thu hẹp — giống
ratchet ESLint/UX của repo): vượt số trong mốc mới chặn. Đếm theo tệp chứ không theo dòng để sửa mã gần đó không
làm chốt nhảy.

Mức lấy từ `security-severity` của luật (CVSS 0–10): >= 7.0 là cao, >= 9.0 là nghiêm trọng — cùng thang GitHub dùng
khi code scanning bật. Dùng trong `.github/workflows/codeql.yml` (PO duyệt 07/11/2026).
"""

import glob
import json
import os
import sys
from collections import Counter

BLOCK_AT = 7.0
BASELINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "codeql-baseline.json")


def load_baseline(language):
    try:
        with open(BASELINE, encoding="utf-8") as f:
            return Counter(json.load(f).get(language, {}))
    except FileNotFoundError:
        return Counter()


def severity_of(rule):
    try:
        return float((rule.get("properties") or {}).get("security-severity", 0))
    except (TypeError, ValueError):
        return 0.0


def main(folder, language):
    findings = []
    paths = glob.glob(os.path.join(folder, "*.sarif"))
    if not paths:
        print(f"Không thấy tệp SARIF trong {folder} — phân tích CodeQL không cho kết quả", file=sys.stderr)
        return 1
    for path in paths:
        with open(path, encoding="utf-8") as f:
            sarif = json.load(f)
        for run in sarif.get("runs", []):
            rules = {}
            driver = run.get("tool", {}).get("driver", {})
            for rule in driver.get("rules", []) + [r for ext in run.get("tool", {}).get("extensions", []) for r in ext.get("rules", [])]:
                rules[rule.get("id")] = rule
            for result in run.get("results", []):
                rule = rules.get(result.get("ruleId"), {})
                loc = (result.get("locations") or [{}])[0].get("physicalLocation", {})
                findings.append({
                    "rule": result.get("ruleId"),
                    "severity": severity_of(rule),
                    "file": loc.get("artifactLocation", {}).get("uri", "?"),
                    "line": loc.get("region", {}).get("startLine", "?"),
                    "message": (result.get("message") or {}).get("text", "").split("\n")[0][:200],
                })
    findings.sort(key=lambda x: -x["severity"])
    high = [x for x in findings if x["severity"] >= BLOCK_AT]
    baseline = load_baseline(language)
    current = Counter(f"{x['rule']}|{x['file']}" for x in high)
    new_keys = {k: current[k] - baseline.get(k, 0) for k in current if current[k] > baseline.get(k, 0)}
    shrinkable = {k: baseline[k] - current.get(k, 0) for k in baseline if baseline[k] > current.get(k, 0)}
    blocking = [x for x in high if f"{x['rule']}|{x['file']}" in new_keys]

    lines = [f"### CodeQL ({language}): {len(findings)} phát hiện, {len(high)} mức cao/nghiêm trọng, {len(blocking)} thuộc nhóm MỚI so với mốc", ""]
    if new_keys:
        lines += ["**Phát hiện mới (chặn):**", ""] + [f"- `{k}`: thêm {n}" for k, n in sorted(new_keys.items())] + [""]
    if shrinkable:
        lines += ["**Mốc thu hẹp được** (đã sửa — giảm/xoá dòng này trong `scripts/codeql-baseline.json`):", ""]
        lines += [f"- `{k}`: bớt {n}" for k, n in sorted(shrinkable.items())] + [""]
    if findings:
        lines += ["| Mức | Luật | Vị trí | Mô tả |", "|---|---|---|---|"]
        lines += [f"| {x['severity']:.1f} | `{x['rule']}` | `{x['file']}:{x['line']}` | {x['message']} |" for x in findings[:100]]
    summary = "\n".join(lines) + "\n"
    print(summary)
    out = os.environ.get("GITHUB_STEP_SUMMARY")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(summary)
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "codeql-results", sys.argv[2] if len(sys.argv) > 2 else ""))
