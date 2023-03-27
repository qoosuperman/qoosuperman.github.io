---
title: "Steps to Upgrade Rails"
catalog: true
toc_nav_num: true
date: 2023-03-27 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1608283833336-5fb6f919e5ea?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1548&q=80"
tags:
- Ruby
- Rails
catagories:
- Rails
updateDate: 2023-03-27 22:26:24
# top: 0
description: Steps to Upgrade Rails
---

前陣子升級了公司專案的 Rails 版本到，寫個文章記錄

升級 Rails 的步驟可以參考社群給的 [Guide](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html)

升級前最低要求：test coverage 要完整，否則根本不知道上線之後哪裡會爆掉，而且可能很多小細節是 QA 測不出來的

## Step1: Update Rails version

因為相伴隨有很多 dependencies 所以無法單純用 `bundle update rails`，要找到相對應所有會卡 dependency 的 gem 來一起做升級

ex.
```bash
bundle update rails actionpack actionview activemodel activerecord activesupport railties sprockets thor bundler-audit
```

## Step2: Update Rails version

升級完之後，可以跑一個 rake 幫忙產生需要的檔案
```
rails app:update
```

他主要會產生 `config/initializers/new_framework_defaults_X.Y.rb` 這樣的一個檔案，並把一些你會需要自己設定的參數放在檔案中，這時候就要了解每個參數的意義再去設定成你要的值

我們的作法是最後拔除這個檔案，把需要 overwrite 的設定放回 `config/application.rb` 或者 `config/environments/<environment>.rb` 裡面，如果是符合新版本的預設設定就不特別寫

另外這個 rake 也可能不只產生這個檔案，像是我這次升級 Rails6.1，ActiveStorage 就有一個相關的 migration 需要執行，他也會自動生成 migration 檔案

## Step3: Fix tests

開始修 spec 通常才是最花時間的地方，以下列出一些在這次升級時遇到的一些問題

### Issues
1. 一些 gem 也需要跟著升級，但 dependency 沒有更新到，包括[cancancan 需要升級](https://github.com/CanCanCommunity/cancancan/issues/666), [paper trail 需要升級](https://github.com/paper-trail-gem/paper_trail#1a-compatibility)
2. [meta request 這個 gem 造成 stack level too deep](https://github.com/dejan/rails_panel/pull/177#issuecomment-797378347)，因為這個 gem 提供的功能目前團隊內沒有人使用因此直接拔除
3. 有個 action text 相關的 controller spec 升級後過不了，結果改成 request spec 就過了，可能是跟 [這個](https://github.com/rails/rails/pull/40222) 有關
4. Rails6.1 在 error message 處理的改動比較多，所以需要修改滿多地方的，詳細可看 [這篇](https://code.lulalala.com/2020/0531-1013.html)
5. 隨著 Multi Tenant 架構的調整
6. 搭配 Apartment gem 的使用，造成偵測到 rails_admin 的 source code 有 sql injection，需要用 patch 去改 rails_admin 的 source code