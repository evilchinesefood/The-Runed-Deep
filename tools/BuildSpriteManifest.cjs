const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSS_DIR = path.join(ROOT, "public", "css", "sprites");
const SRC_DIR = path.join(ROOT, "src");
const OUT = path.join(ROOT, "public", "sprites-manifest.json");

const SHEETS = ["monsters", "items", "tiles", "effects", "player"];

// Parse a CSS file into sprite entries
function parseCss(sheet) {
  const file = path.join(CSS_DIR, `${sheet}.css`);
  const css = fs.readFileSync(file, "utf8");

  // Get sheet-level dimensions from the base class
  let png = "",
    width = 0,
    height = 0;
  const baseMatch = css.match(
    /url\(['"]?\.\.\/\.\.\/assets\/([^'")\s]+)['"]?\).*?background-size:\s*(\d+)px\s+(\d+)px/s,
  );
  if (baseMatch) {
    png = `assets/${baseMatch[1]}`;
    width = parseInt(baseMatch[2]);
    height = parseInt(baseMatch[3]);
  }

  // Extract all sprite classes
  const sprites = [];
  const re =
    /^\.([a-zA-Z0-9_-]+)\s*\{[^}]*?(-?\d+)px\s+(-?\d+)px;\s*\n\s*background-size/gm;
  let m;
  while ((m = re.exec(css)) !== null) {
    const className = m[1];
    const x = Math.abs(parseInt(m[2]));
    const y = Math.abs(parseInt(m[3]));
    // Subfolder = part before first hyphen if it contains one, else "root"
    const hyphen = className.indexOf("-");
    const subfolder = hyphen > 0 ? className.substring(0, hyphen) : "root";
    sprites.push({ className, subfolder, x, y, used: false });
  }

  return { png, width, height, sprites };
}

// Collect all string literals from TS source files
function collectUsedSprites() {
  const used = new Set();
  const files = getAllFiles(SRC_DIR, ".ts");

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    // Match sprite: "value" or sprite: 'value'
    const re = /sprite:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) used.add(m[1]);

    // Match string literals that look like sprite class names (hyphenated, lowercase)
    const strRe = /['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)['"]/g;
    while ((m = strRe.exec(src)) !== null) used.add(m[1]);
  }

  return used;
}

function getAllFiles(dir, ext) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(getAllFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

// Build manifest
const used = collectUsedSprites();
const manifest = {};
let totalSprites = 0,
  usedCount = 0;

for (const sheet of SHEETS) {
  const data = parseCss(sheet);
  for (const s of data.sprites) {
    if (used.has(s.className)) {
      s.used = true;
      usedCount++;
    }
  }
  totalSprites += data.sprites.length;
  manifest[sheet] = data;
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${OUT}`);
console.log(`${totalSprites} sprites total, ${usedCount} used in game code`);
