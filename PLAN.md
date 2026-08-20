# 在現有 Hexo blog repo 內建立 Astro 骨架，銜接既有部署流程

## Context

目前 `qoosuperman.github.io` 是 Hexo + huweihuang theme 的 blog，已累積 119 篇文章，透過 GitHub Actions 推到 `gh-pages` branch 部署。使用者想換掉視覺框架，但保留：
- markdown 寫作流程（檔案放在 `source/_posts/`）
- push master → GitHub Actions → gh-pages 的部署管線
- 既有舊 URL（`/article/<slug>/`）不能壞，避免外部連結與 SEO 失效

決定走 **Astro**:SSG 純靜態輸出，與 GitHub Pages 完全相容；視覺從零自由刻；用 Tailwind 加速 styling。

採用「並存過渡」策略：在 repo 內 `astro/` 子資料夾建立 Astro 專案，Hexo 暫時不動。Astro 部署 workflow 初期只用手動觸發 (`workflow_dispatch`)，避免兩個 workflow 互踩。視覺 OK 後再切換。

## 決策摘要

| 項目 | 決定 |
|---|---|
| 子資料夾名稱 | `astro/` |
| CSS 方案 | Tailwind（一併安裝） |
| 文章來源 | Astro 直接讀 `../source/_posts/*.md`（不搬檔案） |
| 文章 URL | 保留 `/article/<slug>/`（slug = 檔名去 `.md`） |
| 部署目標 | 同一個 `gh-pages` branch，沿用既有 `HEXO_DEPLOY_KEY` secret |
| Hexo workflow | 過渡期保留，繼續可用 |
| Astro workflow | 初期只 `workflow_dispatch`（手動），切換時改為 `push: master` |
| Node 版本 | 由 Claude 透過 `nvm install 22 && nvm use 22` 設置 |
| 骨架範圍 | 最小可部署集（首頁無分頁、單篇文章、tag 頁無分頁、about、404、RSS、sitemap） |
| 歸檔頁 URL | 本次不做歸檔頁（最小集不含），延後處理 |

## 實作步驟

### Step 1 — 環境準備
- 執行 `source $NVM_DIR/nvm.sh && nvm install 22 && nvm use 22`
- 確認 `node -v` ≥ 22
- 註：nvm 是 shell function，每個 Bash call 都要先 `source` 才能用

### Step 2 — Scaffold Astro
- `npm create astro@latest astro -- --template minimal --typescript strict --install --no-git --skip-houston --add tailwind`
- 產出：`astro/package.json`、`astro/astro.config.mjs`、`astro/tsconfig.json`、`astro/src/`、`astro/public/`

### Step 3 — 設定 Astro
**`astro/astro.config.mjs`**
- `site: 'https://qoosuperman.github.io'`
- 加 integrations：`@astrojs/sitemap`（`@astrojs/rss` 是 helper 不算 integration）
- 保留預設 `outDir: 'dist'`，部署 workflow 指定 `./astro/dist` 為來源
- `markdown.shikiConfig`、`markdown.remarkPlugins`（TOC、anchor 之後再加）

### Step 4 — Content Collection 設定
**新增 `astro/src/content.config.ts`**：
- 用 `glob` loader 指向 `../../source/_posts/*.md`
- Zod schema 接 Hexo front-matter（寬鬆）：
  - `title: z.string()`
  - `date: z.coerce.date()`
  - `updateDate: z.coerce.date().optional()`
  - `subtitle: z.string().optional()`
  - `description: z.string().optional()`
  - `tags: z.array(z.string()).optional()`
  - `'header-img': z.string().optional()`（transform → `headerImg`）
  - `og_image: z.string().optional()`
  - `catalog: z.boolean().optional()`
  - `toc_nav_num: z.boolean().optional()`
  - `top: z.union([z.number(), z.boolean()]).optional()`

### Step 5 — Layout 與頁面（最小集）
| 檔案 | 用途 |
|---|---|
| `astro/src/layouts/BaseLayout.astro` | 全站 head（meta、og、GA、favicon）+ header/footer |
| `astro/src/layouts/PostLayout.astro` | 文章頁 layout（header img、title、meta、content、tags） |
| `astro/src/pages/index.astro` | 首頁（最近文章列表，先不做分頁） |
| `astro/src/pages/article/[slug].astro` | 單篇文章（`getStaticPaths` 讀 collection） |
| `astro/src/pages/tags/[tag].astro` | tag 頁（先不分頁） |
| `astro/src/pages/about.astro` | 關於頁（從 `source/about/index.md` 內容搬過來） |
| `astro/src/pages/404.astro` | 404 |
| `astro/src/pages/rss.xml.ts` | RSS feed（`@astrojs/rss`） |

延後：分頁、年月歸檔、sidebar widgets、TOC、文章 anchor、aplayer

### Step 6 — 靜態資產
- `astro/public/googlef1f4f15c1e72b476.html` ← 複製，保留 Google 驗證
- 目前無 CNAME，跳過
- 註：`source/img/` 不複製。`/img/...` 路徑只有 about 頁與 404 用到（文章 header image 都是 Unsplash 外連），新視覺重做時直接重選圖即可

### Step 7 — 新 GitHub Actions workflow
**新增 `.github/workflows/astro-deploy.yml`**：
- Trigger：`workflow_dispatch` only
- Steps:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: '22'`
  3. `cd astro && npm ci && npm run build`
  4. `peaceiris/actions-gh-pages@v3`：
     - `publish_dir: ./astro/dist`
     - `publish_branch: gh-pages`
     - `deploy_key: ${{ secrets.HEXO_DEPLOY_KEY }}`
- Hexo 的 `main.yml` **不動**，繼續是主部署管線

### Step 8 — gitignore
- 在 `.gitignore` 加 `astro/node_modules/`、`astro/dist/`、`astro/.astro/`

### Step 9 — 本地驗證
- `cd astro && npm run dev` → 開 `http://localhost:4321/`，檢查：
  - 首頁列出文章
  - 點進文章可看到內容、header image、tags
  - tag 頁列出對應文章
  - about 頁正常
  - 404 正常
  - `/rss.xml` 出 RSS
  - `/sitemap-index.xml` 出 sitemap
- `cd astro && npm run build` 看有沒有 schema validation 錯（可能會抓出某些舊文章 front-matter 邊角案例）

### Step 10 — 部署驗證
- 在 GitHub Actions 手動觸發 `astro-deploy.yml`
- 檢查 `gh-pages` branch 內容
- ⚠️ 注意：手動觸發會覆蓋 Hexo 部署的內容！建議在分支或測試 repo 試完再決定何時切換

## 切換時機（不在本次計畫內，先列備忘）

- v1 視覺與功能滿意後
- 把 `.github/workflows/astro-deploy.yml` 改 trigger 為 `push: master`
- 移除 `.github/workflows/main.yml`
- 移除 Hexo 相關檔案：`themes/`、`scaffolds/`、`_config.yml`、`db.json`、`package.json` 中 Hexo 依賴、`outline_generator.rb` 等
- 文章可以選擇搬到 `astro/src/content/posts/`（更標準），content.config.ts 改 loader 路徑

## 驗證

- 本地：`cd astro && npm run dev` 可開啟，所有最小集頁面正常
- 本地：`cd astro && npm run build` 無錯誤
- CI：手動觸發 `astro-deploy.yml`，gh-pages 部署成功
- 線上：訪問 `https://qoosuperman.github.io/article/2025-05-04-人生四千個禮拜 書摘/` 等舊 URL 仍可開啟內容
