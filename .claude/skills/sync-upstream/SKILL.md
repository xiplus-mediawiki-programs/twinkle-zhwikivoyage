---
name: sync-upstream
description: 檢查上游 Twinkle（xiplus-mediawiki-programs/twinkle）的新 commit，排除 zhwiki 專用的本地化修改（快速刪除理由、文字修正、zhwiki 模板等），再逐筆 cherry-pick 到本專案 twinkle-zhwikivoyage。當使用者提到同步上游、更新 upstream、拉上游修正、檢查上游有什麼新東西、cherry-pick 上游 commit，或想讓本專案跟上中文維基 Twinkle 時，都要使用這個 skill，即使沒有明說「cherry-pick」。
---

# 同步上游 Twinkle

本專案是 zhwiki Twinkle（上游）的 fork，本地化給中文維基導遊（zhwikivoyage）使用。兩邊在 2015 年就分歧了，整個 merge 不可行，所以只挑對本站有用的 commit 逐筆 cherry-pick。

上游有很多 commit 只對 zhwiki 有意義，例如快速刪除準則的文字、zhwiki 方針頁連結、zhwiki 才有的模板。帶進來只會覆蓋本地化內容，所以要排除。我們要的是**與站點無關的程式邏輯**：bug 修正、MediaWiki 或皮膚相容性、API 變更、臨時帳號和 legacy IP 支援等。

## 紀錄檔

[upstream-sync.log](upstream-sync.log) 記錄每一個審查過的上游 commit，格式為 tab 分隔：`hash	status	subject	note`。每處理完一筆（包括略過的）都要立刻追加一行，這樣中途停下來也能接著做。

status 取值：
- `baseline`：同步基準點。列表從最後一個 baseline 開始。
- `picked`：已套用；note 寫本地 commit 的短 hash，有手動調整時也註明。
- `skipped`：略過；note 寫理由。
- `empty`：沒有實際變更，例如本地已有同樣改動，或被後續上游 commit 抵銷。
- `diverged`：本地程式碼分歧太大，無法套用；note 寫明原因。
- `pending`：等使用者決定。之後決定了，就把那一行改成最終狀態。如果決定要拿，套用後改成 `picked` 並補上 hash。

上游歷史不是線性的，merge 進來的分支會讓較舊的 commit 出現在較新的 commit 之後。因此列表腳本是「從 baseline 起，排除紀錄檔裡已有的 hash」，不是「最後一行之後」。

## 本地慣例（套用上游程式碼時要轉換）

- **繁簡轉換**：本地用 `wgULS('简', '繁')`。上游自 5ca4449 起改用 HanAssist 的 `conv({ hans: '简', hant: '繁' })`。帶進來的程式碼要改寫成 `wgULS`，除非使用者已經決定採用 HanAssist（見 pending 的 5ca4449）。
- **ES5**：本地 ESLint 使用 `eslint-plugin-es5`，所以不能用 `const`、`let`、箭頭函式、樣板字串、`.includes()` 等。例如 `.includes(x)` 要改成 `.indexOf(x) !== -1`。除非使用者已經決定改用 ES6（見 pending 的 196303e）。
- **類別名稱**：本地用小寫的 `Morebits.wiki.page`、`Morebits.status`、`Morebits.quickForm` 等。另外已經有大寫別名（bf9b08f），所以上游的 `Morebits.wiki.Page` 等寫法也能執行。不過為了和周圍程式碼一致，改寫時仍用小寫。
- **連結**：本地的說明連結是 `w:WP:TW/DOC#...`，方針頁是 `Wikivoyage:...`，捷徑是 `WV:`。這些都保持本地版本。
- **編輯摘要**：本地在摘要後面加 `Twinkle.getPref('summaryAd')`，上游改用 change tags。保留本地做法。

## 已知分歧點（碰到時預期要手動移植或記為 diverged）

- `Twinkle.load`（twinkle.js）：本地用 `isSpecialPage` 判斷，上游用 `activeSpecialPageList` 陣列。要改特殊頁允許清單時，把條件加到本地的 `isSpecialPage`。
- `Twinkle.addPortlet`：本地的標題元素變數叫 `h3`，上游叫 `heading`。
- xfd：本地是 VFD（刪除表決）流程，沒有 AfD 分類和批量提刪，也不通知建立者。AfD 相關的改動都是 diverged。
- tag：本地沒有 Merge 系列模板和 {{Requested move}} 的處理。
- speedy：本地結構很舊，mode 常數不同，也沒有 templateModuleList。只套用和上游邏輯對得上的小改動。
- 本地已經移除 Flow 支援（`Morebits.wiki.flow`），改用 `Morebits.relevantUserName()`。

## 流程

### 1. 抓取並列出新 commit

```bash
git status                     # 工作目錄要乾淨
git remote get-url upstream || git remote add upstream https://github.com/xiplus-mediawiki-programs/twinkle.git
git fetch upstream
bash .claude/skills/sync-upstream/scripts/list-new-commits.sh
```

每行輸出包含 hash、日期、標題、**本地存在的檔案**、**本地不存在的檔案**。

也看一下紀錄檔裡的 `pending`，問使用者這次要不要決定：`awk -F'\t' '$2=="pending"' .claude/skills/sync-upstream/upstream-sync.log`

### 2. 分類

「本地存在的檔案」欄位為空的 commit 會自動略過，不必列出。其餘的逐一判斷；只看標題不夠，有疑慮時用 `git show <hash> -- <本地檔案>` 看實際 diff。

**略過（skipped）**
- zhwiki 專用內容：
  - 快速刪除準則的理由或文字更新，例如 "update csd reasons"、"update G21 rationale"、新增或移除某條 CSD 準則。本站有自己的刪除方針。
  - zhwiki 方針頁、`WP:` 捷徑、zhwiki 模板清單（tag、welcome、warn 的模板增刪）、關注度方針名稱。
  - 單純的文字修正、用詞或標點調整，例如半形、全形冒號，"ip user" 改成 "anonymous user"。本站的介面文字是另外本地化的。
  - zhwiki 才有的流程，例如 AFC、AfD 頁面格式。
- 上游的 CI（`.github/`）、dependabot、`package.json` 或 `package-lock.json` 依賴升級、lint 規則調整：本地有自己的設定。
- `gadget.txt`：本地的模組清單和依賴自己維護。
- 只對本地沒有的模組有用的部分，例如 close 的 CSS、block 的設定項目。

**要套用（pick）**
- bug 修正（undefined variable、錯誤處理、邏輯錯誤）
- `morebits.js` 和 `twinkle.js` 的核心功能修正或改進
- MediaWiki、皮膚相容性（vector-2022、DiscussionTools、Special 頁面名稱變更）
- API 變更、移除過時功能
- 臨時帳號、legacy IP 等全站通用的使用者模型變更
- 本地仍在使用的模組（fluff、diff、unlink、tag、talkback、welcome、speedy、copyvio、xfd、config）裡與站點無關的邏輯修正

**待確認（pending）**：同一個 commit 同時含通用邏輯和 zhwiki 內容、依賴本站是否有某個模板，或是大規模重構。這類交給使用者決定，不要自己猜。

**一系列互相修正的 commit**（例如同一功能先加、再改、再撤回）：先看整個系列的淨效果，只移植淨效果；被抵銷的那幾筆記為 `empty`，並註明被哪一筆抵銷。

### 3. 先給使用者看計畫

整理成表格給使用者確認，分成 pick、略過（可以依理由分組）、待確認三類：

| hash | 日期 | 標題 | 決定 | 理由 |
|---|---|---|---|---|

只動到本地沒有的模組的那些，摺疊成一行計數就好。等使用者確認或調整後，才開始套用。

### 4. 套用

把決定寫成 decisions 檔（tab 分隔：`hash	pick|skipped|pending|diverged|empty	note`），放在 scratchpad，然後執行：

```bash
bash .claude/skills/sync-upstream/scripts/apply-decisions.sh <decisions.tsv>
```

腳本會按上游順序處理：略過的寫進紀錄檔，`pick` 的執行 `git cherry-pick -x`。只動到本地沒有的檔案時，會自動 `git rm`；結果是空的就記為 `empty`。每筆套用後會做 Node 語法檢查。**遇到內容衝突就停下來**，由你處理完再重跑。

**處理衝突**，原則是**保留本地化，套用邏輯**：
- 照上面的「本地慣例」轉換上游程式碼（`conv` 改 `wgULS`、ES5、本地變數名稱）。
- 衝突區塊裡如果有上游的大段重構或其他 commit 才有的程式碼，只取這筆 commit 真正要改的那幾行。用 `git show <hash>` 對照，不要把整個上游版本貼進來。
- 衝突範圍很大，或本地結構完全不同時，`git cherry-pick --abort`，改成手動移植：直接編輯本地程式碼做出等效改動，然後 commit：
  ```bash
  git commit --author="<上游作者>" -m "<上游 commit 訊息>

  Ported manually: <簡述本地做了什麼調整>

  (cherry picked from commit <完整 hash>)"
  ```
  上游作者可以用 `git log -1 --format='%an <%ae>' <hash>` 取得。保留 `(cherry picked from commit ...)`，日後才能追溯來源。
- 改動依賴的東西本地根本沒有（例如本地 tag 沒有 Merge 模板），就 abort，記為 `diverged`。
- 本地早就是上游改後的樣子，就 `git cherry-pick --skip`，記為 `empty`。

處理完一筆後，自己在紀錄檔追加那一行（`picked` 附 hash 和調整說明，或是 `diverged`、`empty`），再重跑腳本。

### 5. 收尾

全部處理完後：
1. 對所有 JS 檔做語法檢查，並檢查這次新增的程式碼有沒有 ES6 語法：
   ```bash
   node -e "for (const f of process.argv.slice(1)) new Function(require('fs').readFileSync(f,'utf8'))" twinkle.js morebits.js modules/*.js
   git diff <開始前的 commit> HEAD -- '*.js' | grep '^+' | grep -nE '=>|\bconst |\blet |\.includes\(|`'
   ```
   如果專案已經 `npm install`，改跑 `npx eslint`。本地通常沒有 `node_modules`，而 `npx` 會抓到不相容的新版 ESLint。
2. 把紀錄檔的更新單獨 commit，例如 `sync-upstream: review upstream up to <最新 hash>`。
3. 向使用者回報：picked、skipped、empty、diverged、pending 各有幾筆；列出手動移植或調整過的 commit 和調整內容、每筆 diverged 的原因，以及仍然 pending 的項目。並提醒還沒 push、還沒部署，而且這些改動沒有在 wiki 上實際測試過。

不要自動 push，也不要部署到 wiki（`make deploy`）。這兩個動作都由使用者決定。
