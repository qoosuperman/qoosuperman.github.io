---
title: "How to Write YAML"
catalog: true
toc_nav_num: true
date: 2021-10-19 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1633306946374-d64e9fca8734?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1770&q=80"
tags:
- Devops
catagories:
- Devops
updateDate: 2021-10-19 22:26:24
# top: 1
description: How to Write YAML
---

YAML 很常寫，但有些用法自己記不太住，因此覺得有需要來整理一下

# How to write yaml
## Outline
- [純量 scalar](#純量-scalar)
- [序列(sequence)](#序列(sequence))
- [映射(mapping)](#映射(mapping))
- [Examples](#examples)
- [進階](#進階)
- [References](#references)

yaml 含有一到多個節點

每個節點有可能是三種資料格式其中一種：純量(scalar), 序列(sequence), 映射(mapping)

接下來都用這個 script 去讀 yaml 檔：
```ruby
# test.rb
require 'yaml'

config_yaml = YAML.load_file('test.yml')
puts config_yaml.inspect
```

## 純量 scalar
純量其實就是文字，用 0 或多個 unicode 字元表示 datum
```yaml
# test.yml
dotent
```

```bash
> ruby test.rb
"dotent"
```


在 yaml 檔案裡面如果要單引號裡面還有單引號，可以用兩個單引號轉換
```yaml
# test.yml
products: 'it''s me'
```

```bash
> ruby test.rb
{"products"=>"it's me"}
```

## 序列(sequence)
有順序的節點清單，不限制類型，用破折號 `-` 表示這筆資料是序列
```yaml
# test.yml
- 20
- 'Two'
- 34.3
```

```bash
> ruby test.rb
[20, "Two", 34.3]
```

## 映射(mapping)
用 key: value 的配對方式，key 必須視唯一值

```yaml
# test.yml
language: csharp
```

```bash
> ruby test.rb
{:language=>"csharp"}
```

## Examples

可以用 Scalar、Sequence、mapping 的各種組合表現出資料集合
```yaml
# test.yml
-
  name: John
  age: 20
  
-
  name: Roy
  age: 32

# 或者也可以寫成
- name: John
  age: 20
  
- name: Roy
  age: 32
```

```bash
> ruby test.rb
[{"name"=>"John", "age"=>20}, {"name"=>"Roy", "age"=>32}]
```

```yaml
# test.yml
person: 
  - John
  - Roy
```

```bash
> ruby test.rb
{"person"=>["John", "Roy"]}
```

## 進階

### 區塊結構

可以用三個破折號 `---` 做區塊劃分，表示下面是新的資料區塊
然後用三個點 `...` 表示區塊結束

### 多行資料表示

`|` 讓每一行資料都視為獨立資料
`>` 則是只有在縮行改變或者空行的時候才視為新資料
後面加上 `+` 會保留後面斷行符號， `-` 會刪除

```yaml
# test.yml
node: |
    This is a book.
    it is a pen.
      I want to supermark.
```

```bash
> ruby test.rb
{"node"=>"This is a book.\nit is a pen.\n  I want to supermark."}
```

```yaml
# test.yml
node: >
    This is a book.
    it is a pen.
      I want to supermark.
```

```bash
> ruby test.rb
{"node"=>"This is a book. it is a pen.\n  I want to supermark."}
```

### 引用節點資料
如果有個節點希望重複使用，可以用 `&` expose 希望被引用的節點，然後在想要引用的地方使用 `*`
```yaml
# test.yml
bill-to: &id001
  given: Chris
  family: Dumars
ship-to: *id001
```

```bash
> ruby test.rb
{"bill-to"=>{"given"=>"Chris", "family"=>"Dumars"}, "ship-to"=>{"given"=>"Chris", "family"=>"Dumars"}}
```

有時候會搭配 `<<` 代表合併到當前資料集
```yaml
defaults: &defaults
  adapter:  postgres
  host:     localhost

development:
  database: myapp_development
  <<: *defaults

test:
  database: myapp_test
  <<: *defaults
```

```bash
> ruby test.rb
{"defaults"=>{"adapter"=>"postgres", "host"=>"localhost"}, "development"=>{"database"=>"myapp_development", "adapter"=>"postgres", "host"=>"localhost"}, "test"=>{"database"=>"myapp_test", "adapter"=>"postgres", "host"=>"localhost"}}
```

### 複數的 mapping key
通常使用 mapping，key是單一的，但我們可以用 `?` 來表示這個 mapping 的 key 由兩個組成
```yaml
# test.yml
? - Detroit Tigers
  - Chicago cubs
:
  - 2001-07-23
```

```bash
> ruby test.rb
{["Detroit Tigers", "Chicago cubs"]=>[#<Date: 2001-07-23 ((2452114j,0s,0n),+0s,2299161j)>]}
```

### null nil
null 用 `~` 表示
```yaml
# test.yml
products: ~
```

```bash
> ruby test.rb
{"products"=>nil}
```

### 轉換 data 類型
用 `!!` 搭配數據類型轉換資料類型
```yaml
# test.yml
products: !!str 123
```

```bash
> ruby test.rb
{"products"=>"123"}
```

## References
[阮一峰的网络日志](http://www.ruanyifeng.com/blog/2016/07/yaml.html)
[yaml spec](https://yaml.org/spec/1.2/spec.html)
