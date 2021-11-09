---
title: "Synopsis of Responsible Rails"
catalog: true
toc_nav_num: true
date: 2021-11-09 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1635864702590-b02b40e65488?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1771&q=80"
tags:
- Ruby
- Rails
- Devops
catagories:
- Rails
- Devops
updateDate: 2021-11-09 22:26:24
# top: 1
description: Synopsis of Responsible Rails
---

## Intro
這篇文章紀錄 `Responsible Rails` 我認為比較值得注意的內容
![](https://i.imgur.com/1g8Fj5k.png)

這本書覺得很不錯，很大部分其實跟 Rails 本身無關，而是在教你怎麼成為 Responsible 的工程師XD

裡面對於緊急狀況的處理這一章節，覺得受益良多！

## Outline
- [Mindset](#mindset)
- [The importance of being responsible](#the-importance-of-being-responsible)
- [Practical approaches to be more responsible](#practical-approaches-to-be-more-responsible)
- [Surviving emergencies - the framework for dealing with production incidents](#surviving-emergencies---the-framework-for-dealing-with-production-incidents)
- [Case Studies](#case-studies)
- [Others](#others)

## Mindset
- 作為 Responsible engineer，做任何事情確保你不是各種 failure 的 source
- 修好各種問題是整個 team 的責任，不要置身事外
- 對這些 failure 永遠保持 blame-free 的態度
- 就像你找人修車，結果車子回來，雖然修好了煞車但引擎又壞掉，修一個地方壞另一個地方這種狀況是失去客戶信任的最快方法

---

## The importance of being responsible
- 如果你想贏得客戶尊敬，而且自己的意見能被客戶接受，那首先就需要 responsible
- 為了建立信任，要證明你可以完成 feature 的同時，也可以排除各種意外狀況
- 你可能沒辦法掌控第三方支付的穩定度，你可能也沒辦法完全控制 AWS 的機器，但你能掌控的就是你跟客戶之間的溝通，至少在溝通上你一定要做到 responsible

---

## Practical approaches to be more responsible
### More verbose app
為了讓你工作上有更多快樂時光，確保你的 app 夠 verbose
- 做出足夠的 logging 足以讓你追蹤問題
- 追蹤 exceptions
- 追蹤各種重要的 infra metrics

### Learn with every failure and bug
> You need to have skill to perform post-mortem analysis. You need to be able to learn - and have a framework for it. That’s a part of being responsible with production code.

---

## Surviving emergencies - the framework for dealing with production incidents
處理意外狀況的時候，我們還是可以建立一套 framework 去遵循

### When you know about the incident
當知道有意外發生，首先應該通知所有相關連的人 / 組織

通常是以下幾種族群：
1. 客戶
2. 使用者
3. Third-party users of your app

訊息應該包括：
1. 問題描述
2. 現在的狀態 ex. 已經在修復中或者什麼時候要去修復

> 最重要的是，該通知的訊息中不包含 Why，最好在你送出訊息之後，再著手花時間去確認問題

### When trouble shooting
儘管意外還沒解決，還是會有人不斷地問你

1. 處理的進度如何
2. 預計什麼時候可以 fix 這個狀況
3. 這個狀況會造成什麼後果，end user 的 data 會不會影響或者錢包會縮水?

> 這時候要注意講的話不要太過術語，讓別人聽不懂

#### Estimate time
針對預計時間這件事情，很遺憾沒辦法很快改善預估的精準度，但我們可以改善預估的方向，與其只給一個時間點，我們可以給出各種情況，像是：

• Optimistic estimation is 2 hours
• Expected estimation is 8 hours
• Pessimistic estimation is 48 hours

- Optimistic estimation: 最快時間，你沒辦法想像比這更快
- Expected estimation: 通常就是你平常給一個時間點那個時間(直覺時間)
- Pessimistic estimation: The worst possible scenario

#### Don’t forget about your team
> Over communication is better than no communication

內部溝通絕對是意外發生當下最重要的工作

• Do everyone know about the incident is happening?
• Is anyone working on it now? Can you help your teammate in this process?
• What steps are already done? Do we have any information what caused the emergency? Are
interested parties informed already?
• What hypothesis are worth checking? Do we have any clues?

> 如果你們使用即時通訊工具，很推薦做一個獨立的 channel 處理 emergencies

以下這段直接節錄：

Try to be as verbose as possible about:
• What are you doing?
• Why are you doing it?
• What is the outcome of your actions?
• What problems do you experience?
• When you’ll finish this particular action?
• Is there something someone can do to help you?

it’s way easier to perform post-mortem analysis and plan if you overcommunicate your actions.

### Analysing failure
這一步就要開始探討問題發生的原因，第一步要收集症狀，像是某個 feature 沒有正常運作 / 用戶執行某個動作會卡住...etc

通常這些症狀都有些提示讓你知道，問題出現在哪一層

所謂的 layer 通常有以下這些：
• Infrastructure - 記憶體不夠 / serveice 沒有正常配置 / CPU 已經被用到 100%...etc
• Configuration - schedule job 沒正常配置 / connection pool 太小...etc
• Codebase
• External source - ISP 有問題...etc
• Humanmistake

通常真正的問題存在其中一的 layer，當然也是有存在多個 layer 的可能

如果不知道問題出在哪，可以從 infra layer 開始，因為研究 infra layer 的時候，通常有一些數據也可能讓你更知道問題還自哪裡，而且拿到這些數據通常較為輕鬆

### Preventing emergencies

要避免意外狀況發生，你需要不忘記你學到什麼，以下提供一些方法：
1. 把發生當下的過程記錄下來
2. 把最重要的結論記錄在 wiki
3. 在 meeting 中分享，因為有些人並沒有參與每個專案，這可能是他們可以得到資訊的唯一途徑
4. 甚至可以在 blog 上面分享，可能有除了公司的人有更好的 solution
5. 為 task 製作 checklist

作者提到：
> You will not become a responsible developer without becoming a DevOps expert.

你不可能在不成為一個 devops 專家的情況下，變成一個 responsible developer，如果不知道 devops 的知識，你可能是一個很棒的 Rails coder，但不會是一個 responsible developer

---
## Case Studies

### Conceptual mistakes
這裡針對跟第三方服務做整合的時候的意外狀況

我們沒辦法避免 Conceptual mistakes，我們能做的只有做好 logging
- 把所有送給 external service 的 request 記錄下來
- 把所有 external service 的 response 記錄下來

### Failure paths handled in an invalid way
再跟第三方服務串接得時候，容易沒有處理好失敗的情境

確保了解 business-critical failure path scenario，不確定就跟更了解 business model 的人確認

以下常見的情況也需要考慮是否需要處理：
• External service 沒辦法 access 的情況
• 網路問題
• 負載高的狀況

可以積極的使用 timeout 做確認，要讓這些第三方整合 fail 的時候盡快發現，可以建立 retry 機制，並可以搭配像是 exponential backoff 這種機制做 retry

### Gem upgrade
書裡面提到一個馬上升級 gem 帶來的 bug

如果有 gem 升級的時候，可以稍微等一下，等其他多一點公司開始使用在跟著升級

可以一個禮拜跑一次 bundler-audit 看看有哪些 gem 有更新

### Temporary files not cleared by background jobs

通常在 gc 階段的時候，所有使用的 tempfile 物件都應該被自動刪除

最後追到原因竟然是因為 Resque 裡面在執行玩 job 之後用的是 exit! 而不是 exit，exit! 這個 method 是不會去 trigger at_exit 裡面的 callback 的

```ruby
puts "hooks"
at_exit { puts "at_exit function" }
ObjectSpace.define_finalizer("string", proc { puts "in finalizer" })
exit

# hooks
# at_exit function
# in finalizer

puts "hooks"
at_exit { puts "at_exit function" }
ObjectSpace.define_finalizer("string", proc { puts "in finalizer" })
exit!

# hooks
```
但最好在 code 裡面盡量不要 depend gc 的行為，我們可以在使用完之後主動把檔案拿掉，盡量 follow best practice 避免這種事情發生


### Always set unique constraints on database, especially when you are using MySQL
就算有 vlidation 還不夠，基本上你不希望重複的東西都應該設定 unique constraint

MySQL 的 encode 設定應該是 utf8_unicode_ci 或者 utf8_general_ci

這裏的 ci 表示 case insensitive

如果把 encode 設定成 `SET NAMES 'utf8';` 的話，'tester' 會被視為跟 'Tester' 不同，但通常我們想要他們被 unique constraint 卡住

就算設定成 utf8_unicode_ci 還是有些狀況，比方說 "JAŹŃ" 會被當成跟 "jazn" 這兩個字依樣

要避免這狀況應該把欄位設定成 utf8_bin
```
ALTER TABLE 'table_name' MODIFY 'column_name' VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_bin;
```

可以考慮善用 feature toggle + deploy often

你每次想要 revert 一個小 PR 比較不怕，這 feature 真的 release 有什麼問題也可以馬上關掉他

---

### Write clean code
要寫 clean code 可能因為很多事情變得很難：

1. 太多 rule
2. 沒有 hard rule
3. 很多不同 approach，而且他們又是常常互相違背的
4. 做的事情依樣，但多花了一小時去 refactor

> Uncle Bob says: Clean code is code that has been taken care of.
Ask yourself honestly: Do you take care of your code?

## Others
[ihower 整理的摘要](https://ihower.tw/blog/archives/10768)