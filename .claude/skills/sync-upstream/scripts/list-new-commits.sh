#!/usr/bin/env bash
# List upstream commits that have not been reviewed yet, oldest first.
# Starts from the last `baseline` entry of upstream-sync.log and leaves out
# every commit already recorded in the log. Upstream history is not linear
# (merged branches), so "everything after the last line" is not enough:
# older commits from a merged branch can show up after newer ones.
#
# Output (TSV): hash  date  subject  local-files  missing-files
#   local-files   = files touched by the commit that exist in HEAD
#   missing-files = files touched by the commit that do not exist locally
#                   (modules we never had or have removed)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$SKILL_DIR/upstream-sync.log"
REF="${1:-upstream/master}"

base=$(awk -F'\t' '!/^#/ && $2=="baseline" {h=$1} END {print h}' "$LOG")
if [ -z "$base" ]; then
	echo "upstream-sync.log has no baseline entry" >&2
	exit 1
fi
reviewed=" $(awk -F'\t' '!/^#/ && NF {printf "%s ", substr($1, 1, 7)}' "$LOG")"

for h in $(git rev-list --reverse --no-merges "$base..$REF"); do
	short=$(git rev-parse --short=7 "$h")
	case "$reviewed" in *" ${short:0:7} "*) continue ;; esac
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
		"$short" \
		"$(git log -1 --format=%ad --date=short "$h")" \
		"$(git log -1 --format=%s "$h")" \
		"$(IFS=,; echo "${local_files[*]-}")" \
		"$(IFS=,; echo "${missing_files[*]-}")"
done
