# qoosuperman.github.io

Anthony Chao 的部落格，用 [Astro](https://astro.build/) 建置，部署在 GitHub Pages。

線上位址：<https://qoosuperman.github.io/>

## 開發

需要 Node.js 22.12 以上。

```bash
cd astro
npm install
npm run dev      # http://localhost:4321/
```

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器，改檔案會自動重載 |
| `npm run build` | 產生靜態站台到 `astro/dist/` |
| `npm run preview` | 預覽 build 後的結果 |

## 寫文章

在 `astro/src/content/posts/` 新增一個 `.md` 檔，檔名決定網址：

```
astro/src/content/posts/2026-01-13-超級嬰兒通 書摘.md
  → /article/2026-01-13-超級嬰兒通 書摘/
```

Front-matter：

```yaml
---
title: "文章標題"          # 必填
date: 2026-01-13 21:00:00  # 必填，決定排序
subtitle: ""
description: ""            # 用於 meta description
tags:
  - Rails
header-img: "https://..."  # 文章頂部大圖
updateDate: 2026-01-14 09:00:00
---
```

除了 `title` 和 `date` 之外都是選填。完整的 schema 定義在 `astro/src/content.config.ts`。

文章內的 `##` 標題會自動產生右側目錄。

## 專案結構

```
astro/
├── src/
│   ├── components/PageHeader.astro   各列表頁共用的標題
│   ├── content/posts/                文章
│   ├── content.config.ts             collection 與 front-matter schema
│   ├── layouts/                      BaseLayout（全站外框）、PostLayout（文章頁）
│   ├── lib/excerpt.ts                首頁摘要：markdown 轉純文字
│   ├── pages/                        路由
│   └── styles/global.css
└── public/                           原樣複製到站台根目錄的檔案
```

路由對應：

| 檔案 | 網址 |
|---|---|
| `pages/[...page].astro` | `/`、`/page/2/` …（每頁 10 篇） |
| `pages/article/[slug].astro` | `/article/<slug>/` |
| `pages/tags/index.astro` | `/tags/` |
| `pages/tags/[tag].astro` | `/tags/<tag>/` |
| `pages/archive.astro` | `/archive/` |
| `pages/about.astro` | `/about/` |
| `pages/rss.xml.ts` | `/rss.xml` |

## 部署

推到 `master` 就會觸發 `.github/workflows/astro-deploy.yml`：build 之後把 `astro/dist/` 推到 `gh-pages` branch。也可以在 Actions 頁面手動觸發。
