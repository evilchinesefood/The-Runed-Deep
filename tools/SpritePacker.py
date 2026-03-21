#!/usr/bin/env python3
"""
Reads a mapping JSON { cssClass: dcssPath } and produces:
  - A packed sprite atlas PNG (tiles arranged in a grid, 32x32 each)
  - A CSS file mapping each class to its position in the atlas
"""
import json, sys, os, math
from PIL import Image

def pack(mapping_file, atlas_out, css_out, png_ref_path, base_class):
    with open(mapping_file) as f:
        mapping = json.load(f)

    # Filter out comment keys
    classes = [k for k in mapping.keys() if not k.startswith('_')]
    count = len(classes)
    cols = min(14, count)
    rows = math.ceil(count / cols)

    atlas = Image.new('RGBA', (cols * 32, rows * 32), (0, 0, 0, 0))
    css_lines = [f'.{base_class} {{\n    height: 32px;\n    width: 32px;\n    display: inline-block;\n}}']

    base_dir = 'dcss-tiles/releases/Nov-2015'
    packed = 0

    for i, cls in enumerate(classes):
        src_path = os.path.join(base_dir, mapping[cls])
        col = i % cols
        row = i // cols
        x = col * 32
        y = row * 32

        if os.path.exists(src_path):
            img = Image.open(src_path).convert('RGBA')
            # Resize to 32x32 if needed (NEAREST preserves pixel art)
            if img.size != (32, 32):
                img = img.resize((32, 32), Image.NEAREST)
            atlas.paste(img, (x, y))
            packed += 1
        else:
            print(f'WARNING: missing {src_path} for .{cls}')

        css_lines.append(f'.{cls} {{\n    background: url(\'{png_ref_path}\') -{x}px -{y}px;\n}}')

    atlas.save(atlas_out, optimize=True)
    with open(css_out, 'w') as f:
        f.write('\n'.join(css_lines) + '\n')

    print(f'Packed {packed}/{count} sprites into {atlas_out} ({cols}x{rows} = {cols*32}x{rows*32}px)')

if __name__ == '__main__':
    if len(sys.argv) != 6:
        print('Usage: SpritePacker.py <mapping.json> <atlas.png> <output.css> <css-url-path> <base-class>')
        sys.exit(1)
    pack(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
