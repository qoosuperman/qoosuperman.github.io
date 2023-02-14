---
title: "Synopsis of Rebuilding Rails"
catalog: true
toc_nav_num: true
date: 2023-02-13 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1615746360032-1ecf87f250fb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2201&q=80"
tags:
- Ruby
- Rails
catagories:
- Rails
updateDate: 2023-02-13 22:26:24
# top: 0
description: Synopsis of Rebuilding Rails
---

看了 Rebuilding Rails 這本書，內容沒有想像中豐富，但裡面會教你從頭做一個非常陽春版本的 Rails 出來（書裡面叫他 Rulers），從頭寫一個 gem 出來相較比較少人在講，所以覺得滿實用的，只是因為之前自己有稍微研究過所以滿多已經知道的內容，這篇就只稍微紀錄一下小知識跟延伸閱讀

### LOAD_PATH
在 gem 裡面可以多善用 `$LOAD_PATH` 這個全域變數，比方說在 test helper 裡面我們這樣寫：

```ruby
$LOAD_PATH.unshift(File.expand_path('../../lib', __FILE__))
# 如果這個檔案是 /Users/anthonychao/Desktop/test.rb
# 結果會是 /Users/anthonychao/lib
```
把當下這個 gem 的 lib 資料夾放在 load path 最前面，這樣可以保證 local 的 code 可以最先被讀到，如果你已經安裝了另一個版本的 gem，這樣做還是可以保證 local 的 code 先被讀到

### gem 會按照 gemspec 裡面的 files 設定去 build 檔案

gemspec 裡面 files 的 default 設定是會去看 git 裡面有哪些檔案去 build
```ruby
# rulers.gemspec
  spec.files         = Dir.chdir(File.expand_path('..', __FILE__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  end
```
也因此最好把 build 出來的 binary 放到 gitignore 裡面，否則如果不小心放到 git 裡面會一直出現錯誤
```ruby
# .gitignore
rulers-*.gem
```

### 可以在 Gemfile 指定 path

如果要開發 gem，可以在 Gemfile 指定 path，但這麼做之後都需要搭配 bundle exec 來使用，否則可能會找不到 gem 或者用到舊版本
```Gemfile
gem "rulers", path: '../rulers'
```

### Unix 系統的指令小技巧
```ruby
bundle exec rerun -- rackup -p 3001
```
其中 `--` 這個是 UNIX 的一個小技巧，代表 -- 之後的參數前面的指令都不能用，如果沒有這個 `--` 則 -p 這個參數會被 rerun 拿去使用

### 使用 method_missing 的時候也要搭配 respond_to_missing? 使用
其實如果只去改寫 method_missing 的話還是可以正常操作的，但某些行為上會比較無法預期

像是下面這樣
```ruby
class StereoPlayer
  def method_missing(method, *args, &block)
    if method.to_s =~ /play_(\w+)/
      puts "Here's #{$1}"
    else
      super
    end
  end
end

p = StereoPlayer.new
# ok:
p.play_some_Beethoven # => "Here's some_Beethoven"
# not very polite:
p.respond_to? :play_some_Beethoven # => false
```

在 Ruby1.9.2 之後提供了 respond_to_missing? 這個 method，可以讓這些從 method_missing 產生的 method 更像一般的 method
```ruby
class StereoPlayer
  # def method_missing ...
  #   ...
  # end

  def respond_to_missing?(method, *)
    method =~ /play_(\w+)/ || super
  end
end

p = StereoPlayer.new
p.play_some_Beethoven # => "Here's some_Beethoven"
p.respond_to? :play_some_Beethoven # => true
m = p.method(:play_some_Beethoven) # => #<Method: StereoPlayer#play_some_Beethoven>
# m acts like any other method:
m.call # => "Here's some_Beethoven"
m == p.method(:play_some_Beethoven) # => true
m.name # => :play_some_Beethoven
```

可以配合這篇 [文章](http://blog.marc-andre.ca/2010/11/15/methodmissing-politely/) 一起服用

### 啟動 irb 的時候加上 -r 參數就會自動 require
```ruby
bundle exec irb -r rulers
```

### Rails Routing
現在要仿效 Rails Router 的方式來做，概念上像是 [這篇文章](https://medium.com/rubyinside/a-deep-dive-into-routing-and-controller-dispatch-in-rails-8bf58c2cf3b5) 裡面這張圖

![](https://i.imgur.com/iJWa1Qr.png)

在簡單的實作中不會有後面 Journey 那一段，request 進來之後會先給 middleware 處理，接著轉交給我們的 app 特定的 controller / action 處理之後傳回 response

如果要大概知道 Journey 運作的概念可以看這個 [影片](https://www.youtube.com/watch?v=lEC-QoZeBkM&t=549s)，我下面擷取出一些我認為比較重要的概念

實際上我們的每一個 controller + action 都是 rack app 的端點，所以其實我們可以這樣做：

```ruby
Rails.application.routes.draw do
  root { [200, {}, ['this works!']] }
end
```

而在 Rails 的眾多 middleware 中，最後一個就是 routes，當他匹配到對應的 controller + action，就會發包出去處理

```ruby
> rails middleware
...
run MyApp::Application.routes # 最後一層 middleware
```

Journey 的 routing 並不是簡單的很多 regular expression 一個一個對照，畢竟這樣會造成時間複雜度 O(n) 的成長

Journey 做的事情跟郵局有點像，郵局依靠地址一步一步縮小範圍最後指定到某個信箱，Journey 把 url 變成一段一段的 token (tokenize) 之後，一步一步去縮小範圍找到最後的端點，更詳細的介紹推薦看影片~
