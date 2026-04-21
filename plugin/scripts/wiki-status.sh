#!/usr/bin/env bash
# paper-notes plugin — SessionStart hook
# Walks up from cwd; if a paper-notes wiki root is found and there are
# uncompiled Raw ingests, inject a reminder into session context.
# MUST always exit 0 (non-zero would block session startup).

set +e

# Walk up to find wiki root (contains schema.md + Raw/ + Wiki/)
find_wiki_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/schema.md" ] && [ -d "$dir/Raw" ] && [ -d "$dir/Wiki" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

root="$(find_wiki_root)"
if [ -z "$root" ]; then
  # Not in a wiki; silent
  exit 0
fi

log="$root/log.md"
if [ ! -f "$log" ]; then
  exit 0
fi

# Find last compile line number and last ingest line number in log.md
# log.md is newest-first (append at top), so first occurrence wins.
last_ingest_line=$(grep -n "^## \[.*\] ingest" "$log" 2>/dev/null | head -1 | cut -d: -f1)
last_compile_line=$(grep -n "^## \[.*\] compile" "$log" 2>/dev/null | head -1 | cut -d: -f1)

# If no ingest entries at all, nothing to remind about
if [ -z "$last_ingest_line" ]; then
  exit 0
fi

# If there's an ingest newer than last compile, warn
# (smaller line number = newer, since log is append-at-top)
need_compile=0
if [ -z "$last_compile_line" ]; then
  need_compile=1
elif [ "$last_ingest_line" -lt "$last_compile_line" ]; then
  need_compile=1
fi

if [ "$need_compile" -eq 1 ]; then
  # Count uncompiled ingests
  if [ -z "$last_compile_line" ]; then
    n=$(grep -c "^## \[.*\] ingest" "$log" 2>/dev/null)
  else
    n=$(head -n "$((last_compile_line - 1))" "$log" | grep -c "^## \[.*\] ingest")
  fi

  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "📚 paper-notes wiki detected at $root — there are $n uncompiled Raw ingest(s) since the last compile. Tell Claude \"compile\" when ready to integrate into Wiki."
  }
}
EOF
fi

exit 0
