#!/usr/bin/env bash
# List upstream commits that have not been reviewed yet, oldest first.
# The starting point is the hash on the last entry of upstream-sync.log.
#
# Output (TSV): hash  date  subject  local-files  missing-files
#   local-files   = files touched by the commit that exist in HEAD
#   missing-files = files touched by the commit that do not exist locally
#                   (modules we never had or have removed)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$SKILL_DIR/upstream-sync.log"
REF="${1:-upstream/master}"

last=$(grep -v '^#' "$LOG" | grep -v '^[[:space:]]*$' | tail -n 1 | cut -f1)
if [ -z "$last" ]; then
	echo "upstream-sync.log has no entries" >&2
	exit 1
fi

for h in $(git rev-list --reverse --no-merges "$last..$REF"); do
	local_files=()
	missing_files=()
	while IFS= read -r f; do
		[ -z "$f" ] && continue
		if git cat-file -e "HEAD:$f" 2>/dev/null; then
			local_files+=("$f")
		else
			missing_files+=("$f")
		fi
	done < <(git diff-tree --no-commit-id --name-only -r "$h")
	printf '%s\t%s\t%s\t%s\t%s\n' \
		"$(git rev-parse --short "$h")" \
		"$(git log -1 --format=%ad --date=short "$h")" \
		"$(git log -1 --format=%s "$h")" \
		"$(IFS=,; echo "${local_files[*]-}")" \
		"$(IFS=,; echo "${missing_files[*]-}")"
done
