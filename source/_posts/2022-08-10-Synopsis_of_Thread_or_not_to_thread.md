---
title: "Synopsis of To Thread or Not To Thread"
catalog: true
toc_nav_num: true
date: 2022-8-10 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1604869515882-4d10fa4b0492?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80"
tags:
- Ruby
catagories:
- Ruby
updateDate: 2022-8-10 22:26:24
# top: 0
description: Synopsis of To Thread or Not To Thread
---

這篇文章主要在翻譯 & 摘要 [這篇](https://shopify.engineering/ruby-execution-models)，圖片也都是來自這篇文章的內容

裡面釐清了很多之前我覺得很困惑的問題，查到的資料又常常太過艱深，非常感謝這篇文章整理出來（感謝 Shopify 祝你們生意興隆），我也帶著滿滿的收穫用自己的話做個重點整理

## Outline
- [How Much Memory Is Used In General](#how-much-memory-is-used-in-general)
- [Memory Metrics](#memory-metrics)
- [Improving Copy on Write Efficiency](#improving-copy-on-write-efficiency)
- [Pros for Process Based Server](#pros-for-process-based-server)
- [Ractor / Fiber](#ractor-/-fiber)
- [Reference](#reference)

## How Much Memory Is Used In General
跑一個 app 起來的時候，記憶體主要可以分成兩個區塊： static memory / request processing memory:
![](https://i.imgur.com/lh08m76.png)

- static memory:
是固定的，像是把 ruby VM 啟動的費用，或是一些無可避免的 Ruby Objects，這裡的費用理論上來說是固定費用，不管是用幾個 thread 都不影響
- request processing memory:
需要處理 request 的記憶體，像是 query 結果 / 過程中產生的變數等等，理論上是跟 thread 數量正相關

基於以上的論點，最基本的記憶體使用量應該是：

```
processes * (static_memory + (threads * processing_memory))
```

因此使用一個 procees 兩個 thread 跟使用兩個 single thread 的 process 記憶體使用量應該是後者較多，如下圖所示

![](https://i.imgur.com/M86cqBp.png)

不過當然事情不會像我們想的這麼簡單

以前的 linux 系統在 fork process 的時候的確幾乎就像上面講的那樣，但隨著科技進步，就算是 fork 一個 process，他可以欺騙 parent process 跟 child process 他們是用各自的記體體，但實際上是用同一塊，這技巧叫做 Copy On Write(Cow)

![](https://i.imgur.com/AaRpI9o.png)

如果完美運行 CoW 的話，記憶體使用應該長這樣：

```
static_memory + (processes * threads * processing_memory)
```

這表示 process 跟 thread 使用的成本是一樣的，但實際上當然也不是這麼美好

## Memory Metrics

Resident Set Size (RSS) 這個 metric 算是最常看到的，像是 ps 看到的就是 RSS，如果是做 fork 過的 process，原本的 parent process 是 100 MB，就算 child process 沒有使用任何新的記憶體，你會看到兩個 process 分別使用 100MB，實際上他們總共才用了 100MB

Proportional Set Size (PSS)，則是按照比例去算，像上面的例子 100Mb fork 變成兩個 process，則一個 process 按照比例分別用了 50MB，如果急著要計算剩下多少記憶體用量，PSS 是比 RSS 接近實際的算法

但又有更精確的算法

在 Linux 系統上，可以用 `cat /proc/$PID/smaps_rollup` 看到記憶體用量分配明細，下面是 unicorn 的例子

```
# unicorn worker

Rss:              771912 kB
Pss:              441856 kB
...
Shared_Clean:      18288 kB
Shared_Dirty:     315648 kB
Private_Clean:        48 kB
Private_Dirty:    437928 kB

# unicorn parent

Rss:              508544 kB
Pss:              109398 kB
...
Shared_Clean:      14680 kB
Shared_Dirty:     411584 kB
Private_Clean:      2844 kB
Private_Dirty:     79436 kB
```

名詞解釋：
1. Shared memory 的部分是其他 process 也有使用的，Private memory 是只有單一 process 使用的
2. Clean memory 是雖然分配了這空間，但從來沒有被寫入資料，Dirty memory 則是至少已經被一個 process 寫入資料了

所以對於 worker 來說，總共 771912kb 其中 437928kb，是 worker 自己已經用的，其他都是從 parent 繼承來的

那究竟多少比例的 staic memory 是大家共用的呢？

worker 裡面 shared 的部分就是共用的，而我們預估 parent 的 Rss 大致上是整體的 static memory，可以算出大概 65% 是共用的

```
(18288 + 315648) / 508544.0 * 100%
>> 65.66%
```

![](https://i.imgur.com/8Qktbkj.png)

原本光從數據來看，像是用 ps 的話，我們可能以為多一個 process 會多 770MB 記憶體，但經過計算後，實際上應該差不多是 450MB，差異相當大

## Improving Copy on Write Efficiency
1. preload app

為了讓 CoW 效率最大，要在 parent process fork 前盡量把整個 app 載入，因此不管是 Puma / Unicorn / Sidekiq enterprise 都有 preload_app 可以用

2. 避免 memoized class variables

如果醉了這樣的事情：
```ruby
class SomeStuff
  def self.something
    @something ||= load_some_data
  end
end
```

這種事情做很多的話，process 之間無法共用的記憶體會越來越多，最好是可以用 constant 來替代，但有的情況沒辦法，這種時候 eager load namespace feature 就是次好的做法

```ruby
class SomeStuff
  def self.something
    @something ||= load_some_data
  end

  def self.eager_load!
    something
  end
end

# config/application.rb
config.before_eager_load do
  config.eager_load_namespaces << SomeStuff
end
```

## Pros for Process Based Server
1. 有時候我們會需要中斷一個 request，可能像是需要處理很大量的資料或是被攻擊的情境，這時候 process based server 只要砍掉 worker 重新啟動新的就好，但如果殺死一個 thread 他可能會遺留無法處理的 mutable resources 下來，因為是跟其他 thread 共用記憶體，可能造成其他 thread 的 error

2. 處理 request 時間較快

下面是兩個 process 處理 request 的情況
![](https://i.imgur.com/jEAArTB.png)

下面是兩個 thread 處理 request 的情況：
![](https://i.imgur.com/lq9IjgX.png)
在一個 process 裡面因為 GIL 的關係，同一時間只能有一個 thread 處理 ruby code，而且 GC 的時候 thread 當下也都是暫停運作的，因此可以想像處理 request 的時間會比兩個不同的 process 長

## Ractor / Fiber
Ractor 跟 Fiber 是 Ruby3 之後推出的新的用來實現 concurrent 的工具（每個 Ractor 裡面有多個 thread，每個 thread 又有多個 fiber），筆者認為他們目前用途還不大：
1. Ractor 雖然可以達到真正平行處理，但他們之間的溝通很困難，他認為很難靠他做到有規模的 app 可以做到的事情
2. fiber 是更輕量的 thread，但 thread 有的缺點他也都有，所以如果目前沒有靠 thread 拿到一些平行處理的好處，也不用指望 Fiber


## Reference

- [什麼是 Ruby VM](https://sitaramshelke.medium.com/inside-rubyvm-967b25e234db)
- [eager load constant](https://blog.saeloun.com/2020/02/24/rails-6.1-rake-eager-load.html)
- [什麼是 Ractor](https://scoutapm.com/blog/ruby-ractor)