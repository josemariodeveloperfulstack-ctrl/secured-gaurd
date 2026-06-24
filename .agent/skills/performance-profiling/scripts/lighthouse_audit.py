#!/usr/bin/env python3
"""
Skill: performance-profiling
Script: lighthouse_audit.py
Purpose: Run Lighthouse performance audit on a URL
Usage: python lighthouse_audit.py https://example.com
Output: JSON with performance scores
Note: Requires lighthouse CLI (npm install -g lighthouse)
"""
import subprocess
import json
import sys
import os
import tempfile

def run_lighthouse(url: str) -> dict:
    """Run Lighthouse audit on URL."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            output_path = f.name
        
        result = subprocess.run(
            [
                "C:\\Users\\José Mário Ramos\\AppData\\Roaming\\npm\\lighthouse.cmd",
                url,
                "--output=json",
                f"--output-path={output_path}",
                "--chrome-flags=--headless --ignore-certificate-errors --allow-insecure-localhost --user-data-dir=C:\\Users\\José Mário Ramos\\.gemini\\antigravity\\scratch\\chrome-profile",
                "--only-categories=performance,accessibility,best-practices,seo"
            ],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if os.path.exists(output_path):
            with open(output_path, 'r', encoding='utf-8') as f:
                report = json.load(f)
            os.unlink(output_path)
            
            categories = report.get("categories", {})
            def safe_score(cat_name):
                cat = categories.get(cat_name, {})
                if not cat:
                    return 0
                val = cat.get("score")
                return int(val * 100) if val is not None else 0

            return {
                "url": url,
                "scores": {
                    "performance": safe_score("performance"),
                    "accessibility": safe_score("accessibility"),
                    "best_practices": safe_score("best-practices"),
                    "seo": safe_score("seo")
                },
                "summary": get_summary(categories)
            }
        else:
            return {"error": "Lighthouse failed to generate report", "stderr": result.stderr[:500]}
            
    except subprocess.TimeoutExpired:
        return {"error": "Lighthouse audit timed out"}
    except FileNotFoundError:
        return {"error": "Lighthouse CLI not found. Install with: npm install -g lighthouse"}

def get_summary(categories: dict) -> str:
    """Generate summary based on scores."""
    perf_cat = categories.get("performance", {})
    if not perf_cat:
        return "[X] No performance category found"
    perf = perf_cat.get("score")
    if perf is None:
        return "[X] Performance score is null"
    perf *= 100
    if perf >= 90:
        return "[OK] Excellent performance"
    elif perf >= 50:
        return "[!] Needs improvement"
    else:
        return "[X] Poor performance"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python lighthouse_audit.py <url>"}))
        sys.exit(1)
    
    result = run_lighthouse(sys.argv[1])
    print(json.dumps(result, indent=2))
