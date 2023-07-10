---
title: "Essential Prompt Patterns for AI Interaction"
catalog: true
toc_nav_num: true
date: 2023-07-10 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1679083216051-aa510a1a2c0e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2664&q=80"
tags:
- AI
catagories:
- AI
updateDate: 2023-07-10 22:26:24
og_image: "https://images.unsplash.com/photo-1679083216051-aa510a1a2c0e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2664&q=80"
# top: 0
description: Essential Prompt Patterns for AI Interaction
---
## Introduction
最近我在 Coursera 上了 "[Prompt Engineering for ChatGPT](https://www.coursera.org/learn/prompt-engineering/home/week/1)" 的課程，並從中學習到了許多知識，因此我想把主要的學習重點整理出來，以便日後參考

在這篇文章中，我將結合課程內容和我自己的觀點，主要的內容將圍繞課程中提到的各種 Prompt Engineering pattern，並且大部分的 pattern 會分享我嘗試的範例。

這是一篇很～長的文章，也許做個書籤，當作工具來使用會比較適合，不建議一次看完。我甚至比較建議直接去上前面提到的 [課程](https://www.coursera.org/learn/prompt-engineering/home/week/1)，此課程雖然免費但我覺得相當有質量！

## Outline
- [Introduction](#introduction)
- [什麼是 Prompt](#%E4%BB%80%E9%BA%BC%E6%98%AF-prompt)
- [Root Prompt](#root-prompt)
- [Prompt 的強度](#prompt-%E7%9A%84%E5%BC%B7%E5%BA%A6)
- [Prompt Patterns](#prompt-patterns)
  - [Persona Pattern](#persona-pattern)
  - [Prompt Question Refinement Pattern](#prompt-question-refinement-pattern)
  - [Cognitive Verifier Pattern](#cognitive-verifier-pattern)
  - [Audience Persona Pattern](#audience-persona-pattern)
  - [Prompt Flipped Interaction Pattern](#prompt-flipped-interaction-pattern)
  - [Few Shot Example Pattern](#few-shot-example-pattern)
  - [Chain of Thoughts Pattern](#chain-of-thoughts-pattern)
  - [ReAct Pattern](#react-pattern)
  - [Gameplay Pattern](#gameplay-pattern)
  - [Template Pattern](#template-pattern)
  - [Metalanguage Creation Pattern](#metalanguage-creation-pattern)
  - [Recipe Pattern](#recipe-pattern)
  - [Prompt Alternative Approaches Pattern](#prompt-alternative-approaches-pattern)
  - [Ask for input pattern](#ask-for-input-pattern)
  - [Prompt Outline Expansion pattern](#prompt-outline-expansion-pattern)
  - [Menus Actions Pattern](#menus-actions-pattern)
  - [Fact Check Pattern](#fact-check-pattern)
  - [Tail Generation Pattern](#tail-generation-pattern)
  - [Semantic Filter Pattern](#semantic-filter-pattern)

## 什麼是 Prompt

在介紹 Pattern 之前，首先來介紹一下 Prompt

我直接問 ChatGPT 這個問題，我認為他的回答相當精確：

> In summary, the prompt is the input or instruction given to the language model to initiate a conversation or generate a response. It helps to define the context and shape the output of the model.

我們丟給 Large Language Model(ChatGPT 即一種 Large Language Model, 以下簡稱 LLM) 的 input 就稱為 prompt

隨著我們提供的 prompt 愈來愈多，結合 ChatGPT 的回應，這些對話逐漸形成了一種 "情境"，這些情境對接下來的對話有很大的影響。

目前，大部分人使用 ChatGPT 的方式是問一個問題並讓 ChatGPT 回答。但 LLM 最初並非設計來重複回答問題的，它的主要功能是透過回應，讓我們提供的 prompt 變得完整。例如，我們給它一段知名歌曲的歌詞，它會嘗試接續下一段歌詞。

如果我們用這種方式來思考，而不是只透過一個問題試圖獲得 ChatGPT 完全正確的答案，可以讓 ChatGPT 展現更大的價值。

> ChatGPT 主要功能是透過回應，讓 prompt 變得完整

<img src="https://hackmd.io/_uploads/BylA5j-Y2.png" alt="" height="50%" width="50%">

## Root Prompt
Root Prompt 是指在開始之前，先給 ChatGPT 一項必須遵循的原則。

事實上，無論是 ChatGPT 或是如 Bing 這樣的工具，他們應該都藏有一些隱藏的根本提示，例如無法回答 2021 年之後的數據，或是無法提供某些產品序號等等。

當然目前還有一些人在持續嘗試破解這些 hidden root prompt，像是用感人的故事來騙 Windows 序號:

![](https://cdn.hk01.com/di/media/images/dw/20230620/747802489729847296682940.png/QmLuLhw8SVIK4M4mVPx250vRsq24UowrbVPC7W1Twu0?v=w1920)

## Prompt 的強度
LLM 被設計為具有一定的隨機性，因此，如果我們重複對它提出相同的問題，每次得到的結果通常都會不同。然而，這實際上與提示的強度有關。

例如 "兩隻老虎" 這個例子。這首歌詞已經被訓練過數千萬次，因此它成為一個強度高的 Prompt，即使我們問了10次，每次都會得到相同的結果。

但是，如果今天我們將歌詞改為"兩隻兔子"，我們很快就會得到完全不同的回答。這類 Prompt 的強度就很明顯相對較弱：

<img src="https://hackmd.io/_uploads/By_m3sWY2.png" alt="" height="50%" width="50%">

## Prompt Patterns
就我的個人觀點，Prompt Pattern 就像是程式語言中常見的設計模式 Design Pattern。在初期，並沒有這些模式存在，但隨著大家經驗的積累，一些被認為普遍好用的 Pattern 就被大家所接受，並逐漸形成並流傳

使用 Pattern 的好處在於省去一些思考的時間。我們可以從人們累積的這些模式中找到剛好可以解決目前問題的那一種，並直接套用。這種方式通常比我們自己憑空思考更為節省時間，且效果也往往更好。

以下就一一介紹課程中提到的 pattern

### Persona Pattern
在日常生活中，當我們遇到某些問題時，可能會想尋求專家或具有某種特殊技能的人的意見。這時候 Persona Pattern 就非常適用。

我們會要求 ChatGPT 扮演這個角色，然後向它提問，像是：
```
Act as a kubernetes expert.
Explain what is kubernetes to me.
```

使用時，不要被你的想像力所限制，你可以要求它扮演動物甚至是電腦程式:

![](https://hackmd.io/_uploads/Hk4kGBNY3.png)

網路上甚至也有整理 [各種職業的詠唱法](https://domyweb.org/chatgpt/)

### Prompt Question Refinement Pattern
由於我們不知道大型語言模型 (LLM) 是如何被訓練的，因此我們很容易提出一個問題，卻未能得到期望的答案。在這種情況下，我們可以用一個較為廣泛的問題，請求它幫我們精煉出一個更好的問法，從而得到我們想要的結果。

如果懶得把他生出來的問題再複製貼上去問他，可以加上 `Prompt me if I would like to use the better version instead`

我的使用範例：
![](https://hackmd.io/_uploads/H1rTPBEY3.png)

### Cognitive Verifier Pattern
使用此 pattern 的目的是讓 ChatGPT 在被問問題時，會自己提出更多細節的問題，以便能更精確地回答問題。

在我的想像中，這可以作為我們思考問題時進行 brainstorming 的工具。

我的使用範例：
![](https://hackmd.io/_uploads/Hy7Sor4Yh.png)

### Audience Persona Pattern
之前提到過 Persona Pattern ，那是請 ChatGPT 扮演一個角色。

而這種模式則相反，是將自己塑造成一個指定的角色，然後請 ChatGPT 根據這個角色的特性來調整其回應。

像是把自己塑造成中二生：
![](https://hackmd.io/_uploads/Synv3BNY3.png)

### Prompt Flipped Interaction Pattern
在大部分情況下，我們問，而 ChatGPT 回答。然而，這個 pattern 的操作方式則是讓 ChatGPT 持續提問，直到它認為它可以回答這個問題為止。

這個 pattern 跟 Prompt Cognitive Verifier Pattern 的差異在於，這個 pattern 中， ChatGPT 會不斷提問直到他有辦法回答，而 Prompt Cognitive Verifier Pattern 則是一開始就給你他想額外知道的細節的答案，知道了這些他就有辦法回答你的問題，兩者稍有不同

比方說請他幫忙診斷網路問題：
![](https://hackmd.io/_uploads/S1D7RrNYn.png)

### Few Shot Example Pattern
Few Shot Example Pattern 是根據之前提到的 LLM 的特性：LLM 會嘗試透過其回答使我們提供的提示變得完整。

在此 pattern 中，我們會給 ChatGPT 許多相似的例子，這些例子有一定的規則可以遵循。換句話說，我們是在用我們訂定的規則來教它，像是：

<img src="https://hackmd.io/_uploads/rJd6ggvK3.png" alt="" height="50%" width="50%">

有了這樣的規則，也可以讓它自由發想：

<img src="https://hackmd.io/_uploads/H1IQZxvth.png" alt="" height="50%" width="50%">

使用這個 pattern 時需要注意，必須給予ChatGPT足夠的資訊量，才能得到我們想要的答案。例如在下面的例子中，如果我們要的是物體的軟硬度，則可以將 "Output" 改為 "surface feeling" 這種字眼，或者給予更多範例讓它知道我們只在乎物體的軟硬度。

<img src="https://hackmd.io/_uploads/SJ89WlPY2.png" alt="" height="50%" width="50%">


### Chain of Thoughts Pattern
這 pattern 可以視為 Few Shot Example Template 的變形，在此 pattern 中，我們會主動提供幾個思考問題的邏輯給 ChatGPT，然後要求它回答另一個問題。

這個 pattern 的用途在於，ChatGPT 有時會回答出一些錯誤的答案（尤其在數學問題方面），如果讓它將中間的思考邏輯表達出來，當它的中間邏輯正確時，最後的答案更可能是正確的。

然而，我個人覺得這個 pattern 似乎較少用武之地。加上現在 ChatGPT 已經被訓練得更聰明，因此很少有需要使用此 pattern 的場合。

提供課程上的 prompt 做為參考:
```
Q: I have four bike racers start a race and travel an average of 30mph. They each race for 2hrs. Is the total number of miles ridden by all riders greater than 200?
A: Reasoning - Each rider will ride 30mph x 2hrs = 60 miles. I have four riders. Therefor, the total number of miles ridden by the ridders is 4 x 60 miles = 240 miles. Answer- Yes

Q: Iam in a space ship without gravity. I have a cup with a needle in it. I move my foot on the bed, knocking over the cup onto the floor. I lift a book up and put it on a desk. Is anything on the floor?
A: Reasoning - <REASONING> Answer - <ANSWER>
```

### ReAct Pattern
ReAct Pattern 可以看作是 Chain of Thoughts Pattern 的一種變形

其使用方式是透過一系列的原因（reason）和行動（action）來讓ChatGPT知道它可以使用外部工具來達成目標。

當它獲得了外部工具提供的資訊後，就可以繼續進行下一步驟。

然而，這種方法通常需要插件 (plugin) 或是透過讓 ChatGPT 使用自己寫的外部程式，才能發揮最大效益。例如，目前很多人在使用的 [LangChain](https://python.langchain.com/docs/get_started/introduction.html) 據我所知就是使用 ReAct pattern 來寫 prompt。

### Gameplay Pattern
使用遊戲來學習通常可以讓學習效率提升，我們也可以利用這點透過 ChatGPT 進行學習。我們可以給 ChatGPT 一個我們想要學習的主題，並請他設計遊戲給我們。

這個 pattern 有點像是前面提到的 Flipped Interaction Pattern 的變形，同樣也是由 ChatGPT 提問，我們來回答，但這次更進一步需要 ChatGPT 幫忙想出一個遊戲跟這個遊戲的規則出來

像是透過 ChatGPT 學習 SQL 語法：
![](https://hackmd.io/_uploads/H1tHiTvK2.png)
![](https://hackmd.io/_uploads/rk9UsaPtn.png)

### Template Pattern
Template Pattern 就是讓 ChatGPT 按照你想要的格式去回答，因此需要主動給他一個 template，請他按照這個格式去回答

通常會給 ChatGPT 一些 placeholders 請他替換掉。但提供 placeholders 的時候要注意最好是有意義的文字，而不是單純的 placeholder

比方說下面這兩個例子
```
### Summary: <ONE SENTENCE SUMMARY>
```
```
### Summary: <OUTPUT>
```
ChatGPT 可以明顯從 ONE SENTENCE SUMMARY 知道他產生的內容被限定在一個句子的長度

像是請他按照我要的格式去寫規劃的行程：
![](https://hackmd.io/_uploads/rJnD1AwFh.png)
![](https://hackmd.io/_uploads/SkAd1CDt3.png)
（為什麼他說的好像去北韓旅遊是一件很普通的事情 XD）

### Metalanguage Creation Pattern
Meta Language 通常被用於特定的交流情境。例如消防員在使用對講機通報情況時，由於狀況緊急，他們可能會使用特定的術語，來簡短且精確地傳達信息。

另一個例子是，我們可能希望用更簡短的方式與 ChatGPT 交流，因此會創造一些新的表達方式。

這個 Pattern 可以用來教 ChatGPT 學習和理解這些特定的表達方式。這個 pattern 與 Few-Shot Example Pattern 類似，因為它也是通過提供一些範例，讓 LLM 學習和理解新的規則

範例：做出另一個表達旅遊地點跟天數的語法

![](https://hackmd.io/_uploads/HyD7NAwt2.png)
![](https://hackmd.io/_uploads/SJ4NV0wtn.png)

### Recipe Pattern
有時候我們知道一個問題的部分答案，這時候可以給 ChatGPT 知道的資訊，要求他把這些資訊拼湊出來變成完整的答案，這樣的方式即 Recipe Pattern

下面的範例中，我只知道我開車的起點跟終點，還有必須經過哪些中繼站，加上必須達成的條件，請他規劃完整的旅程：
![](https://hackmd.io/_uploads/rkTJUAvt2.png)

### Prompt Alternative Approaches Pattern
我們可以請 ChatGPT 提供多種不同方法或策略。這可以幫助我們思考，並可能找到最好的解決方案，就像有人在幫忙做 brain strom 一樣。

像是可以利用這個 pattern 來幫忙想出更好的 prompt:
![](https://hackmd.io/_uploads/HkV2oCPKn.png)
![](https://hackmd.io/_uploads/SyvajCvK2.png)

### Ask for input pattern
這個 pattern 與其說是 pattern 更像是一個小技巧

我們有時候會遇到一種情況：只想讓 ChatGPT 聽完描述，而不做任何回應。但通常 ChatGPT 會過於主動，產生了一些我們不需要的內容。為了解決這種情況，我們可以利用 Ask for Input Pattern 來控制他的行為。

具體來說，我們只需要在 Prompt 最後加上 `Ask me for the first task/question` 就可以達到目的

以上一個例子來改寫的話，就會像下面這樣：
```
For every prompt I give you, If there are alternative ways to word a prompt that I give you, list the best alternate wordings . Compare/contrast the pros and cons of each wording.

Ask me for the first prompt
```

### Prompt Outline Expansion pattern
這個 pattern 主要適用於需要寫文章、書籍或簡報大綱的時候。

我們可以提供需要介紹的主題，然後讓 ChatGPT 來構思大綱。接著，又可以要求 ChatGPT 對其中幾點產生具體的內容。

如果對 ChatGPT 生成的大綱不滿意，也可以自己修改過後，請他針對新版本的內容更新細節

可能有人會問，為什麼不直接讓 ChatGPT 生成所有內容再進行總結？

主要是因為 ChatGPT 仍然存在輸入和輸出的限制。它無法直接一次輸出一本書的內容，同樣也不能一次處理超過太大量的文字內容。因此，我們需要一種方法來分段處理，但同時又能將所有的片段組合在一起。

如果今天我想做一個介紹 Kubernetes 的簡報，我可能會這樣做：
![](https://hackmd.io/_uploads/Bys_gyOF3.png)
![](https://hackmd.io/_uploads/ByqKxJuFn.png)
![](https://hackmd.io/_uploads/r12qe1dK2.png)

### Menus Actions Pattern
當我們需要重複 prompt 某一段話，來讓 ChatGPT 執行特定行為的話，可以考慮使用 Menu Action Pattern。這個 Pattern 將常用的 prompt 轉變成一種術語，將 ChatGPT 塑造成一個能理解這些術語的程式。

除此之外，如果要打造自動客服系統，我們可以把 Menu Actions Pattern 放置在 Root Prompt。比起讓客戶自由發問，限制客戶的問題必須在這些選項內可能會更能達到我們想要的效果，並提供更精確的回答。

這個 pattern 有點像是前面提到的 Prompt meta language creation pattern，目的都是要讓 ChatGPT 理解某種術語

比方說可以把 ChatGPT 塑造成一個管理 todo list 的小程式：
![](https://hackmd.io/_uploads/By6sfydF3.png)
![](https://hackmd.io/_uploads/HkMAzJdt3.png)

### Fact Check Pattern
ChatGPT 常被詬病的回答的答案不正確。但實際上 ChatGPT 的主要功能是生成文字，因此，對於其回答的正確性，我們或許不能過於苛求。

儘管如此，我們有一種工具可以用來輔助我們的判斷，就是 Fact Check Pattern

這個 pattern 的概念是：我們讓 ChatGPT 生成內容時，我們也可以同時要求它列出這個回答是基於哪些事實或資訊來給出的。

如果我們檢查這些內容，並發現其中有錯誤的論述，那麼上述生成的內容很可能是錯誤的。

這些論述可以被視為我們需要至少驗證的事實。更重要的是，這種模式可以幫助我們進入一個思考內容正確性的模式。如果我們更謹慎對比這些論述和內容，雖然可能仍然難以避免某些錯誤，但可以降低錯誤發生的機率。

以下面的例子來說，我就可以果斷判斷上面的內容不需要理解，因為第五點就明顯跟官方文件提到的不吻合：

![](https://hackmd.io/_uploads/SJBX8JOYh.png)
![](https://hackmd.io/_uploads/HkEELJ_F3.png)
![](https://hackmd.io/_uploads/rJ648JOFn.png)

### Tail Generation Pattern
當在設定一個規則的前提下與 ChatGPT 溝通，隨著對話內容增加，ChatGPT 有時會忘記一開始設定的規則。

這時 Tail Generation Pattern 就非常適合使用，簡單來說，就是讓 ChatGPT 在回答的最後復述一次這個條件或提醒他不要忘記的事項。

因為 ChatGPT 不斷提醒自己這些規則，有助於確保他會持續遵循這些指示

以前面 Outline Expander Pattern 的例子做說明，可以像這樣修改  prompt:
```
Act as an outline expander. Generate a bullet point outline based on the input that I give you and then ask me for which bullet point you should expand on. Create a new outline for the bullet point that I select.
At the end, ask me for what bullet point to expand next. Ask me for what to outline.
```

### Semantic Filter Pattern
我們可以利用 LLM 的語言分析能力，從一段內容中提取我們需要的資訊，或將不需要的資訊剔除。

比方說，當提供一段資料時，我們希望能將可能識別出某人身份的敏感資訊移除：
```
Filter the following information to remove any personally identifying information or information that could potentially be used to re-identify the person.
```
