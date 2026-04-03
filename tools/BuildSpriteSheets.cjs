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

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TILE_SIZE = 32;
const COLS = 32; // tiles per row (1024px wide sheets)
const SRC_DIR = path.join(__dirname, '..', 'dcss-tiles');
const OUT_DIR = path.join(__dirname, '..', 'public');
const CSS_DIR = path.join(OUT_DIR, 'css', 'sprites');

// Categories to process: folder name → output file base name
const CATEGORIES = {
  monsters: 'monsters',
  item: 'items',
  dungeon: 'tiles',
  effect: 'effects',
  player: 'player',
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
      } else if (entry.endsWith('.png')) {
        const name = entry.replace('.png', '');
        // Use top-level subfolder only for prefix
        const topSub = subfolder ? subfolder.split('/')[0] : 'root';
        const className = topSub === 'root' ? name : `${topSub}-${name}`;
        sprites.push({
          file: fp,
          name,
          subfolder: subfolder || 'root',
          topSubfolder: topSub,
          className,
        });
      }
    }
  }

  walk(catDir, '');
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
      .resize(TILE_SIZE, TILE_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
    if (a.topSubfolder !== b.topSubfolder) return a.topSubfolder.localeCompare(b.topSubfolder);
    return a.name.localeCompare(b.name);
  });

  // Check for duplicate class names and resolve
  const seen = new Map();
  for (const s of sprites) {
    if (seen.has(s.className)) {
      // Append subfolder path to disambiguate
      const existing = seen.get(s.className);
      if (!existing.renamed) {
        const subParts = existing.subfolder.split('/');
        existing.className = subParts.join('-') + '-' + existing.name;
        existing.renamed = true;
      }
      const subParts = s.subfolder.split('/');
      s.className = subParts.join('-') + '-' + s.name;
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
    const results = await Promise.all(batch.map(s => processSprite(s.file)));
    for (let j = 0; j < results.length; j++) {
      buffers[i + j] = results[j];
    }
    process.stdout.write(`  Processed ${Math.min(i + BATCH, sprites.length)}/${sprites.length}\r`);
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

  const pngPath = path.join(OUT_DIR, 'assets', `${outputName}.png`);
  await sheet.toFile(pngPath);
  const stat = fs.statSync(pngPath);
  console.log(`  Wrote ${pngPath} (${(stat.size / 1024).toFixed(0)} KB)`);

  // Generate CSS
  const cssLines = [];
  const assetRef = `../../assets/${outputName}.png`;

  // Base class for this category
  const baseClass = outputName === 'tiles' ? 'tile' : outputName.replace(/s$/, '');
  cssLines.push(`.${baseClass} {`);
  cssLines.push(`    display: inline-block;`);
  cssLines.push(`    width: ${TILE_SIZE}px;`);
  cssLines.push(`    height: ${TILE_SIZE}px;`);
  cssLines.push(`    background: url('${assetRef}') no-repeat;`);
  cssLines.push(`    background-size: ${sheetW}px ${sheetH}px;`);
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
    cssLines.push(`    background: url('${assetRef}') -${x}px -${y}px;`);
    cssLines.push(`    background-size: ${sheetW}px ${sheetH}px;`);
    cssLines.push(`}`);
  }

  // Build file path → sprite index lookup for legacy mapping
  const fileToIdx = new Map();
  for (let i = 0; i < sprites.length; i++) {
    // Map by relative path from dcss-tiles category dir
    const rel = path.relative(path.join(SRC_DIR, category), sprites[i].file).replace(/\\/g, '/');
    fileToIdx.set(rel, i);
    // Also map by just filename for fuzzy matching
    fileToIdx.set(sprites[i].name, i);
  }

  // Load legacy mappings and create aliases
  const LEGACY_MAP_FILES = {
    monsters: ['MappingMonsters.json'],
    item: ['MappingItems.json'],
    dungeon: ['MappingTiles.json'],
  };
  const mapFiles = LEGACY_MAP_FILES[category] || [];
  let legacyCount = 0;
  const legacyAliases = new Set();

  for (const mf of mapFiles) {
    const mfPath = path.join(__dirname, mf);
    if (!fs.existsSync(mfPath)) continue;
    const mapping = JSON.parse(fs.readFileSync(mfPath, 'utf8'));

    cssLines.push(`/* --- Legacy aliases --- */`);
    for (const [legacyCls, dcssPath] of Object.entries(mapping)) {
      if (legacyCls.startsWith('_')) continue;
      if (legacyAliases.has(legacyCls)) continue;

      // Try to find the DCSS file in our sprite list
      // dcssPath is like "mon/animals/quokka.png" — remap to new folder structure
      let searchPath = dcssPath
        .replace(/^mon\//, '')
        .replace(/^player\//, '../player/')
        .replace(/^item\//, '')
        .replace(/^dngn\//, '');

      // Try exact match first
      let idx = fileToIdx.get(searchPath.replace('.png', ''));

      // Try just the filename without subfolder
      if (idx === undefined) {
        const fname = path.basename(dcssPath, '.png');
        idx = fileToIdx.get(fname);
      }

      // Try with underscores replaced by hyphens and vice versa
      if (idx === undefined) {
        const fname = path.basename(dcssPath, '.png');
        idx = fileToIdx.get(fname.replace(/-/g, '_'));
      }
      if (idx === undefined) {
        const fname = path.basename(dcssPath, '.png');
        idx = fileToIdx.get(fname.replace(/_/g, '-'));
      }

      if (idx !== undefined) {
        const x = (idx % COLS) * TILE_SIZE;
        const y = Math.floor(idx / COLS) * TILE_SIZE;
        cssLines.push(`.${legacyCls} {`);
        cssLines.push(`    background: url('${assetRef}') -${x}px -${y}px;`);
        cssLines.push(`    background-size: ${sheetW}px ${sheetH}px;`);
        cssLines.push(`}`);
        legacyCount++;
        legacyAliases.add(legacyCls);
      }
    }
  }
  if (legacyCount > 0) {
    console.log(`  Added ${legacyCount} legacy aliases`);
  }

  const cssPath = path.join(CSS_DIR, `${outputName}.css`);
  fs.writeFileSync(cssPath, cssLines.join('\n') + '\n');
  console.log(`  Wrote ${cssPath} (${sprites.length} sprites + ${legacyCount} aliases)`);

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
  const cssFiles = ['monsters.css', 'items.css', 'tiles.css'];
  for (const cf of cssFiles) {
    const fp = path.join(CSS_DIR, cf);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
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
  const reportPath = path.join(__dirname, 'SpriteMapping.json');
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
  const manifestPath = path.join(OUT_DIR, 'sprites-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  console.log(`  Wrote sprite manifest to ${manifestPath}`);
}

async function main() {
  console.log('BuildSpriteSheets — DCSS Tile Stitcher');
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Output: ${OUT_DIR}`);

  const sheets = [];
  for (const [cat, outName] of Object.entries(CATEGORIES)) {
    const result = await buildSheet(cat, outName);
    sheets.push(result);
  }

  await buildMappingReport(sheets.filter(Boolean));

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
