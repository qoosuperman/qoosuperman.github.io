---
title: "Notes for Inside Rails in 2019 RailsConf"
catalog: true
toc_nav_num: true
date: 2022-9-19 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1495573258723-2c7be7a646ce?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1771&q=80"
tags:
- Ruby
- Rails
catagories:
- Ruby
updateDate: 2022-9-19 22:26:24
# top: 0
description: Notes for Inside Rails in 2019 RailsConf
---

最近才看到三年前的一段影片在講 Rails 的 request 怎麼跑進 controller 的，看完覺得以前都只有模糊的印象，沒有辦法把他們完全接在一起，因此做個筆記記錄一下

- [Intro](#intro)
- [Into Web Server](#into-web-server)
- [Rack](#rack)
- [Conventions for Rack App](#conventions-for-rack-app)
- [Rails](#rails)
- [Thoughts](#thoughts)
- [References](#references)

## Intro
我們可能都寫過這樣的 code
```ruby
class HelloController < ActionController::Base
  def index
    render plain: 'Hi!'
  end
end
```
但 request 是怎麼到達 controller 裡面的？ 今天就是主要解釋這部分

## Into Web Server

瀏覽器端，從 cache / dns server 那邊知道 ip address 之後再送出 request，接著會抵達 web server

這些 web server 的工作是要去解析 request，知道怎麼去服務每個 request，像是 /assets/ 應該要對應到某個資料夾下面的靜態檔案，哪些網址要給他 404 頁面

這些 web server 可能是用任何語言寫的，可能是 ruby / C

至於更複雜的頁面，像是要去 database 做搜尋，要做一些動畫，這些複雜的事情就需要給更強大的 app server 處理，Rails 就是其中的一種選擇

## Rack
但 Rails 跟 web server 怎麼溝通的？在 Ruby 裡面有一套機制叫做 Rack 的 Ruby protocol 就是由此而生

如果把這個 protocol 想像成是人在溝通，會像是這樣：
![](https://i.imgur.com/B1SZmtC.png)

在 Ruby 裡面，看起來像是這樣
![](https://i.imgur.com/hHLNvjk.png)

> 跟圖上面的不同，body 其實需要是一個 eachable 的 object，是一個可以迭代的物件

所以其實 Rack 就只是大家同意的一個 protocol 而已


## Conventions for Rack App
web server 會準備一個 hash(env hash) 給 app server，其中最重要的一條 convention 就是你的 app server 需要有一個 call 的方法可以呼叫

一般來說為了讓 app 可以正常運作，我們需要跑 nginx / apach 這種 web server 起來接收 request，但 Ruby 有內建的 script 可以用 `rackup`，他會去找 config.ru 這個檔案

```ruby
# app.rb
class HelloWorld
  def call(env)
    [200, {'Content-Type' => 'text/plain'}, ['Hello World']]
  end
end

# config.ru

require_relative 'app'
run HelloWorld.new
```

但隨著行為變複雜，我們可能想再這個 app 前面做一些處理，比方說為了有 Redirect 的功能，我在 app server 外面再包一層 Redirect 的 middleware

```ruby
class Redirect
  def initialize(app, from:, to:)
    @app = app
    @from = from
    @to = to
  end

  def call(env)
    if env['PATH_INFO'] == @from
      [301, {'Location' => @to}, []]
    else
      @app.call @env
    end
  end
end

# app.rb
class HelloWorld
  def call(env)
    if env["PATH_INFO"] == 'hello'
      [200, {'Content-Type' => 'text/plain'}, ['Hello World']]
    else
      [404, {'Content-Type' => 'text/plain'}, ['Not Found']]
    end
  end
end
```

這時候我們可能會這樣寫
```ruby
# config.ru

require_relative 'app'
run Redirect.new(
  HelloWorld.new,
  from: '/',
  to: '/hello'
)
```

而又有一個特殊的 DSL 可以用在這裡

```ruby
# config.ru

use Redirect, from: '/', to: '/hello'
run HelloWorld.new
```

這裡需要特別注意執行順序，request => Redirect => HelloWorld => Redirect

備註：
從龍哥的 [文章](https://railsbook.tw/extra/rack) 可以更清楚知道他們的執行順序：

![](https://i.imgur.com/xf0PaRM.png)
![](https://i.imgur.com/LeqA5Q4.png)

## Rails
那在 Rails 裡面又是什麼情況？

我們可以看到 Rails 裡面有 config.ru

```ruby
require ::File.expand_path('config/environment', __dir__)
run Rails.application
```

所以不管 Rails.application 是什麼，他一定是一個 Rack app，所以可以測試看看

```
> rails c
> env = Rack::MockRequest.env_for('http:localhost:3000/posts/1')
> Rails.application.call(env)
```

而在 Rails 裡面如果要拿掉 middleware 是用其他方法

```ruby
module My
  class Application < Rails::Application
    config.middleware.delete ActionDispatch::Cookies
  end
end
```

如果看 rails 的 middleware 會發現最後一個是 routes，所以 routes 也是一個 rack app

```ruby
> rails middleware
run HahowForBusiness::Application.routes
```

所以可用前面一樣的方式來跑跑看
```
> rails c
> env = Rack::MockRequest.env_for('http:localhost:3000/posts/1')
> HahowForBusiness::Application.routes.call(env)
```

這個 routes 的 rack app 的作用就是把 request 導向正確的 controller

```ruby
Rails.application.routes.draw do
  get '/posts' => 'posts#index'
end
```

如果把 routes 的 call 展開會像是：
```ruby
class MyRoutes
  def call(env)
    verb = env['REQUEST_METHOD']
    path = env['PATH_INFO']

    if verb =='GET' && path == '/posts'
      PostsController.action(:index).call(env)
    else
      [404, {...}, ['Not Found']]
    end
  end
end
```

就是從上面透過 config/routes.rb 的設定進入到 controller 裡面

## Thoughts

透過這個短短的 talk 讓我對於一些基礎知識更加根深蒂固，另外也終於慢慢覺得 Ruby 的黑魔法總算是一層一層的撥開面紗了，希望可以有更多這種 talk 或者未來自己有能力可以給出這種 talk!

## References
[Video](https://www.youtube.com/watch?v=eK_JVdWOssI)
[龍哥的文章](https://railsbook.tw/extra/rack)