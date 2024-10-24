---
title: "Rails Turbo 學習心得"
catalog: true
toc_nav_num: true
date: 2024-10-24 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1467663906983-81383d4802ef?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
tags:
  - Rails
catagories:
  - Rails
updateDate: 2024-10-24 22:26:24
# top: 0
og_image: "https://images.unsplash.com/photo-1467663906983-81383d4802ef?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
description: Rails Turbo 學習心得
---

## 前言

![rails turbo](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*8JQp6XIth7EpK6KsWxLkKA.png)

最近準備要做個小小的 side project

快要做到前端的時候想到自己其實還不會用目前 Rails 生態系推薦的 Hotwire 系列工具，因此這兩週就花了些時間研究了一下（如果要學的話推薦學習資源放在最下面）

以下記錄一下重點跟使用心得

## Hotwire

Hotwire 指的是 `HTML over the wire`，與傳統 JavaScript 透過 API 獲取 JSON 資料並處理的方式不同，Hotwire 是直接通過 API 獲取 HTML，然後將其渲染在頁面上。

它包含三個主要框架：
  * **Turbo：** 負責處理頁面導航和更新，透過伺服器傳送 HTML 來動態更新頁面，並加速連結和表單提交，只更新需要的部分，避免整頁重新載入。
  * **Stimulus：** 用於處理需要用戶端互動的場景，是一個輕量級的 JavaScript 框架。
  * **Strada：** 用於將網頁互動升級到原生應用程式。

在 Rails 中，他認為大部分情境下開發者會使用 Turbo，真的需要寫 Javascript 的時候寫 Stimulus JS，要寫手機作業系統的時候才會用到 strada。

這篇文章主要在研究 Turbo 的使用方式。

## Turbo

Turbo 又分成三個部分
* **Turbo Drive**: 是 Turbo 的核心，它透過攔截連結點擊和表單提交，在背景執行要做的事情來更新頁面，無需整頁重載
* **Turbo Frame**: 把頁面拆成多個部分，點擊連結或者送出表單之後，只有特定區域的地方會做更新
* **Turbo Streams**: 透過 WebSocket、SSE（Server-Sent Events） 或表單提交傳遞 HTML 片段來更新頁面

### Turbo Drive
Turbo Drive 前一代的祖先是 Turbolink，但那時候只有處理連結，現在 Turbo Drive 額外支援表單的請求

Turbo Drive 做了幾件事情：
1. 防止瀏覽器跟隨連結
2. 使用歷史紀錄 API 更改瀏覽器 URL
3. 使用 fetch 請求獲取新頁面
4. 通過替換當前 `<body>` 元素和合併 `<head>` 元素的內容來渲染回應的 HTML

當只替換 <body> 內容時，<head> 標籤內的內容通常不會變動，因此不需要重新下載字體、CSS、JS 等文件，這能加快頁面渲染速度。

然而，當 JS 或 CSS 發生變動時，我們希望能重新載入整個頁面。Turbo Drive 會在每次新請求時，對比當前頁面與回應頁面中 <head> 內標記為 data-turbo-track="reload" 的 DOM 元素，若發現差異就會重新載入頁面。

所以我們可以看到目前在 Rails layout 中，css / js 都加上了這個屬性

```html
<%# app/views/layouts/application.html.erb %>

<%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
<%= javascript_include_tag "application", "data-turbo-track": "reload", defer: true %>
```

### Turbo Frame

它透過替換具有相同 ID 的 `<turbo-frame>` 標籤內容來更新頁面。

已下面的範例程式碼來說

_task.html.erb 完全被 turbo frame tag 包住，所以如果點擊 `Edit` 按鈕會全部被替換掉，而替換的內容就是 edit.html.erb 頁面中有著同樣 id 的 turbo frame tag 的部分

<details>
  <summary>範例程式碼</summary>

```html
%% index.html.erb %%
<div id="tasks">
  <h1 class="font-bold text-lg mb-7">Tasks</h1>

  <div class="px-5" data-controller="tasks">
    <%= render @tasks %>
  </div>
</div>
```
```html
%% _task.html.erb %%
<turbo-frame id="<%= dom_id task %>" class="block">
  <div class="block mb-2">
    <%= form_with(model: task, class:"text-lg inline-block my-3 w-72") do |form| %>
      <%= task.description %>
    <% end %>

    <%= link_to "Edit", edit_task_path(task),
                class: "btn bg-gray-100"
    %>
    <div class="inline-block ml-2">
      <%= button_to "Delete", task_path(task),
                    method: :delete,
                    data: { "turbo-frame": "_top" },
                    class: "btn bg-red-100" %>
    </div>
  </div>
</turbo-frame>
```
```html
%% edit.html.erb %%
<div>
  <h1 class="font-bold text-2xl mb-3">Editing Task</h1>

  <turbo-frame id="<%= dom_id @task %>">
    <%= render "form", task: @task %>
    <%= link_to "Never Mind", tasks_path, class: "btn mb-3 bg-gray-100" %>
  </turbo-frame>
</div>
```
</details>

另外若要替換整個頁面，可以使用 `data-turbo-frame="_top"` 屬性。

通常點擊連結之後，會跟包覆著連結的 turbo frame tag 互動，但也可以指定不是包覆這連結的 frame，這時候可以用 `data: { turbo_frame: ...}` 這個屬性

<details>
  <summary>範例程式碼</summary>

```html
<main class="container">
  <div class="header">
    <div>
      <h1 class="font-bold text-2xl inline-block">Quotes</h1>
      <%= link_to "New quote",
                  new_quote_path,
                  class: "btn btn--primary",
                  data: { turbo_frame: dom_id(Quote.new) } %>
    </div>
  </div>

  <div class="mt-4">
    <%= turbo_frame_tag Quote.new %>
    <%= render @quotes %>
  </div>
</main>
```
</details>

### Turbo Stream
Turbo Stream 可以將 HTML 片段發送到頁面上，替換或修改現有內容。它專門用於在單次請求中更新頁面多個部分的情況。

跟 turbo frame 的差異有幾點
1. Turbo frame 一次只能替換已經存在的 frame，不能做 append / prepend 的動作
2. Turbo stream 還可以用 websocket 來更新頁面（當然也可以用 POST request 來更新）

turbo stream 的核心也是靠 HTML snippet 來實現，但跟 turbo frame 不同，turbo stream tag 中一定包含一個 action，所有的 action 都需要一個 target 來指定對象（只有 refresh 這個 action 不需要）

這是 turbo stream tag 在 HTML 中的長相：
```html
<turbo-stream action="action_to_take" target="element_to_update">
  <template>
    <div id="element_to_update">
      <!-- Some more html -->
    </div>
  </template>
</turbo-stream>
```

這裡的實現比較複雜一些，推薦要看使用範例的話直接看 [Turbo Rails Tutorial](https://www.hotrails.dev/turbo-rails) 裡面有滿多的範例

## 心得
總算是大致上理解了這套系統如何使用，但在好不容易理解完後，我應該只會在小專案嘗試使用 Turbo

因為在複雜專案中，前端效果經常是巢狀結構，而要使用 Turbo 處理這種巢狀效果的話想向上維護起來有點困難

此外，複雜專案中常需重複使用同樣的元件，因此以 component-based 的前端框架會更容易維護

## References
[Hotwire Crash-Course](https://courses.writesoftwarewell.com/p/hotwire-handbook)
[Turbo Rails Tutorial](https://www.hotrails.dev/turbo-rails)
[卡米哥 demo](https://www.youtube.com/watch?v=ZEZY_tKNjMo)
[Turbo 官方文件](https://turbo.hotwired.dev/handbook/introduction)