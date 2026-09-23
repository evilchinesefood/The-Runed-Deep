#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 022
extra=(--dry-run)
if [[ "${1:-}" == "--live" ]]; then extra=(); elif [[ "${1:-}" != "" ]]; then echo "Usage: $0 [--live]" >&2; exit 2; fi
npm run test:security
npm run build
# Preserve runtime data, private authorization hashes, and old hashed assets for open tabs.
rsync -rlptz --delay-updates --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  --exclude='/api/saves/' --exclude='/api/ratelimit/' --exclude='*.map' \
  "${extra[@]}" -e 'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15' \
  dist/ johnayers@johndayers.com:/home/johnayers/dev.jdayers.com/rd/
