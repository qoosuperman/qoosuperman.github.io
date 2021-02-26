---
title: "Rails Cache Basic Introduction"
catalog: true
toc_nav_num: true
date: 2021-02-25 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1606874136628-58da356227e9?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
tags:
- Rails
- Cache
catagories:
- Rails
updateDate: 2021-02-25 22:26:24
# top: 1

---
[Introduction](#introduction)
[Normal cache](#normal-cache)
[Fragment cache](#fragment-cache)
[Variable cache](#variable-cache)

---
# Introduction
## Types

Rails 的 cache 可以有三種形式存在

1. File (FileStore，為 Rails production 環境預設 cache 方式)
2. Process (MemoryStore)
3. 第三方服務

- 存 file:

Rails 的預設 Cache 會存在檔案裡面，也就是以第一種形式存在，這樣有什麼壞處呢？其實快取就是要快，但如果要存成檔案的話，可能會甚至比去資料庫讀取還慢，就失去了快取應該有的價值

- 存 process:

存 process 的壞處是今天萬一 process 停掉，資料也都會不見

不只如此，原本每一個 process 都佔有自己的記憶體空間，都會有自己的 cache，但其實每個 cache 存的東西都會一樣，因此這樣就浪費了記憶體，同時如果要清除快取也需要把每個 process 的快取清除

- 存第三方服務:

而大家常用的 memcached 就是一種第三方的 service，今天如果開另一台server 跑 cached
process 掛掉重開就還是有資料，讓 process 真的變成 stateless

## 注意事項

- cache 要設計是可以壞掉的，不會因為沒有 cache 而 process 壞掉
- 使用 cache 會讓 debug 更難
- key 的命名
- 要設計成什麼時間 (expired time) 資料過期了要重新計算

除此之外，使用 model cache 也要小心，我們一般使用 model cache 就是不想讓他一直去做 SQL query ，但我們要注意是不是有達到我們要的目的，看看下面範例：

```ruby
x = User.where(condition)
Rails.cache.write("some_key", x)
```

乍看之下沒問題，但其實 cache 裡面存的是 `User.where(condition)` 這個 object 而不是 SQL query 的結果！所以我們可以用 `load` 這個方法強制讀取，甚至會用 `to_h` 把它轉成 hash 確定成功之後再存起來

```ruby
x = User.where(condition).load.to_h
Rails.cache.write("some_key", x)
```
## Config

預設在開發/測試環境 cache 的機能是關掉的，可以用下面的指令先把 cache 存在記憶體裡，在下一次則是關掉
```
$ rails dev:cache
Development mode is now being cached.
```
或者在你要使用的環境加上這行
```ruby
# config/environments/develop.rb
config.action_controller.perform_caching = true
```

- 存在 file

```ruby
config.cache_store = :file_store, "/path/to/cache/directory"
```

如果不指定路徑，會存在 `"#{root}/tmp/cache/"` 這個路徑中

- 存在 process

```ruby
config.cache_store = :memory_store, { size: 64.megabytes }
```

- 存在第三方服務

```ruby
config.cache_store = :mem_cache_store, "cache-1.example.com", "cache-2.example.com"
```

---
# Normal cache(Low-Level Caching)

最主要的操作方法有 `read` `write` `delete` `exist?` `fetch` 這五個

這邊介紹個 write 跟 fetch 就好，其他都差不多

- `write`
```ruby
Rails.cache.write(key, value, options = nil)
```

其中比較常用的一個 options 是 `:expires_in` 單位是秒

- `fetch`

fetch 同時有讀跟寫的功能
```ruby
Rails.cache.fetch(cache_key, expires_in: EXPIRE_IN) do
  uri = URI(url)
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: true).head(url, header)
  response.code == '200'
end
```
可以看看 rails_guide 介紹

> The most efficient way to implement low-level caching is using the Rails.cache.fetch method. This method does both reading and writing to the cache. When passed only a single argument, the key is fetched and value from the cache is returned. If a block is passed, that block will be executed in the event of a cache miss. The return value of the block will be written to the cache under the given cache key, and that return value will be returned. In case of cache hit, the cached value will be returned without executing the block.

大致上是說 fetch 如果只有給一個值，會把它當作 key 嘗試去拿 cache 的 value，如果後面還有帶一個 block，則萬一 cache miss, 就會把 block 裡面的東西算出來存到 cache 裡面，如果 cache hit 則不會去對 block 裡面做運算

除此之外， Rails 還有提供把 Redis 當作 cache 來用的選項，詳細操作可以看 [Rails Guide](https://rails.ruby.tw/caching_with_rails.html)

註：Redis 是 memory-based 的 NoSQL 資料庫，所以他可以支援存很多種格式的東西，像是圖片 / 文件 / 搜尋等等， key-value pair 只是其中一種格式，除此之外也有很多資料庫才有的特性，但 memcache 就只是鍵值對而已，不過也就因為單純所以速度更快


### cache lru

是個在 cache 比較常見的簡寫，全名為 least-recently-used，表示把最近沒用的優先 drop


### 參考資料：

[Rails Guide - Caching with Rails: An overview](https://rails.ruby.tw/caching_with_rails.html)

[ihower 前輩的介紹](https://ihower.tw/rails/caching.html)

[紅寶鐵軌客的介紹]([https://www.writershelf.com/article/rails-%E7%9A%84-cache-%E4%BB%8B%E7%B4%B9%E4%BA%8C%E7%B6%B2%E9%A0%81-caching?locale=zh-TW](https://www.writershelf.com/article/rails-的-cache-介紹二網頁-caching?locale=zh-TW))

---
# Fragment cache
fragment cache 是 rails 裡面比較 high level 的 cache, 不同於前面的 low-level, fragment caching 背後 Rails 做了很多事情也有滿多慣例的

那什麼時候會用到 fragment caching?

有時候 view rendering 是很慢的，尤其是這個 view 要去 db 拿很多 data 的時候

這時候可以嘗試用 rails 內建的 fragment cache 加快 render 速度

如果今天網站有個頁面長這樣：
```html
# app/views/products/index.html.erb
<table>
  <thead>
    <tr>
      <th>Title</th>
      <th>Description</th>
      <th>Image url</th>
      <th>Price</th>
      <th colspan="3"></th>
    </tr>
  </thead>

  <tbody>
    <% @products.each do |product| %>
      <%= render product %>
    <% end %>
  </tbody>
</table>

# app/views/products/_product.html.erb
<tr>
  <td><%= product.title %></td>
  <td><%= product.description %></td>
  <td><%= product.image_url %></td>
  <td><%= product.price %></td>
  <td><%= link_to 'Show', product %></td>
  <td><%= link_to 'Edit', edit_product_path(product) %></td>
  <td><%= link_to 'Destroy', product, method: :delete, data: { confirm: 'Are you sure?' } %></td>
</tr>
```
如果要用 fragment cache, 可以改成這樣寫：
```html
# app/views/products/_product.html.erb
<table>
  # ...
  <tbody>
    <% @products.each do |product| %>
      <% cache(product) do %>
        <%= render product %>
      <% end %>
    <% end %>
  </tbody>
</table>
```

如果要符合某條件才 cache 的話可以用 `cache_if` / `cache_unless`
```html
<% cache_if admin?, product do %>
  <%= render product %>
<% end %>
```

除了一個一個 cache 也可以 cache 整個 collection
```html
<%= render partial: 'products/product', collection: @products, cached: true %>
```

## 機制

在上面的例子中當我們使用 cache helper 的時候，我們用 product 物件當作這個 cache 的 dependency

而這個物件有個 `#cache_key` method，靠著他得到這個 fragment 的 cache key

長相會像是：
```
views/products/42-20180302103130041320/75dda06d36880e8b0ae6cac0a44fb56d
```

其中 `views/products` 是 cache 的歸類

`42` 是這個 product 的 id
`20180302103130041320` 是這個 product 的 `updated_at`
`75dda06d36880e8b0ae6cac0a44fb56d` 則是用這個 render template view 換算出來的亂碼

因此如果 product 被 update 了，或者 template 內容變了，都會導致 cache miss

## Russian Doll Caching
有時候我們可能會想要在某個 cache fragment 裡面再包另一個 cache fragment，這稱作 russian doll caching

但這種情況，我們需要注意某些時候，我們想要 cache miss，但他並沒有
```html
<!-- views/products/show -->
<% cache product do %>
  <%= render product.games %>
<% end %>

<!-- views/products/_game -->
<% cache game do %>
  <%= render game %>
<% end %>
```
如果其中有一個 game 被 update 過，所以第二層的 cache 會被 expire 掉，但是因為 product 的 updated_at 並沒有被更新，這時候根本到不了第二層，在第一層就整個 view 被 cache 住了，要修正這個問題，就要在 game 被修改的時候同時修改 product 更新時間，在關聯中使用 `touch` 這個 option
```ruby
class Product < ApplicationRecord
  has_many :games
end

class Game < ApplicationRecord
  belongs_to :product, touch: true
end
```

## 其他範例
1.
```ruby
json.cache! ['v1', @person], expires_in: 10.minutes do
  json.extract! @person, :name, :age
end

json.cache_if! !admin?, ['v1', @person], expires_in: 10.minutes do
  json.extract! @person, :name, :age
end
```
2.
```ruby
# items/index.json.jbuilder
json.items @items do
  json.cache! item do
    json.partial! "item", item: item
  end
end

# items/show.json.jbuilder
json.item do
  json.cache! item do
    json.partial! "item", item: @item
  end
end

# items/_items.json.jbuilder
json(item, :id, :name, ...)
```

### 參考資料：

https://blog.appsignal.com/2018/03/20/fragment-caching-in-rails.html

https://guides.rubyonrails.org/caching_with_rails.html

https://coderwall.com/p/zn-gkq/cache-your-partials-not-the-other-way-around

---

# Variable Cache

我們在 rails 裡面常常會看到像是下面這樣的 code
```ruby
@aa ||= ...
```
其實這就是把實體變數存在 process 裡面，如果是 instance method 裡面使用的話還好，但如果是像下面這樣
```ruby
class Qoo
  def self.name
    @aa ||= ...
  end
end
```
這種情況，一但 process 一啟動，變數就會 cache 住，要清掉通常只能重開 process

---
