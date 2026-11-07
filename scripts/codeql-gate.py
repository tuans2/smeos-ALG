#!/usr/bin/env python3
"""Đọc SARIF của CodeQL (thư mục), ghi tóm tắt vào trang job và thoát mã 1 khi có phát hiện mức cao/nghiêm trọng.

Mức lấy từ `security-severity` của luật (CVSS 0–10): >= 7.0 là cao, >= 9.0 là nghiêm trọng — cùng thang GitHub dùng
khi code scanning bật. Dùng trong `.github/workflows/codeql.yml` (PO duyệt 07/11/2026).
"""

import glob
import json
import os
import sys

BLOCK_AT = 7.0


def severity_of(rule):
    try:
        return float((rule.get("properties") or {}).get("security-severity", 0))
    except (TypeError, ValueError):
        return 0.0


def main(folder):
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
    blocking = [x for x in findings if x["severity"] >= BLOCK_AT]
    lines = [f"### CodeQL: {len(findings)} phát hiện, {len(blocking)} mức cao/nghiêm trọng", ""]
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
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "codeql-results"))
