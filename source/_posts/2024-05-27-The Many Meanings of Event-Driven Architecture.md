---
title: "演講摘要 - The Many Meanings of Event-Driven Architecture"
catalog: true
toc_nav_num: true
date: 2024-05-27 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
tags:
  - Developer
catagories:
  - Developer
updateDate: 2024-05-27 22:26:24
og_image: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
# top: 0
description: 演講摘要 - The Many Meanings of Event-Driven Architecture
---

不久前我看了一場關於事件驅動（event-driven）的 [演講]([https://www.youtube.com/watch?v=STKCRSUsyP0](https://www.youtube.com/watch?v=STKCRSUsyP0))，從中獲益良多，因此決定特別記錄下來。

演講者是Martin Fowler，他最為人所知的作品應該是《重構》（Refactoring）這本書。

Fowler提到，許多人跟他說他們正在使用事件驅動架構，但大家心中所理解的並不一致。他整理完之後，認為主要可以分為下列四種模式：
1. 事件通知（Event Notification）
2. 攜帶狀態的事件傳遞（Event-carried state transfer）
3. 事件溯源（Event sourcing）
4. 命令查詢責任分離（CQRS）

以下是對這些模式的說明：
## Event Notification

這算是最常見的一種類型：單純利用事件來解耦合。舉例來說，在保險系統中，若需要更改地址，客戶管理系統（customer management ）就需要通知保險報價系統（insurance quoting），從而形成依賴關係。

![image](https://hackmd.io/_uploads/H1EGecEWA.png)

採用 Event Notification 的作法後，流程變成了發布 / 訂閱模式，由客戶管理系統發布事件，保險報價系統訂閱這個事件。

![image](https://hackmd.io/_uploads/S1h3xvzbR.png)

優點：能夠解耦信息的接收者和發送者
缺點：整體流程的行為較難追蹤

### Event vs Command

講者還提到在事件系統中，有的人會用事件（events），有的人會用命令（commands），這兩者到底有什麼差異？

他認為，這兩者有微妙的區別，通常是取決於你對於這個東西的想法，如果這件事情發生了，而你不在乎他的結果，通常會使用 event 來命名（就像單純述說某件事情發生了），而如果這件事情發生，而你很在乎他，通常會取 command（就像你命令某人去做事情）

## Event-carried state transfer
這是 event notification 的另一種形式，不過相對較少見。

有時，雖然保險報價系統（Insurance quoting）接收到了事件，但資料不夠充分，因此需要反問客戶管理系統（Customer Management）以取得額外資料。當然我們可以將所需資訊都放在事件中，但有時資訊過多不適合這樣處理。

為了不讓 Customer Management 增加額外的 loading，可以複製一份需要的資料（可能是獨立的資料庫）專門讓 Insurance quoting 去查詢
![image](https://hackmd.io/_uploads/r1mj_wMZR.png)


而這個做法的缺點在於資料的一致性，因為複製過來的資料不一定是最即時的
![image](https://hackmd.io/_uploads/S1gTFvfbR.png)

## Event sourcing
事實上，許多軟體開發者都使用過基於事件溯源 (event-sourcing) 的工具，如 Git。

判斷是否為 event sourcing system 的關鍵在於，如果所有資料流失，只剩下 event log ，是不是可以根據 event log 回復你的所有資料，如果是的話他就是 event sourcing system。

優點：
- Audit
- Debugging
- Historic state
- Alternative state
- Memory image: 有了 event 之後，其實 application 運行可以不需要 persistent store，把所有的東西都在 memory 運行，可以讓 application 變得非常快，然後每天打一次 snapshot 紀錄狀態

缺點：
- Unfamiliar
- External systems：雖然系統內可以 replay，但如果打外部 API，現在重放可能跟兩個禮拜前打 API 的結果不同，可能需要考慮 partner replay event
- Event schema：舊的事件模式仍然必須以某種方式與新版本的程式碼一起工作
- Identifiers: 產生 identifier 給某個東西的時候也要特別小心，不要影響回放
- Asynchrony: 異步處理對於人們的處理是很難的，而使用 event sourcing 不一定要搭配 Asynchronous 來使用，當有人抱怨每次要增加 feature 時要處理 write model 跟 read model，變成兩份工作時，這跟 event sourcing 無關，跟 Asynchornous 有關
- versioning: 當有個一年前的 event，我想要回放他，還是可以 apply 的嗎？增加 versioning 也增加了整體的複雜度

講者特別提到一點挺有趣的，在 Git 中，我們如果只看每個 commit 的改動，只能看到改變了什麼而無法知道為什麼要改，所以我們必須透過 commit message 得知意圖

同理，當我們在試圖儲存 event 的時候，也分成 external event / internal event，external event 充分展現了意圖，internal event 則表示這個 event 改變了什麼，他想討論在 event sourcing 中，需要儲存的 event 是哪一種，講者說他覺得大部分情況下應該同時儲存兩者，其中一種情境可以看下面範例

在下面的圖中，有個錯誤，實際上的價格是 32 而不是 33，但我們又難以去改這些 event，因為 output event 已經發送給其他系統做操作，會影響後續一系列的事件，因此陷入了 event 彼此糾纏而無法 replay 的窘境，他的建議是不要任何 business logic 放在這些跟其他系統溝通的 event 中，而解決這個問題的一種方式就是同時儲存 external 跟 internal events
![image](https://hackmd.io/_uploads/HyVVv0h70.png)

## CQRS

CQRS的主要概念在於分離讀取和寫入模型。

作者指出使用這種模式時需要謹慎，認為只有在某些特定情景下，這種模式才適合使用。強調應該清楚理解其優勢，確信需要這些優勢時才採用。

作者認為 CQRS 並不只是把資料轉換過放到另一個不同的 database 做查找（ex. 把資料轉換後用不同形式放到 big query 專門產生報表用資料），重點在於寫的模型不會被任何讀取操作使用到，這才是相對比較少見的

![image](https://hackmd.io/_uploads/HJ4tM_fW0.png)

### IDDD 中的使用範例

另外分享一下在《實踐領域驅動設計》（IDDD）裡面看到的範例。

在事件溯源系統中，想要獲取當前狀態時，可以通過快照加上部分事件回放來獲知。而在需要對這些物件進行搜索時，則是運用 CQRS 的 理想時機。每次事件發生時，最新狀態將寫入 Event store（圖中稱為 command store），同時也會有訂閱者更新 read model的數據，這樣一來就可以透過 read model 去做查詢並維持原本的 replay 機制。

![image](https://hackmd.io/_uploads/SksYmghxR.png)

## 心得
之前從沒想過 Event Driven 還可以區分成這麼多不同類型，小到單純是寫程式的一種 pattern，大到整個系統會需要依賴於這些事件而存在。然而，並不存在所謂的 best practice，不同情景各有其最合適的方法。

感謝這個演講，真的讓我獲益良多，也令我期待在未來的不同情境中找到合適的實踐方式。
