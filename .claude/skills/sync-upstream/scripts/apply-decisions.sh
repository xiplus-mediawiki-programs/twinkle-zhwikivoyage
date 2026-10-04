#!/usr/bin/env bash
# Walk the unreviewed upstream commits in order and apply a decision table,
# appending each result to upstream-sync.log. Stops at the first conflict
# that needs a human (or Claude) to resolve; run it again afterwards.
#
# Usage: apply-decisions.sh <decisions.tsv>
#   decisions.tsv: <short hash>\t<pick|skipped|pending|diverged|empty>\t<note>
#   Commits missing from the table are skipped automatically when they only
#   touch files that do not exist locally; otherwise the script stops.
#
# After resolving a stop by hand, append that commit's log line yourself
# (picked / diverged / empty) before running the script again.
set -uo pipefail

DEC="${1:?usage: apply-decisions.sh <decisions.tsv>}"
DEC="$(cd "$(dirname "$DEC")" && pwd)/$(basename "$DEC")"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$SKILL_DIR/upstream-sync.log"
cd "$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"

US=$'\037'
log() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$LOG"; }
syntax() {
	local files
	files=$(git diff-tree --no-commit-id --name-only -r HEAD | grep -E '\.js$' | while read -r f; do [ -f "$f" ] && echo "$f"; done)
	[ -z "$files" ] && return 0
	node -e "for (const f of process.argv.slice(1)) { try { new Function(require('fs').readFileSync(f,'utf8')) } catch (e) { console.error(f+': '+e.message); process.exitCode=1 } }" $files
}

# Tabs are whitespace for `read`, so empty fields would collapse; use \037.
bash "$SKILL_DIR/scripts/list-new-commits.sh" | tr '\t' "$US" | while IFS="$US" read -r h d s lf mf; do
	dec=$(awk -F'\t' -v h="$h" '$1==h{print $2"\t"$3}' "$DEC" | tr -d '\r')
	st=${dec%%$'\t'*}; note=${dec#*$'\t'}
	if [ -z "$dec" ]; then
		[ -n "$lf" ] && { echo "STOP: no decision for $h $s"; exit 1; }
		log "$h" skipped "$s" "只動到本地沒有的檔案"; continue
	fi
	if [ "$st" != pick ]; then log "$h" "$st" "$s" "$note"; echo "$st  $h $s"; continue; fi

	if git cherry-pick -x "$h" >/dev/null 2>/tmp/sync-upstream-err.txt; then
		syntax || { echo "STOP: syntax error after $h"; exit 1; }
		log "$h" picked "$s" "$(git rev-parse --short HEAD)"; echo "picked $h $s"; continue
	fi
	if grep -q "empty" /tmp/sync-upstream-err.txt && [ -z "$(git diff --name-only --diff-filter=U)" ]; then
		git cherry-pick --skip; log "$h" empty "$s" "本地已有相同改動"; echo "empty  $h $s"; continue
	fi
	# "deleted by us": files we intentionally do not have
	for f in $(git status --porcelain | awk '$1=="DU"{print $2}'); do git rm -q "$f"; done
	if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
		echo "STOP: conflict in $h $s"; git diff --name-only --diff-filter=U; exit 1
	fi
	if git diff --cached --quiet; then
		git cherry-pick --skip; log "$h" empty "$s" "只剩本地沒有的檔案"; echo "empty  $h $s"; continue
	fi
	GIT_EDITOR=true git cherry-pick --continue >/dev/null
	syntax || { echo "STOP: syntax error after $h"; exit 1; }
	log "$h" picked "$s" "$(git rev-parse --short HEAD)"; echo "picked $h $s"
done
