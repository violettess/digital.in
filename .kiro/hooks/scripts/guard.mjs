#!/usr/bin/env node
// Guard untuk Kiro PreToolUse hook — versi native Kiro dari .github/hooks/guard.mjs (Copilot).
// Exit 2 + pesan di stderr = tool diblokir. Exit 0 = diizinkan. Kalau script ini error, fail-open (exit 0),
// jadi tetap jangan andalkan ini sebagai satu-satunya pengaman — lihat juga "Batas Keamanan" di steering.

import { readFileSync } from "node:fs";

const RULES = [
  [/HOOK_GUARD_TEST/, "Perintah uji hook (tanda hook aktif)."],
  [/\bgit\s+push\b[^\n]*(--force|--force-with-lease|\s-f\b)/i, "Force push dilarang."],
  [/\bgit\s+push\b[^\n]*\b(main|master)\b/i, "Push ke main/master dilarang."],
  [/\bgit\s+reset\s+--hard\b/i, "git reset --hard dilarang."],
  [/\bgit\s+clean\s+-[a-z]*f/i, "git clean -f dilarang."],
  [/\bgit\s+rebase\b/i, "git rebase dilarang."],
  [/\bsudo\b/i, "sudo dilarang."],
  [/\brm\s+-[a-z]*r[a-z]*\s+(\/(\s|$|\*)|~|\$HOME|\.\.(\/|\s|$)|\*(\s|$))/i, "Menghapus folder sistem/home/parent dilarang."],
  [/\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n|]*\|\s*(sh|bash|zsh|iex|Invoke-Expression)\b/i, "Menjalankan script dari internet dilarang."],
  [/\bdocker\s+(system\s+prune|volume\s+(rm|prune))\b/i, "Menghapus data Docker dilarang."],
  [/\bdrop\s+database\b/i, "DROP DATABASE dilarang."],
  [/\b(mkfs|diskpart|format\s+[a-z]:)/i, "Operasi disk dilarang."],
];

const COMMAND_KEYS = /^(command|cmd|commandline|script|description)$/i;
function collectText(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectText(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectText(v, out));
  return out;
}

try {
  const raw = readFileSync(0, "utf8");
  let text;
  try {
    text = collectText(JSON.parse(raw)).join("\n");
  } catch {
    text = raw;
  }
  for (const [pattern, reason] of RULES) {
    if (pattern.test(text)) {
      process.stderr.write(`Diblokir oleh .kiro/hooks/scripts/guard.mjs: ${reason} Cari cara lain, atau catat sebagai Blocker di docs/backend-design/PROGRESS.md.\n`);
      process.exit(2);
    }
  }
} catch {
  // fail-open
}
process.exit(0);
