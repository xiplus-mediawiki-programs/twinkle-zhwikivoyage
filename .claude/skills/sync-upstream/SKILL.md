---
name: sync-upstream
description: 檢查上游 Twinkle（xiplus-mediawiki-programs/twinkle）的新 commit，排除 zhwiki 專用的本地化修改（快速刪除理由、文字修正、zhwiki 模板等），再逐筆 cherry-pick 到本專案 twinkle-zhwikivoyage。當使用者提到同步上游、更新 upstream、拉上游修正、檢查上游有什麼新東西、cherry-pick 上游 commit，或想讓本專案跟上中文維基 Twinkle 時，都要使用這個 skill，即使沒有明說「cherry-pick」。
---

# 同步上游 Twinkle

本專案是 zhwiki Twinkle（上游）的 fork，本地化給中文維基導遊（zhwikivoyage）使用。兩邊在 2015 年就分歧了，整個 merge 不可行，所以只挑對本站有用的 commit 逐筆 cherry-pick。

上游有很多 commit 只對 zhwiki 有意義，例如快速刪除準則的文字、zhwiki 方針頁連結、zhwiki 才有的模板。帶進來只會覆蓋本地化內容，所以要排除。我們要的是**與站點無關的程式邏輯**：bug 修正、MediaWiki 或皮膚相容性、API 變更、臨時帳號支援等。

## 紀錄檔

[upstream-sync.log](upstream-sync.log) 記錄每一個審查過的上游 commit，格式為 tab 分隔：`hash	status	subject	note`。**最後一行的 hash 就是下次審查的起點**，所以每處理完一筆（包括略過的）都要立刻追加一行。這樣中途停下來，下次也能從正確的位置繼續。

status 取值：
- `baseline`：同步基準點
- `picked`：已 cherry-pick；note 寫本地的新 commit hash
- `skipped`：略過；note 寫理由，例如「zhwiki CSD 文字」「只動到本地沒有的模組」
- `empty`：cherry-pick 後沒有實際變更，例如本地早已有同樣的修正
- `diverged`：本地程式碼分歧太大，無法套用；note 寫明原因，留給使用者手動處理

## 流程

### 1. 抓取並列出新 commit

```bash
git remote get-url upstream || git remote add upstream https://github.com/xiplus-mediawiki-programs/twinkle.git
git fetch upstream
bash .claude/skills/sync-upstream/scripts/list-new-commits.sh
```

腳本從紀錄檔最後一個 hash 開始，按時間由舊到新列出 `upstream/master` 的非 merge commit。每行包含 hash、日期、標題、**本地存在的檔案**、**本地不存在的檔案**。

開始前先確認工作目錄是乾淨的（`git status`），否則 cherry-pick 會和未提交的改動混在一起。

### 2. 分類

逐一判斷每個 commit。只看標題不夠，有疑慮時用 `git show <hash> -- <本地檔案>` 看實際 diff。

**自動略過（skipped）**
- 本地存在的檔案欄位為空，也就是只動到本地沒有的模組（arv、block、warn、batchdelete、batchundelete、stub、shared、close、image、protect）或上游專用的工具（`scripts/get_templates.py`、`i18n.py`、`DEVELOPER.md` 等）。
- zhwiki 專用內容：
  - 快速刪除準則的理由或文字更新，例如 "update csd reasons"、"speedy: update G21 rationale"、新增或移除某條 CSD 準則。本站有自己的刪除方針。
  - zhwiki 方針頁、`WP:` 捷徑、zhwiki 模板清單（tag、welcome、warn 的模板增刪）。
  - 單純的文字修正、用詞或標點調整，例如半形、全形冒號，"ip user" 改成 "anonymous user"。本站的介面文字是另外本地化的，這類改動通常只會引起衝突。
- 上游的 CI、dependabot、`package.json` 或 `package-lock.json` 依賴升級：本地有自己的設定，略過即可。如果升級關係到 ESLint 規則，而後續 commit 需要它，再另外提出來。

**要 cherry-pick（picked）**
- bug 修正（undefined variable、錯誤處理、邏輯錯誤）
- `morebits.js` 和 `twinkle.js` 的核心功能修正或改進
- MediaWiki、皮膚相容性（vector-2022、DiscussionTools、Special 頁面名稱變更）
- API 變更、移除過時功能（例如 Flow 支援）
- 臨時帳號、legacy IP 等全站通用的使用者模型變更
- 本地仍在使用的模組（fluff、diff、unlink、tag、talkback、welcome、speedy、copyvio、xfd、config）裡與站點無關的邏輯修正

**拿不準時**：同一個 commit 同時含通用邏輯和 zhwiki 文字，或看不出是否通用，就標記為「待確認」，交給使用者決定，不要自己猜。

### 3. 先給使用者看計畫

開始 cherry-pick 前，先把分類結果整理成表格給使用者確認：

| hash | 日期 | 標題 | 決定 | 理由 |
|---|---|---|---|---|

「自動略過、只動到本地沒有的模組」這一類可以摺疊成一行計數，例如「另有 75 筆只動到本地沒有的模組，略過」，不用逐列。重點放在 pick、zhwiki 專用略過、待確認這三類。

等使用者確認或調整後，才開始下一步。

### 4. 逐筆 cherry-pick

按時間由舊到新，一次一筆：

```bash
git cherry-pick -x <hash>
```

`-x` 會在 commit 訊息裡留下 `(cherry picked from commit ...)`，日後可以追溯來源。

**commit 動到本地沒有的檔案時**，git 會報 "deleted by us" 衝突。這些檔案本地刻意不要，用 `git rm <file>` 移除後繼續。

**有內容衝突時**，解衝突的原則是：**保留本地化，套用邏輯**。
- 本地的連結、方針頁、捷徑（`WV:`、`Wikivoyage:...`、`w:WP:TW/DOC`）、站點模板、本地化後的 `wgULS(...)` 文字，都保持本地版本。
- 上游的程式邏輯改動要套進來，例如函式呼叫、條件判斷、API 參數。
- 如果改動依賴的上游結構在本地根本不存在（例如 speedy 的 mode 常數在本地已經不同），而且無法用小改動對應，就 `git cherry-pick --abort`，在紀錄檔記為 `diverged` 並寫明原因，然後繼續下一筆。不要為了套進來而大幅改寫本地程式碼。

**cherry-pick 結果是空的時**（本地已有同樣改動），用 `git cherry-pick --skip`，記為 `empty`。

解完衝突、`git add` 之後執行 `git cherry-pick --continue`。

**每筆完成後**：
1. 對改到的 JS 檔做語法檢查。本地通常沒有安裝 `node_modules`，所以用 Node 解析：
   ```bash
   node -e "for (const f of process.argv.slice(1)) new Function(require('fs').readFileSync(f,'utf8'))" <檔案...>
   ```
   如果專案已經 `npm install`，改跑 `npx eslint <檔案>`，這樣會用本地版本的 ESLint 和 `.eslintrc.json`。
2. 在 [upstream-sync.log](upstream-sync.log) 追加一行，`picked` 要附上本地新 commit 的短 hash。
3. 繼續下一筆。

被略過的 commit 在輪到它的位置也要寫進紀錄檔，保持紀錄檔按上游順序排列，「最後一行就是起點」才會成立。

### 5. 收尾

全部處理完後：
- 把紀錄檔的更新單獨 commit，例如 `sync-upstream: reviewed up to <最後的 hash>`。
- 向使用者回報：picked、skipped、empty、diverged 各有幾筆，列出每筆 diverged 和待確認項目，並提醒還沒 push。

不要自動 push，也不要部署到 wiki（`make deploy`）。這兩個動作都由使用者決定。
