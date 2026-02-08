#!/usr/bin/env bash
set -euo pipefail

schema_dir="apps/api/prisma/schema"
out_file="apps/api/prisma/schema.prisma"

find "$schema_dir" -maxdepth 1 -type f -name '*.prisma' | sort | while read -r file; do
  cat "$file"
  echo
  echo
 done > "$out_file"
