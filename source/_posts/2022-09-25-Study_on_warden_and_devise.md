---
title: "How Gem Warden Works"
catalog: true
toc_nav_num: true
date: 2022-9-25 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1613264520739-c2eb038e8404?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80"
tags:
- Ruby
- Rails
catagories:
- Ruby
updateDate: 2022-9-25 22:26:24
# top: 0
description: How Gem Warden Works
---

前一陣子稍微研究了一下 Ruby 裡面的 middleware 用法 / 寫法，雖然後來沒有把應用放在 middleware，但也因此比較深入瞭解了一些，也想找個更著名的 gem 來看看如何應用，這時候我想到了 devise

devise 的核心是另一個叫做 warden 的 gem，如果說 devise 是一台車，那 warden 好比這台車的引擎，但 warden 是一個 middleware，他要怎麼利用 Rails 裡面的 model 來做 validation? 這引起我的好奇心，所以有了這篇文章的誕生～

那就來看看 warden 做了什麼吧！

## Outline
- [How To Setup](#how-to-setup)
- [Handle Failure](#handle-failure)
- [Authenticate](#authenticate)
- [How to maintain user in session](#how-to-maintain-user-in-session)
- [How Devise Make Use of Warden](#how-devise-make-use-of-warden)
- [Why](#why)
- [Conclusion](#conclusion)
- [References](#references)

## How To Setup

從 [wiki](https://github.com/wardencommunity/warden/wiki/Setup) 可以看 warden 怎麼設定
```ruby
config.middleware.use Warden::Manager do |manager|
  manager.default_strategies :password
  # 之後行為變複雜的話，可以考慮學 devise 替換成 callable object
  manager.failure_app = proc { |_env|
    ['401', { 'Content-Type' => 'application/json' }, { message: 'Unauthorized', status: 'unauthorized' }.to_json]
  }
end
```

這邊的 default startegy 是怎麼去做驗證，而 failure_app 則是驗證失敗的話要做什麼事情

首先來看他怎麼連結到處理失敗的 case

## Handle Failure
從前面設定的地方可以看到 middleware 放的是 Warden::Manager，所以他本身需要有 `call` 這個 method

source code 有滿多細節處理，我大幅簡化留下好理解的部分
```ruby
module Warden
  class Manager
    def call(env)
      env['warden'] = Proxy.new(env, self) # 把 proxy 藉由 env 傳到下個 middleware
      @app.call(env) # call app

      # 拿到 app 回來的 response，加工回去接下來的 middleware
      case result
      when Array
        handle_chain_result(result.first, result, env)
      when Hash
        process_unauthenticated(env, result) # 這裡處理驗證失敗的 case
      when Rack::Response
        handle_chain_result(result.status, result, env)
      end
    end

    def process_unauthenticated(env, options={})
      # ...
      call_failure_app(env, options)
    end

    def call_failure_app(env, options = {})
      if config.failure_app
        # ...
        config.failure_app.call(env).to_a # call 設定好的 failure app
      else
        raise "No Failure App provided"
      end
    end
  end
end
```
從上面的 code 可以知道， failure_app 呼叫的地方不是 app 驗證的時候，而是 app call 完之後，當 response 回到 warden 這一層，才會去做處理

具象化的話會像是這張圖：
![](https://i.imgur.com/br7He8c.png)

## Authenticate
前面設定的地方有設定一個 default_strategies，我們來看看 warden 裡面怎麼把它連結到驗證流程

```ruby
module Warden
  class Proxy
    def authenticate!(*args)
      user, opts = _perform_authentication(*args)
      throw(:warden, opts) unless user
      user
    end

    def _perform_authentication(*args)
      _run_strategies_for(scope, args)

      if winning_strategy && winning_strategy.successful?
        set_user(winning_strategy.user, opts.merge!(:event => :authentication)) # 驗證成功寫進 session
      end

      [@users[scope], opts]
    end

    def _run_strategies_for(scope, args)
      strategies = defaults[scope] || defaults[:_all]

      (strategies || args).each do |name|
        strategy = _fetch_strategy(name, scope) # 不同 scope 可以對應不同 strategy
        next unless strategy && !strategy.performed? && strategy.valid?

        strategy._run!  # 用 strategy 做驗證
        break if strategy.halted?
      end
    end
  end
end
```
其中有幾點我覺得滿重要的
1. warden 可以設定不同的 scope，像是一般 user 跟 admin 的驗證流程可能不同，我們可以為他們設定不同的 strategy
2. 驗證的 method 是寫在 Warden::Proxy 裡面，而他是藉由 env 傳下去的，所以驗證的過程可以不用一定在自己的 app 裡面完成，也可以在其他層的 middleware

warden 是靠 session 維持 user 資訊的，那這部分的 code 在哪裡呢？

## How to maintain user in session
其實這是前面 set_user 這個 method 裡面做掉的事情

```ruby
module Warden
  class Proxy
    def set_user(user, opts = {})
      @users[scope] = user
      # ...
      session_serializer.store(user, scope)
      # ...
      @users[scope]
    end
  end
end

module Warden
  class SessionSerializer
  # ...
    def store(user, scope)
      return unless user
      method_name = "#{scope}_serialize"
      specialized = respond_to?(method_name)
      session[key_for(scope)] = specialized ? send(method_name, user) : serialize(user)
    end

    def session
      env["rack.session"] || {} # rack 的 convention，從這裡拿到 session 的資訊
    end
  # ...
  end
end
```
在 session 這邊也保留了彈性，沒有指定 session 一定要存在哪裡，而是藉由 rack app 的 convention 來拿 session 的儲存資訊，有可能是 cookie / database / cache ...etc

## How Devise Make Use of Warden
理解了這些之後，看看 Devise 是怎麼做的吧

因為是用 warden 做驗證，所以如果去看 devise session controller 會覺得看起來跟想像中的不太一樣

```ruby
class Devise::SessionsController < DeviseController
  # ...

  # POST /resource/sign_in
  def create
    self.resource = warden.authenticate!(auth_options)
    set_flash_message!(:notice, :signed_in)
    sign_in(resource_name, resource)
    yield resource if block_given?
    respond_with resource, location: after_sign_in_path_for(resource)
  end
  # ...
  def auth_options
    { scope: resource_name, recall: "#{controller_path}#new" }
  end
  # ...
end
```
一般來說，這裡驗證吃的參數應該是 params 裡面的 username / password，但這不是 auth_options 裡面的內容

這是因為細節都寫在 strategy 裡面了，驗證失敗的情況也是在 warden 那層處理，所以這裡都不用做這些事情

先回到這段 code 的其他地方，其中的 warden / sign_in 又是怎麼實作？

```ruby
  def warden
    request.env['warden'] or raise MissingWarden
  end

  def sign_in(resource_or_scope, *args)
    # ...
    warden.set_user(resource, options.merge!(scope: scope))
  end
end
```
這裡的 env 不是我們一般熟知的環境變數，而是 middleware 一路傳下去的參數

也就是說前面 warden 這個 middleware 透過 env 把 rails 這一層需要用來驗證的物件傳過來，如果去看這物件的內容會是 Warden::Proxy 的物件

而 sign_in 背後的實作也是靠同一個物件的 set_user method，從前面的 code 可以知道，這一段就是把 user 寫進 proxy 的 instance variable 跟 session 裡面

接著看看 devise 的 strategy 設定

這在 devise 裡面比較難找一點點，因為命名的關係不太好認

```ruby
module Devise
  module Strategies
    class Base < ::Warden::Strategies::Base
    end
  end
end

module Devise
  module Strategies
    class Authenticatable < Base
      # 從 params 裡面拿需要的 attributes
      def http_auth_hash
        keys = [http_authentication_key, :password]
        Hash[*keys.zip(decode_credentials).flatten]
      end
    end
  end
end

module Devise
  module Strategies
    class DatabaseAuthenticatable < Authenticatable
      def authenticate!
        # ...
        if validate(resource){ hashed = true; resource.valid_password?(password) }
          success!(resource)
        end
          fail(:not_found_in_database)
        end
      end
    end
  end
end

Warden::Strategies.add(:database_authenticatable, Devise::Strategies::DatabaseAuthenticatable)
```

可以看到要怎麼拿 param 都是寫在 strategy 裡面，另外 devise 也針對 error handeling 寫了很複雜的 failure_app，這邊就不去深究

## Why
看了 warden 跟 devise 的這些 code 之後，我開始想搭配 warden 來做驗證有什麼好處

一般使用的情境應該是像下面這張圖：
![](https://i.imgur.com/br7He8c.png)

通常 `authenticate!` 這個 method 是在 web app 這層執行的，而且通常也不能在其他層執行，為什麼呢？

如果這個 strategy 裡面有寫到 `User.authenticate(email, password)` 這樣的 code，在其他非 web app 的 middleware 並沒有 User 這個 constant，是無法做驗證的

反過來說，其實我們也可以用 warden 做到在其他的 middleware 做驗證，像是有些情境會需要用 header 裡面的 token 做驗證，像是這樣
![](https://i.imgur.com/8m5rysv.png)

## Conclusion
透過去看 devise / warden 的實作，更了解 middleware 的運作機制了，也覺得從別人的實作裡面可以看到很多不同的思考邏輯挺有趣的

其中包括我一開始的一個問題

> warden 是一個 middleware，他要怎麼利用 Rails 裡面的 model 來做 validation?

而 warden 利用了 Ruby 動態語言的特性，先把 proxy 裡面的 authenticate! method 包起來，用 env 傳到需要做驗證的那一層，只要在那一層可以成功執行就好

雖然只是一個小巧思，但這是我在看 code 之前沒想到過的答案，真的是有越寫 code 越覺得懂的很少的感覺 Orz

## References
[Warden](https://github.com/wardencommunity/warden)
[Devise](https://github.com/heartcombo/devise)
