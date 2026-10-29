---
title: "寫出好的 Agent Skill"
date: 2026-10-29 21:00:00
subtitle: "Matt Pocock〈Building Great Agent Skills〉演講筆記"
description: 整理 Matt Pocock 提出的 agent skill 四步檢查清單：Trigger、Structure、Steering、Pruning
tags:
  - AI
updateDate: 2026-10-29 21:00:00
---

現在網路上到處都有 skill 可以下載，但很難分辨好壞，很多人乾脆一次全部裝上，最後卻沒得到 skill 宣稱的效果。Matt Pocock 在 AI Engineer 的演講 [Building Great Agent Skills: The Missing Manual](https://www.youtube.com/watch?v=UNzCG3lw6O0) 中提出一份四步檢查清單，用來評估一個 skill 寫得好不好。以下是我的重點整理。

## 1. Trigger：決定由誰調用

skill 有兩種調用方式：

- **Model-invoked**：description 一直放在 context 裡，由 agent 自己決定要不要讀。代價是每個 description 每次請求都佔 token，而且 agent 不一定會在該用的時候調用。
- **User-invoked**：設定 `disable-model-invocation: true`，只能由使用者手動呼叫。代價是使用者得自己記住有哪些 skill、什麼時候該用。

兩者沒有絕對的好壞。Matt 偏好 user-invoked，因為這樣就不會遇到「該觸發卻沒觸發」的問題。

## 2. Structure：保持主檔精簡

- 把 skill 拆成兩種部分：**Steps**（要走的流程）和 **Reference**（執行流程時需要的資料，例如範本、名詞定義）。
- `SKILL.md` 越小越好，比較好維護，每次調用也比較省 token。
- 如果某份 reference 只有其中一種使用情境會用到，就把它移到 skill 資料夾裡的獨立檔案，`SKILL.md` 只留一句指引，例如「需要建立 ADR 時，讀 `adr-template.md`」。

## 3. Steering：讓 agent 照你的意思做

**Leading words** 是他認為最重要的技巧：用一個能代表大量意義的詞，取代冗長的說明。

例如 agent 習慣一層一層寫程式：先寫完整個資料庫，再寫完所有 API，最後才做前端（水平切片）。比較好的做法是先挑一個很小的功能，從資料庫、API 到前端一次打通，能動之後再擴充（垂直切片）。與其寫一大段說明，不如直接說「用 **vertical slice** 拆工作」，並在整個 skill 裡一致地使用這個詞。這是常見的開發術語，agent 本來就懂。如果 agent 的 reasoning 開始出現「我們先做一個 thin vertical slice」，就代表這個詞生效了。

他的另一個技巧是**隱藏後續步驟**。比方說 Plan mode 常在「問釐清問題」這一步偷懶，因為 agent 知道最終目標是產出計畫，問兩三題就急著動手。他的解決方式是把它拆成兩個 skill：先用 `grill-with-docs` 專心問問題，問完再用 `to-spec` 產出規格。agent 看不到下一步，就會把目前這步做得更深入。

## 4. Pruning：最後刪減

skill 變得很長，通常是因為下面三種問題：

- **重複**：同一份範本或定義寫了好幾次。每項內容應該只出現在一個地方。
- **沉積（sediment）**：多人一起編輯時，大家只加內容、不敢刪別人寫的。無關或過時的內容就直接刪掉。
- **無效指令（no-op）**：看起來有用，其實不影響 agent 行為的內容。用 AI 幫忙寫 skill 時特別常見。可以做**刪除測試**：刪掉一段後，如果 agent 的行為沒有改變，那段就不需要。

## 小結

Matt 的 skill repo 放在 [mattpocock/skills](https://github.com/mattpocock/skills)，可以看看他用這些心法做出來的成果

看完這個影片後，我還滿佩服他可以把寫 skill 文件這樣有點抽象的任務有條理的整理出一套架構

除了受益良多外，我覺得有趣的是在軟體開發領域常常遇到同一種概念可以套用在不同情境上

在以前我剛學寫程式的時候，我的 mentor 也跟我分享他認為 class / method 的實作應該越小越好，然後像積木一般把他們串接使用，這同事也是 Linux 指令的類似運作方式，這樣的方式竟然今日也可以套用在 skill 身上
