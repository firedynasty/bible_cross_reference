# Converts a .txt file to a JSON file with format {"content": "..."}
# for serving via Vercel (which routes .json but not .txt).
#
# Usage:
#   python txt_to_json.py
#       reads shortcuts_explanation.txt, writes public/shortcuts_explanation.json
#
#   python txt_to_json.py shortcuts_explanation.txt public/shortcuts_explanation.json
#       explicit source and destination paths
#
# Workflow:
#   1. Edit shortcuts_explanation.txt
#   2. Run: python txt_to_json.py
#   3. Commit and push public/shortcuts_explanation.json

import json
import sys
import os

def convert(txt_path, json_path):
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({"content": content}, f, ensure_ascii=False, indent=None)
    print(f"Written: {json_path}")

if __name__ == "__main__":
    txt  = sys.argv[1] if len(sys.argv) > 1 else "shortcuts_explanation.txt"
    json_out = sys.argv[2] if len(sys.argv) > 2 else os.path.join("public", os.path.splitext(os.path.basename(txt))[0] + ".json")
    convert(txt, json_out)
