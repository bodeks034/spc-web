from pathlib import Path

lines = Path("src/App.jsx").read_text(encoding="utf-8").splitlines()

def extract(start, end, fname, renames):
    body = "\n".join(lines[start - 1 : end])
    for old, new in renames:
        body = body.replace(old, new)
    header = (
        'import { useState, useEffect } from "react";\n'
        'import { supabase } from "../lib/supabaseClient.js";\n\n'
    )
    Path("src/components/" + fname).write_text(header + body, encoding="utf-8")

extract(
    5573,
    5821,
    "KalibracijaMerilaPanel.jsx",
    [
        ("function KalibracijaMerila", "export default function KalibracijaMerilaPanel"),
    ],
)
extract(
    5989,
    6182,
    "RadniNaloziPanel.jsx",
    [
        ("function RadniNaloziPanel", "export default function RadniNaloziPanel"),
    ],
)
print("extracted")
