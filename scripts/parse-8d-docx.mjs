#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const docxPath = process.argv[2] || path.join(process.env.USERPROFILE || "", "Downloads/8D_Izvestaji_Industrijski_Dijelovi.docx");
const tmpZip = path.resolve(".tmp-8d-docx.zip");
const tmpDir = path.resolve(".tmp-8d-docx");

if (!fs.existsSync(path.join(tmpDir, "word/document.xml"))) {
  fs.copyFileSync(docxPath, tmpZip);
  // unzip via powershell
  const { execSync } = await import("node:child_process");
  execSync(`powershell -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpDir}' -Force"`, { stdio: "inherit" });
}

const xml = fs.readFileSync(path.join(tmpDir, "word/document.xml"), "utf8");

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const paragraphs = [];
const pRe = /<w:p[\s>][\s\S]*?<\/w:p>/g;
let pm;
while ((pm = pRe.exec(xml)) !== null) {
  const pXml = pm[0];
  const texts = [];
  const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let tm;
  while ((tm = tRe.exec(pXml)) !== null) {
    texts.push(decodeEntities(tm[1]));
  }
  const line = texts.join("").trim();
  if (line) paragraphs.push(line);
}

const outPath = path.resolve("docs/knowledge/primeri-8d/izvuceno-iz-word.txt");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, paragraphs.join("\n"), "utf8");

console.log(`Extracted ${paragraphs.length} paragraphs → ${outPath}\n`);
paragraphs.forEach((p, i) => {
  if (i < 250) console.log(p);
});
if (paragraphs.length > 250) console.log(`\n... +${paragraphs.length - 250} more lines in file`);
