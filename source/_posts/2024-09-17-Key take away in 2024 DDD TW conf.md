---
title: "Key Take Away from 2024 DDD TW Conf"
catalog: true
toc_nav_num: true
date: 2024-09-17 22:26:24
subtitle: ""
header-img: "https://anthony-public-images.s3.ap-northeast-1.amazonaws.com/0_article_images/2024_DDD_TW_conf.jpg"
tags:
  - Developer
catagories:
  - Developer
updateDate: 2024-09-17 22:26:24
# top: 0
og_image: "https://anthony-public-images.s3.ap-northeast-1.amazonaws.com/0_article_images/2024_DDD_TW_conf.jpg"
description: Key Take Away from 2024 DDD TW Conf
---

上週參加了 2024 台灣領域驅動設計年會，覺得收穫滿滿！

有些議程專門給剛開始接觸 DDD 的新手，像是說明 DDD 裡面提供的 design pattern 如何運用，也有人在講自己專案中導入 DDD 的實戰經驗，更多的是分享自己的一些見解（ex. 團隊拓墣 / 開發者體驗 ...etc）

另外比較特別的還有 panel discussion 找一些專家討論遺留工作負載這個議題

這篇文章中挑了兩場演講記錄一些重要的 take away 分享給看到這篇文章的大家，同時也作為自己往後的 memo（註：礙於知識產權，不方便直接分享投影片截圖出來）

## 開發者體驗(DevEx)

開發者體驗的廣義定義為：視開發者為 End user，將工作過程的技術協作與團隊協作看做產品與服務，關注 developer 在使用中的感知與反應；致力於消除這些產品與服務所帶來的摩擦力，進而能夠快速交付價值並獲得回饋

開發者體驗不佳的結果：
- 專注於個人項目：轉移注意力到自己能控制的項目上。
- 驗證負面體驗：接受並承認當前的負面體驗。
- 加班：通過加班來完成工作以減少壓力。
- 停止發聲：減少反饋或提出問題，避免與問題對抗。
- 減少參與：減少在團隊活動中的參與度。
- 利用系統漏洞：利用組織中的漏洞來達到自己的工作目標。
- 離職：當問題無法解決時，選擇離開公司。

講者認為 DevEx 主要由三個要點組成：
1. 心流狀態
2. 回饋循環
3. 認知負荷

### 心流狀態
影響心流狀態的因素非常多．包括但不限於：
- 心理安全（ex. 公司總是處在不穩定狀態，也很難進入心流）
- 工作中斷頻率
- 開發工具摩擦
- 任務清晰度
- 好的 CICD 流程

讓自己進入心流的要點：
- 挑戰與技能匹配：選擇一個挑戰難度與你當前技能水平相匹配的任務。
- 設置清晰的目標：確保每個任務前有明確方向
- 即時回饋：在行動中，能夠持續獲得反饋是關鍵。
- 專注於當下：心流的實現需要你全神貫注於當下的活動。消除外界的干擾，專注於眼前的任務，將有助於你快速進入心流狀態​。可以使用單核工作法 / 番茄工作法

### 認知負荷
包括但不限於：
- 程式碼複雜性
- 文件易讀性
- 需要高專業知識的任務

認知負荷可以分成三種：
- 內在負荷：跟任務本身複雜性有關，是無可避免的
- 外在負荷：跟學習環境 / 方式有關，通常是可以減少的
- 額外負荷：有助於學習跟理解的負荷，應積極管理以提升學習效果

講者認為，認知升級是人類（工程師）最好的投資，對於工程師來說，認知升級意味著不斷更新知識結構、拓展思維方式以及提升問題解決能力，這些都是在職業生涯中取得長遠成功的關鍵。

講者又認為，解決認知負荷最好的方式是找到 mentor，不管是在專案內，或者人生中，一定要找到人生的 mentor 解決認知負荷

### 回饋循環
包括但不限於：
- 自動化測試速度
- 本地變更驗證時間
- 程式碼 review 週期時間
- 任務切換次數

## 新專案使用 DDD 的經驗談

在做產品的時候，往往不是領域專家的知識變成產品，而是開發者心中的想像變成產品

而 DDD 的主要目的是為了減少產生出來的產品跟 PM 心目中產品的落差，所以雖然 DDD 介紹了很多工具，但他的開發啟動是從跟領域專家的對話開始

### 講者導入之後的心得
1. 業務複雜度高的情況下用 DDD 不一定變慢，且更快得到驗證
2. Ubiquitos language 是有意義的追求
	- 當發現雞同鴨講的時候，先停下來對名詞
	- 文件用錯辭的時候，馬上改正
3. 快速頻繁驗證
	- API First Design，前後端儘量不要成爲互相的瓶頸
	- In-memory prototype，最後才做 Table Schema Design 並接上真的 Database
4. 跟領域專家一起定義 scope 是專案成功的關鍵之一
5. 實際情況往往會超出書本的定義，這時候仰賴當事人跟團體決策，不用執著在 DDD 的教條，要懂得妥協

### Architectural Decision Records(ADR)
- 用於記錄「架構決策」
- 架構就是跟重要的事情有關的事物
- 記錄「Why」而非 「How」、「What」，通常會有幾個選項做選擇。
- 提醒未來的自己爲何當初要這這麼做，避免踩到坑或是提供充分資訊做決定。
- 寫什麼？架構設計、使用新套件、命名規範...
- 何時寫？只要有疑慮，就寫 (by Shopify Engineering)

### 整理軟體缺陷的來源

軟體缺陷來源主要有四種
1. Programmer errors
  - 例：演算法寫錯、錯字、邏輯錯誤、改 A 壞 B
2. Design errors
  - 例：技術債、過度設計與複雜
3. Requirements errors
  - 例：結果與規格書定義不同，或規格書本身就不完整或有錯誤
4. Systemic errors (escaped defects)
  - 例：資安漏洞、主機掛掉、第三方服務失效

- 良好習慣 For Programmer Errors
	1. 從規格書把業務邏輯都要進入 Unit Tests 中，一條對一個 unit test
		- 主要以測試 Use Case 層爲主
		- 加強 Unhappy Path 測試
		- Unit Test 也要用 Ubiquitous Language 命名，且盡可能提高可讀性
	2. Code Review 時審核變數命名盡可能符合 Ubiquitous Langauge
	3. 加上 Linter、Type Checker 減少錯誤的發生
	4. 補上 E2E Tests (Robot Framework)，覆蓋 Happy Cases

- 建立設計原則 For Design Errors
	1. 與團隊一同建立
	2. 遵守分層原則、Simple Design
	3. 定期 Refactoring 討論會議，在每一季度前排入工程票。
	4. 儘量減少不必要的 Interface 與 Class，保持數量越少、內容越簡單越好。

- 套用 Specification By Example(SBE) 流程促進溝通提升規格書品質
	1. 功能進開發前，會進入四個關卡：
		- PM 交出初版 Requirement
		- PM、Developer、QA 一同討論規格、找出實例、探索風險（Example Mapping）
		- Developer 完善 (Refine) Requirement、討論 API 規格
		- Developer 拆出技術票
	2. 工程師提早加入參與，可以提出替代方案來降低技術難度、加快上線速度以及提升品質。
		- PM：提早與工程師討論可以儘快獲得回饋、降低獨自做決策的壓力，也能產出更完善的規格書
		- QA：大約 80% 以上的測資都在 Example Mapping 都找出來了，只要工程師照着開發，我就能專心測試更極端的案例。

- 定期 Retro 來解決 Systemic Errors
	1. 團隊不分職位一起進行探索性測試，包含驗證格式主題、使用流程主題、易用性主題等等...
	2. 每次 Retro 都包含本次 Sprint 的 Bug 數，包含：
		- QA 驗出來的 Bug
		- 線上發生的 Bug
		- 緊急的 Bug
	3. 盡可能從流程面去避免這些問題，比如：
		- 當後端提供的 API 時常一有其他更動就壞掉：以後後端 PR 都要附上 API Result 截圖。
		- 當問題多出在串接的 Y 團隊：下次接洽時，要先對他們的 API 進行一定程度測試以及時程確認？
		- DB Migration Script 內容有誤：將 Migration Script 加入 Git Version Control
	4. 又或者從使用者 Feedback 獲得更多資訊
