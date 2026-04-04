#!/usr/bin/env node
// ============================================================
// BuildSpriteSheets.js — Stitch DCSS tiles into sprite sheets
//
// Reads individual PNGs from dcss-tiles/, groups by category,
// stitches into grid sheets, generates CSS with background-position.
// Non-32x32 sprites are resized/padded to 32x32.
//
// Usage: node tools/BuildSpriteSheets.js
// ============================================================

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const TILE_SIZE = 32;
const COLS = 32; // tiles per row (1024px wide sheets)
const SRC_DIR = path.join(__dirname, "..", "dcss-tiles");
const OUT_DIR = path.join(__dirname, "..", "public");
const CSS_DIR = path.join(OUT_DIR, "css", "sprites");

// Categories to process: folder name → output file base name
const CATEGORIES = {
  monsters: "monsters",
  item: "items",
  dungeon: "tiles",
  effect: "effects",
  player: "player",
};

// Current sprite class names that must map 1-1 to new sheets
// We'll generate a mapping report at the end

async function getSprites(catDir) {
  const sprites = [];

  function walk(dir, subfolder) {
    for (const entry of fs.readdirSync(dir)) {
      const fp = path.join(dir, entry);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        walk(fp, subfolder ? `${subfolder}/${entry}` : entry);
      } else if (entry.endsWith(".png")) {
        const name = entry.replace(".png", "");
        // Use top-level subfolder only for prefix
        const topSub = subfolder ? subfolder.split("/")[0] : "root";
        const className = topSub === "root" ? name : `${topSub}-${name}`;
        sprites.push({
          file: fp,
          name,
          subfolder: subfolder || "root",
          topSubfolder: topSub,
          className,
        });
      }
    }
  }

  walk(catDir, "");
  return sprites;
}

async function processSprite(file) {
  const img = sharp(file);
  const meta = await img.metadata();

  if (meta.width === TILE_SIZE && meta.height === TILE_SIZE) {
    return img.toBuffer();
  }

  // Resize to fit 32x32, preserving aspect ratio, then pad
  if (meta.width > TILE_SIZE || meta.height > TILE_SIZE) {
    // Scale down to fit
    return img
      .resize(TILE_SIZE, TILE_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();
  }

  // Smaller than 32x32 — center on transparent 32x32
  const left = Math.floor((TILE_SIZE - meta.width) / 2);
  const top = Math.floor((TILE_SIZE - meta.height) / 2);
  return img
    .extend({
      top,
      bottom: TILE_SIZE - meta.height - top,
      left,
      right: TILE_SIZE - meta.width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
}

async function buildSheet(category, outputName) {
  const catDir = path.join(SRC_DIR, category);
  if (!fs.existsSync(catDir)) {
    console.log(`  Skipping ${category} — directory not found`);
    return null;
  }

  console.log(`\n=== Building ${outputName} from ${category}/ ===`);
  const sprites = await getSprites(catDir);
  console.log(`  Found ${sprites.length} sprites`);

  if (sprites.length === 0) return null;

  // Sort: group by topSubfolder, then alphabetical within
  sprites.sort((a, b) => {
    if (a.topSubfolder !== b.topSubfolder)
      return a.topSubfolder.localeCompare(b.topSubfolder);
    return a.name.localeCompare(b.name);
  });

  // Check for duplicate class names and resolve
  const seen = new Map();
  for (const s of sprites) {
    if (seen.has(s.className)) {
      // Append subfolder path to disambiguate
      const existing = seen.get(s.className);
      if (!existing.renamed) {
        const subParts = existing.subfolder.split("/");
        existing.className = subParts.join("-") + "-" + existing.name;
        existing.renamed = true;
      }
      const subParts = s.subfolder.split("/");
      s.className = subParts.join("-") + "-" + s.name;
      s.renamed = true;
    }
    seen.set(s.className, s);
  }

  // Re-check for remaining duplicates (add numeric suffix)
  const finalNames = new Map();
  for (const s of sprites) {
    let cn = s.className;
    let i = 2;
    while (finalNames.has(cn)) {
      cn = `${s.className}-${i}`;
      i++;
    }
    s.className = cn;
    finalNames.set(cn, s);
  }

  const rows = Math.ceil(sprites.length / COLS);
  const sheetW = COLS * TILE_SIZE;
  const sheetH = rows * TILE_SIZE;

  console.log(`  Sheet: ${sheetW}x${sheetH} (${COLS} cols, ${rows} rows)`);

  // Process all sprites in parallel (batched to avoid memory issues)
  const BATCH = 100;
  const buffers = new Array(sprites.length);
  for (let i = 0; i < sprites.length; i += BATCH) {
    const batch = sprites.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((s) => processSprite(s.file)));
    for (let j = 0; j < results.length; j++) {
      buffers[i + j] = results[j];
    }
    process.stdout.write(
      `  Processed ${Math.min(i + BATCH, sprites.length)}/${sprites.length}\r`,
    );
  }
  console.log();

  // Composite onto sheet
  const composites = buffers.map((buf, idx) => ({
    input: buf,
    left: (idx % COLS) * TILE_SIZE,
    top: Math.floor(idx / COLS) * TILE_SIZE,
  }));

  const sheet = sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 });

  const pngPath = path.join(OUT_DIR, "assets", `${outputName}.png`);
  await sheet.toFile(pngPath);
  const stat = fs.statSync(pngPath);
  console.log(`  Wrote ${pngPath} (${(stat.size / 1024).toFixed(0)} KB)`);

  // Generate CSS
  const cssLines = [];
  const assetRef = `../../assets/${outputName}.png`;

  // Base class for this category
  const baseClass =
    outputName === "tiles" ? "tile" : outputName.replace(/s$/, "");
  cssLines.push(`.${baseClass} {`);
  cssLines.push(`    display: inline-block;`);
  cssLines.push(`    width: ${TILE_SIZE}px;`);
  cssLines.push(`    height: ${TILE_SIZE}px;`);
  cssLines.push(`    background-image: url('${assetRef}');`);
  cssLines.push(`    background-size: ${sheetW}px ${sheetH}px;`);
  cssLines.push(`    background-repeat: no-repeat;`);
  cssLines.push(`}`);

  let currentSubfolder = null;
  for (let i = 0; i < sprites.length; i++) {
    const s = sprites[i];
    const x = (i % COLS) * TILE_SIZE;
    const y = Math.floor(i / COLS) * TILE_SIZE;

    if (s.topSubfolder !== currentSubfolder) {
      currentSubfolder = s.topSubfolder;
      cssLines.push(`/* --- ${currentSubfolder} --- */`);
    }

    cssLines.push(`.${s.className} {`);
    cssLines.push(`    background-image: url('${assetRef}');`);
    cssLines.push(`    background-position: -${x}px -${y}px;`);
    cssLines.push(`}`);
  }

  // Append legacy sprites from old game sheets
  // For matched sprites: alias to existing DCSS position (no pixel duplication)
  // For unresolved sprites: extract pixels from legacy PNG and append
  const LEGACY_SHEETS = {
    monsters: {
      png: "monsters-legacy.png",
      css: "monsters-legacy.css",
      mapping: "MappingMonsters.json",
      prefix: "mon/",
    },
    item: {
      png: "items-legacy.png",
      css: "items-legacy.css",
      mapping: "MappingItems.json",
      prefix: "item/",
    },
    dungeon: {
      png: "tiles-legacy.png",
      css: "tiles-legacy.css",
      mapping: "MappingTiles.json",
      prefix: "dngn/",
    },
  };
  const legacyInfo = LEGACY_SHEETS[category];
  let legacyCount = 0; // unresolved pixel-appended count
  let aliasCount = 0; // matched alias count

  if (legacyInfo) {
    const oldCssPath = path.join(CSS_DIR, legacyInfo.css);
    if (fs.existsSync(oldCssPath)) {
      const oldCss = fs.readFileSync(oldCssPath, "utf8");
      const entries = [
        ...oldCss.matchAll(
          /^\.([a-zA-Z0-9_-]+)\s*\{[^}]*background:\s*url\([^)]+\)\s*(-?\d+)px\s*(-?\d+)px/gm,
        ),
      ];

      // Load mapping JSON to resolve legacy → DCSS class
      const mappingPath = path.join(__dirname, legacyInfo.mapping);
      let mapping = {};
      if (fs.existsSync(mappingPath)) {
        mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
      }

      // Build lookup: new className → { x, y } from sprites array
      const newClassPos = new Map();
      for (let i = 0; i < sprites.length; i++) {
        const x = (i % COLS) * TILE_SIZE;
        const y = Math.floor(i / COLS) * TILE_SIZE;
        newClassPos.set(sprites[i].className, { x, y });
      }

      // Build filename-based lookup for fuzzy matching
      const nameToClass = new Map();
      for (const s of sprites) {
        // Index by raw name (without subfolder prefix)
        if (!nameToClass.has(s.name)) nameToClass.set(s.name, s.className);
        // Also index with underscores→hyphens
        const hyphenName = s.name.replace(/_/g, '-');
        if (!nameToClass.has(hyphenName)) nameToClass.set(hyphenName, s.className);
      }

      // Try multiple strategies to find a match
      function findMatch(dcssPath) {
        if (!dcssPath) return null;
        const fname = path.basename(dcssPath, '.png');

        // Strategy 1: direct subfolder-name class
        const parts = dcssPath.replace(/^(mon|player|item|dngn)\//, '').replace('.png', '').split('/');
        const topSub = parts[0];
        const name = parts[parts.length - 1];
        const direct = topSub + '-' + name;
        if (newClassPos.has(direct)) return direct;

        // Strategy 2: search by filename in all subfolders
        if (nameToClass.has(fname) && newClassPos.has(nameToClass.get(fname))) return nameToClass.get(fname);

        // Strategy 3: try with hyphens
        const hyphen = fname.replace(/_/g, '-');
        if (nameToClass.has(hyphen) && newClassPos.has(nameToClass.get(hyphen))) return nameToClass.get(hyphen);

        // Strategy 4: check if legacy class name itself exists as a new class
        return null;
      }

      if (entries.length > 0) {
        const oldPngPath = path.join(OUT_DIR, "assets", legacyInfo.png);
        const hasPng = fs.existsSync(oldPngPath);

        // Separate matched (alias) vs unresolved (pixel append)
        const matched = [];
        const unresolved = [];

        for (const entry of entries) {
          const cls = entry[1];
          const dcssPath = mapping[cls];

          // Also check if the legacy class itself exists as a new DCSS class
          if (newClassPos.has(cls)) {
            matched.push({ cls, newCls: cls, pos: newClassPos.get(cls) });
            continue;
          }

          const newCls = findMatch(dcssPath);
          if (newCls) {
            matched.push({ cls, newCls, pos: newClassPos.get(newCls) });
            continue;
          }

          // Unresolved: cross-category, missing from new sheet, or no mapping
          unresolved.push({
            cls,
            ox: Math.abs(parseInt(entry[2])),
            oy: Math.abs(parseInt(entry[3])),
          });
        }

        // Emit aliases for matched sprites
        if (matched.length > 0) {
          cssLines.push(`/* --- Legacy game sprites (aliases) --- */`);
          for (const m of matched) {
            cssLines.push(`.${m.cls} {`);
            cssLines.push(
              `    background-image: url('${assetRef}');`,
            );
            cssLines.push(
              `    background-position: -${m.pos.x}px -${m.pos.y}px;`,
            );
            cssLines.push(`}`);
            aliasCount++;
          }
        }

        // Emit pixel-appended entries for unresolved sprites
        if (unresolved.length > 0 && hasPng) {
          cssLines.push(
            `/* --- Legacy game sprites (unresolved, appended pixels) --- */`,
          );
          for (const u of unresolved) {
            const idx = sprites.length + legacyCount;
            const nx = (idx % COLS) * TILE_SIZE;
            const ny = Math.floor(idx / COLS) * TILE_SIZE;
            cssLines.push(`.${u.cls} {`);
            cssLines.push(
              `    background-image: url('${assetRef}');`,
            );
            cssLines.push(
              `    background-position: -${nx}px -${ny}px;`,
            );
            cssLines.push(`}`);
            legacyCount++;
          }
        }

        console.log(
          `  Legacy: ${aliasCount} aliases (deduped) + ${legacyCount} unresolved (pixel append)`,
        );
      }
    }
  }

  // If we have unresolved legacy sprites, rebuild the sheet with extra rows
  if (legacyCount > 0) {
    const totalSprites = sprites.length + legacyCount;
    const newRows = Math.ceil(totalSprites / COLS);
    const newSheetH = newRows * TILE_SIZE;

    // Re-parse unresolved entries to extract pixels
    const oldPngPath = path.join(OUT_DIR, "assets", legacyInfo.png);
    const oldCss = fs.readFileSync(path.join(CSS_DIR, legacyInfo.css), "utf8");
    const allEntries = [
      ...oldCss.matchAll(
        /^\.([a-zA-Z0-9_-]+)\s*\{[^}]*background:\s*url\([^)]+\)\s*(-?\d+)px\s*(-?\d+)px/gm,
      ),
    ];

    // Load mapping to filter to unresolved only
    const mappingPath = path.join(__dirname, legacyInfo.mapping);
    let mapping = {};
    if (fs.existsSync(mappingPath)) {
      mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
    }
    const newClassPos = new Map();
    for (let i = 0; i < sprites.length; i++) {
      newClassPos.set(sprites[i].className, true);
    }
    function dcssToNewClass2(dcssPath, prefix) {
      if (!dcssPath.startsWith(prefix)) return null;
      let p = dcssPath.slice(prefix.length).replace(".png", "");
      let parts = p.split("/");
      return parts[0] + "-" + parts[parts.length - 1];
    }

    const unresolvedEntries = allEntries.filter((e) => {
      const cls = e[1];
      const dcssPath = mapping[cls];
      if (dcssPath && dcssPath.startsWith(legacyInfo.prefix)) {
        const nc = dcssToNewClass2(dcssPath, legacyInfo.prefix);
        if (nc && newClassPos.has(nc)) return false; // matched, skip
      }
      return true;
    });

    const legacyComposites = [];
    for (let li = 0; li < unresolvedEntries.length; li++) {
      const ox = Math.abs(parseInt(unresolvedEntries[li][2]));
      const oy = Math.abs(parseInt(unresolvedEntries[li][3]));
      const tileBuf = await sharp(oldPngPath)
        .extract({ left: ox, top: oy, width: TILE_SIZE, height: TILE_SIZE })
        .toBuffer();
      const idx = sprites.length + li;
      legacyComposites.push({
        input: tileBuf,
        left: (idx % COLS) * TILE_SIZE,
        top: Math.floor(idx / COLS) * TILE_SIZE,
      });
    }

    // Rebuild sheet with unresolved legacy appended
    const allComposites = [...composites, ...legacyComposites];
    const newSheet = sharp({
      create: {
        width: sheetW,
        height: newSheetH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(allComposites)
      .png({ compressionLevel: 9 });

    await newSheet.toFile(pngPath);
    const newStat = fs.statSync(pngPath);
    console.log(
      `  Rewrote ${pngPath} with unresolved legacy (${(newStat.size / 1024).toFixed(0)} KB, ${newRows} rows)`,
    );

    // Update background-size in ALL CSS entries to new height
    for (let i = 0; i < cssLines.length; i++) {
      cssLines[i] = cssLines[i].replace(
        `background-size: ${sheetW}px ${sheetH}px;`,
        `background-size: ${sheetW}px ${newSheetH}px;`,
      );
    }
  }

  const cssPath = path.join(CSS_DIR, `${outputName}.css`);
  fs.writeFileSync(cssPath, cssLines.join("\n") + "\n");
  console.log(
    `  Wrote ${cssPath} (${sprites.length} DCSS + ${aliasCount} aliases + ${legacyCount} unresolved)`,
  );

  return {
    name: outputName,
    category,
    sprites: sprites.map((s, i) => ({
      className: s.className,
      name: s.name,
      subfolder: s.topSubfolder,
      x: (i % COLS) * TILE_SIZE,
      y: Math.floor(i / COLS) * TILE_SIZE,
    })),
  };
}

async function buildMappingReport(sheets) {
  // Read existing CSS files and extract class names
  const existingClasses = {};
  const cssFiles = ["monsters.css", "items.css", "tiles.css"];
  for (const cf of cssFiles) {
    const fp = path.join(CSS_DIR, cf);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, "utf8");
    const matches = content.matchAll(/^\.([a-zA-Z0-9_-]+)\s*\{/gm);
    for (const m of matches) {
      existingClasses[m[1]] = cf;
    }
  }

  // Build new class lookup
  const newClasses = new Set();
  for (const sheet of sheets) {
    if (!sheet) continue;
    for (const s of sheet.sprites) {
      newClasses.add(s.className);
    }
  }

  // Find matches and misses
  const matched = [];
  const missing = [];
  for (const [cls, source] of Object.entries(existingClasses)) {
    if (newClasses.has(cls)) {
      matched.push({ cls, source });
    } else {
      missing.push({ cls, source });
    }
  }

  console.log(`\n=== Mapping Report ===`);
  console.log(`  Existing classes: ${Object.keys(existingClasses).length}`);
  console.log(`  Matched in new sheets: ${matched.length}`);
  console.log(`  Missing (need manual mapping): ${missing.length}`);

  if (missing.length > 0) {
    console.log(`\n  Missing classes:`);
    for (const m of missing) {
      console.log(`    .${m.cls} (from ${m.source})`);
    }
  }

  // Write mapping JSON
  const report = { matched, missing, timestamp: new Date().toISOString() };
  const reportPath = path.join(__dirname, "SpriteMapping.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Wrote mapping report to ${reportPath}`);

  // Write manifest for the sprite browser tool
  const manifest = {};
  for (const sheet of sheets) {
    if (!sheet) continue;
    manifest[sheet.name] = {
      category: sheet.category,
      sprites: sheet.sprites,
    };
  }
  const manifestPath = path.join(OUT_DIR, "sprites-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  console.log(`  Wrote sprite manifest to ${manifestPath}`);
}

async function main() {
  console.log("BuildSpriteSheets — DCSS Tile Stitcher");
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Output: ${OUT_DIR}`);

  const sheets = [];
  for (const [cat, outName] of Object.entries(CATEGORIES)) {
    const result = await buildSheet(cat, outName);
    sheets.push(result);
  }

  await buildMappingReport(sheets.filter(Boolean));

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
