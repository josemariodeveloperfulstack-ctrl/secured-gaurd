import os
import re

controller_dir = r"c:\dev\secured-guard\backend\src\main\java\com\z7design\secured_guard\controller"
request_param_regex = re.compile(r'@RequestParam\s*(\((?![^)]*value\s*=)(?![^)]*name\s*=)[^)]*\)|(?!\s*\())\s*([ \w<>\[\],]+)\s+([a-zA-Z0-9_]+)')

# This regex tries to find @RequestParam that:
# 1. Has no parentheses at all: @RequestParam Type name
# 2. Has parentheses but no 'value' or 'name' attribute: @RequestParam(required=false) Type name

results = []

for root, dirs, files in os.walk(controller_dir):
    for file in files:
        if file.endswith(".java"):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                matches = request_param_regex.findall(content)
                if matches:
                    results.append((file, matches))

if not results:
    print("No problematic @RequestParam found.")
else:
    for file, matches in results:
        print(f"File: {file}")
        for match in matches:
            # match[0] is the annotation part, match[1] is the type, match[2] is the variable name
            print(f"  - {match[2]} (Type: {match[1]}, Annotation: @RequestParam{match[0]})")
