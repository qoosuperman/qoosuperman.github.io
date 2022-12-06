---
title: "Synopsis of Mastering PostgreSQL 13"
catalog: true
toc_nav_num: true
date: 2022-12-06 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80"
tags:
- SQL
catagories:
- SQL
updateDate: 2022-12-06 22:26:24
# top: 0
description: Synopsis of Mastering PostgreSQL 13
---

最近因為業務需要加上公司有補助買書，所以買了這本書來看

但簡單來說，覺得這不是一本好書

topic 很硬之外，編排的方式也讓人不解

比方說前面好幾個地方已經有用到 function，但是讀到某個幾乎無關的章節中間才來跟我說 PostgreSQL 裡面的 function 要怎麼寫？？

而且很多地方花了很多篇幅說明，結果後來才發現這裡講一堆東西完全不是重點，也有很多地方不明白想要表達什麼

雖然講這麼多不好的，但還是從裡面學到滿多之前不知道的知識，只是如果有其他更好的學習資源建議不要從這本書入手

以下的段落沒有完全按照書中的章節區分，而是以我之後可能會回來比較容易尋找的方式做區分，然後 PostgreSQL 在下面的筆記中會簡稱 pg

## Outline
- [Transaction](#transaction)
- [Making Use of Indexes](#making-use-of-indexes)
- [Advanced SQL](#advanced-sql)
- [System statistics](#system-statistics)
- [Optimizer](#optimizer)
- [Understand Execution plans](#understand-execution-plans)
- [Function in pg](#function-in-pg)
- [Triggers](#triggers)
- [Transaction log](#transaction-log)
- [Troubleshooting](#troubleshooting)

## Transaction

在 Postgresql 裡面，任何東西都是 transaction，你隨便 fire 一個 query 其實都包含了 transaction

如果要把多個 statement 放在同一個 transaction 裡面，要用 begin 的語法
```sql
BEGIN;
SELECT now();
-- 2020-08-13 11:04:15
SELECT now();
-- 2020-08-13 11:04:15
COMMIT;
```

這裡的 COMMIT 也可以用 END 替換，他們的意思是一樣的

而如果把 COMMIT 換成 ROLLBACK 或者 ABORT 就會是相反的意思

而在 pg 裡面有個重要的觀念：

> table can be read concurrently

以下的例子中，這個 table 只有一個 id 欄位
![](https://i.imgur.com/cAv72t5.png)

如果一個 write transaction 跟一個 read transaction 同時發生，read transaction 可以看到的資料只有在這個 read transaction 開始之前 commit 進去的東西，所以就算上圖的第一個 transaction 先 commit 了，第二個 transaction 看到的還是舊的資料

要決定哪些 transaction 是可以同時進行，哪些會互相衝突，要看的是 locking level

locking level:
- ACCESS SHARE: 一般的 read 就是用這種 lock level，只會跟 ACCESS EXCLUSIVE 衝突，而 drop table 用的就是 access exclusive，所以如果有一個 table 即將要被 drop，則 SELECT 的語句無法開始，同樣如果 drop table 要開始也要等到所有這張 table SELECT 語句結束
- ROW SHARE: 用在 SELECT FOR UPDATE / SELECT FOR SHARE，跟 EXCLUSIVE / ACCESS EXCLUSIVE 衝突
- ROW EXCLUSIVE: 用在 INSERT / UPDATE / DELETE，跟 SHARE / SHARE ROW EXCLUSIVE / EXCLUSIVE / ACCESS EXCLUSIVE 衝突
- SHARE UPDATE EXCLUSIVE: 用在 create index concurrently / anaylyze /alter table / validate
- SHARE: 用在 create index
- SHARE ROW EXCLUSIVE: 用在 create trigger 跟一些 alter table，除了 access share 之外跟所有其他衝突
- EXCLUSIVE: 禁止 read / write 同一張 table
- ACCESS EXCLUSIVE: 禁止 read / write

### SELECT for UPDATE
locking level 是根據每句 sql 語句有不同的 level

下面是一個常見的錯誤：
```sql
BEGIN;
SELECT * FROM invoice WHERE processed = false;
UPDATE invoice SET processed = true  ....; -- 錯誤在這
COMMIT;
```
如果考慮到 race condition 的情況，有另一個人也對同樣的 row 操作，在 update 那一個 statement 就會被另一個人 overwrite

這就是一個 SELECT For UPDATE 的很好使用時機
```sql
BEGIN;
SELECT * FROM invoice WHERE processed = false FOR UPDATE; -- for update
UPDATE invoice SET processed = true  ....;
COMMIT;
```
如果使用 select for update 這些被選的 row 跟 update 一樣都會被 lock 住

而同樣的 row 如果有兩個 select for update 都要去拿，比較慢去取的會需要等第一個 select for update 的 transaction 結束，所以第一個 transaction 如果沒 commit ，第二個 transaction 就需要一直等下去，如果不想要這種行為可以使用 SELECT FOR UPDATE NOWAIT

當他發現要用的 row 被 lock，會馬上跳出 error
![](https://i.imgur.com/0ARkZXP.png)

另一個方式是設定 lock_timeout 讓他不要一直等下去
```sql
SET lock_timeout TO 5000;
```

有時候我們要 update 隨便兩個紀錄，而不是一定要特定的兩個紀錄

比方說搶機票的這種情境，我們只是要隨便拿一個位置，但如果用 select for update 就會一直需要等待
![](https://i.imgur.com/lVWSUvl.png)

這時候可以用 select for update skip locked
![](https://i.imgur.com/aEKh3X5.png)

另外要注意 SELECT FOR UPDATE 得時候，如果這個 table 有 foreign key，則相關 table 的 row 也是會被鎖住的

### Transaction isolation levels
一般使用比較可能接觸到的有兩種不同的 isolation level:
- READ COMITTED
- TRANSACTION ISOLATION LEVEL REPEATTABLE

第一種 READ COMITTED level 是預設行為，每個 transaction 裡面的 statement 都會拿到新的 data snapshot
![](https://i.imgur.com/tNstR84.png)

第二種 TRANSACTION ISOLATION LEVEL REPEATTABLE 則是確保整個 transaction 裡面都是同一個 snapshot，這個模式可能在需要產生 report 的情況比較需要打開
![](https://i.imgur.com/WPaAcgW.png)
![](https://i.imgur.com/GecwMk7.png)

### Vacuum
使用 transaction 是需要付出一些代價的，也就是需要額外的空間儲存修改前跟修改後的資料，而 vacuum 這個機制就是在一個 transaction 之後把不需要的 dead space 標記在 free space map(FSM) 裡面，讓這個空間之後可以在同個 table 裡面重複使用（注意不是歸還給整個系統）

另外也有 VACUUM ALL 的機制，他就會把空間還給整個系統，但是 lock level 較高而且效能不好，除非很確定 table 裡面大部分是 dead space 否則最好不要用 VACUUM ALL

以前的 pg 版本會需要人工執行 vacuum，後來則是給 autovacumm 這個工具去安排 background job 完成

## Making Use of Indexes

在 pg 的 SQL statement fire 出去之後會經過四個階段：
1. parser 檢查 syntax / 明顯錯誤
2. 檢查 rules(ex. views)
3. optimizer 做出最有效率的 query 選擇，並做出一個 plan
4. executor 去執行上一步做出的 plan

### Cost model
如果我們使用 EXPLAIN 看執行 sql 的 plan，會看到一個不知道哪來的數字，那個數字是用 cost model 算來的 penalty points

![](https://i.imgur.com/TcdBU77.png)

上面這例子中，71622 這個數字代表這個操作會花 71622 penalty points

系統裡面有定義 cpu 做一些操作的常數 / IO 操作的常數，還有 table 大小 / 有沒有使用 index 跟平行處理

因為無關乎真正如何執行，所以不可能把這個數字換成時間

使用 index 的時候要知道，index 除了會佔去更多空間，每次的寫入也都要去維護 index 資料，所以寫入也會更費時

我們最常用的 b-tree index 可以視為一種 sorted list 的概念，因此用 b-tree index 找最小最大值的速度會是最快的，請多加利用

### Index only scan
另外如果只是想要撈 index 的欄位，搜尋會用 index only scan(如下圖)，這樣就甚至省去到 main table 搜尋的功夫
![](https://i.imgur.com/SVvF6BU.png)
![](https://i.imgur.com/jd4Mzf6.png)

### Bitmap scan
如果用多個 index 做搜尋，或者用一個 index 搜尋多次的話，有可能會進行 bitmap scan 來做搜尋

![](https://i.imgur.com/Iyres19.png)
![](https://i.imgur.com/XlzcfV6.png)

bitmap scan 搜尋的原理是 pg 會先用第一個 index scan，找到總共有哪些 block(可以視為 table 的 page) 有這筆資料, 接著再用下一個 index 搜尋

下面兩種情況使用 bitmap scan 會最有效率:
- 避免同一個 block 不斷被重複搜尋
- 要搜尋幾個弱關聯的條件

### How pg know the composition of a table
並不是這張 table 有 index 就會用 index 去搜尋，還會根據裡面資料組成改變 plan

比方說在 id 是 auto increment 的情況下，pg 會這樣做搜尋：
![](https://i.imgur.com/tUm7Z73.png)
![](https://i.imgur.com/obRO8iA.png)

但如果我們用同樣的資料，但資料的順序完全被打亂，會這樣搜尋：
![](https://i.imgur.com/mb4BvDD.png)

那 pg 到底怎麼知道資料組成的？

其實是透過 pg_stats 這個 table
![](https://i.imgur.com/FfTMjHU.png)

這個 table 維護的工作會在背景執行，通常是配合 autovacuum 執行的時候一起做

t_test 的兩個 index correlation 都是1，因為 id 是 ascending 的，而 name 的排序是 paul 先，接著全部都是 hans

而 t_random 的兩個 index 則是趨近於 0，代表是打亂的排列

## Advanced SQL
接著介紹一些比較少人知道的 SQL 語句

### grouping sets
GROUP BY + HAVING 大部分得人都知道，但 pg 裡面還可以搭配 CUBE / ROLLUP / GROUPING SETS 使用

ROLLUP 可以另外幫你另外做出一欄，算出整體的平均

下面兩張圖片顯示出 ROLLUP 的用法

![](https://i.imgur.com/Ey7Re0K.png)
![](https://i.imgur.com/xgU3i0o.png)

如果 GROUP BY 的條件不止一個，會另外幫你做 by region 的平均

![](https://i.imgur.com/emXPKZ0.png)

如果想要更多彈性的話可以用 CUBE，會幫你把所有條件的排列組合都做計算，可能在做報表的時候有用（by region / by region + country / by country / overall average）

![](https://i.imgur.com/CK595hU.png)

而以上這些做分組平均的計算，如果用 EXPLAIN 去看，通常是用 MixedAggregate 的算法去算的

![](https://i.imgur.com/VyuX32w.png)
### Filter clause
在使用 grouping sets 的時候，可以搭配 FILTER 使用

![](https://i.imgur.com/3k6vsyq.png)

理論上我們還是希望資料盡量在 WHERE 的時候就濾除乾淨，這樣從 table 拿出來的資料會比較少，使用 FILTER 只有在不同的 aggregate 條件裡面會使用到，而使用 FILTER 的效能會比同樣的地方使用 CASE WHEN ... THEN NULL ... ELSE END 來得好

### Ordered Sets
所謂的 ordered sets 指的是 `WITHIN GROUP (ORDER BY)` 這樣的語句

拿中位數就是一個使用 ordered sets 的好時機

![](https://i.imgur.com/a3CjlSr.png)

如果使用 ROLLUP 他也可以幫你拿到整體的中位數

![](https://i.imgur.com/Gk4jXid.png)

percentile_disc 這個 function 的作用是幫你去除掉多少的資料，input 可以是 0..1之間

![](https://i.imgur.com/NpsB5vF.png)

另外還有一個 function 是 percentile_cont，兩者的差別在於 percentile_disc 一定會回傳資料裡面的數字，但 percentile_cont 會在沒有資料符合的情況下用內插(interpolate)的方式計算

![](https://i.imgur.com/m5FZcFZ.png)

除此之外也可以使用 mode 這個 function 去拿眾數，但要小心 pg 的 mode 就算有多個符合的時候也只會回傳一個
像下面這樣

![](https://i.imgur.com/lAU4Gag.png)
![](https://i.imgur.com/tJKFn1g.png)

雖然 50 / 48/52 都是 5 個，但他只會給你其中一個

### Utilizing windowing functions
如果想要把所有資料跟所有資料的平均比較，我們可能會用 sub-select 但其實有比較簡單的做法，就是用 over

![](https://i.imgur.com/Wx65fGL.png)

over 裡面放的條件就是我們要去使用的條件(window)

如果你需要額外的條件可以用  PARTITION BY 去定義

![](https://i.imgur.com/yBx7kKg.png)

如果 PARTITION BY 後面放的是布林值，那就會被分為兩種條件

![](https://i.imgur.com/CmtKXFp.png)

然後有時候需要在 window 裡面做 sorting，也可以在 over 裡面放 order by，他就會在你目前的 window 裡面拿需要的資料，像是最小值

以下面的例子來說，如果上一年的 production 較少，就會維持上一年的值

![](https://i.imgur.com/Pmfssgi.png)

![](https://i.imgur.com/ov5Ww4j.png)

下面這個例子更可以看出有沒有加上 order by 的差異
![](https://i.imgur.com/O7MjvWs.png)

### sliding window
如果要使用 sliding window 最重要的是一定要加上 ORDER BY 語句

![](https://i.imgur.com/5kXBv37.png)

還可以搭配 UNCOUNDED PRECEDING / UNBOUNDED FOLLOWING 等等組成更複雜的 sql

![](https://i.imgur.com/RBh3cil.png)

### Difference between rows and range
rows 跟 range 常常被搞混

rows 就是我們認知的一列，而 range 則是如果好幾列都是同一個值，則他們同時視為一個 range

參考下圖：
![](https://i.imgur.com/RBYjcGI.png)

### EXCLUDE TIES / EXCLUDE GROUP
如果在 over 裡面使用 exclude ties，會把重複的值刪除，像是 DISTINCT 那樣

但 exclude group 會把如果有重複的值，全部的都刪除，一個不留

### rank / dense_rank
rank 跟 dense_rank 可以幫我們做排名，但如果有名次相同的狀況，他們行為會不太相同
![](https://i.imgur.com/6nfZghm.png)
![](https://i.imgur.com/aPgpmcQ.png)

![](https://i.imgur.com/o1PrqnN.png)

### ntile
ntile 可以做分組
![](https://i.imgur.com/qCsJU90.png)

### lead / lag
lead lag 可以把某些欄位放到上一列或者下一列
![](https://i.imgur.com/A2QgZVJ.png)

### first_value / nth_value / last_value
![](https://i.imgur.com/C2AWgEF.png)

### row_number
可以幫我們編排序號
![](https://i.imgur.com/HjZODsq.png)

## System statistics
### pg_stat_activity
pg_stat_activity 這個 table 可以讓你知道現在正在發生的事情，他會把目前的每一個連線都變成一個 row 紀錄資訊，其中的 state 資訊可以讓你知道這個連線目前是 active 還是 idle

一旦找到 bad query，可以去把它關掉：
- pg_cancel_backend: 會把 query 結束掉，但 connection 留著
- pg_teminate_backend：會把 connection 直接關掉

可以很暴力的把除了自己之外的連線關掉：
```sql
SELECT PG_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
AND backend_type = 'client_backend'
```

### pg_stat_database
pg_stat_database 可以讓我們更進一步看到每一個 database 目前狀態

其中 numbackend 可以知道這個 database 目前連線數量

然後 tup_ 系列的欄位則是告訴你目前有多少 reading / writing 正在發生

### pg_stat_user_tables
pg_stat_user_tables 則是更細到每一張 table，還可以搭配另一張 pg_statio_user_tables 一起用（但那張紀錄的比較少去看）

其中 seq_tup_read 是比較重要的欄位，他會告訴我們這張 table seq_scan 使用的數量，這代表沒有使用 index 來做搜尋

另一個 idx_scan 則是 index 多常被用到

我們可以用這樣的 query 檢查這張 table 是不是缺少 index:
```sql
SELECT schemaname, relname, seq_scan, seq_tup_read, seq_tup_read/seq_scan AS avg, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC LIMIT 25
```

### pg_stat_user_indexes
pg_stat_user_indexes 可以幫我們找到是不是有不需要存在的 index
```sql
SELECT schemaname, relname, indexrelname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS idx_size
       pg_size_pretty(sum(pg_relation_size(indexrelid))) OVER(ORDER BY idx_scan, indexrelid) AS total
FROM pg_stat_user_indexes
ORDER BY 6
```

### pg_stat_statements
這應該是最重要的一張看 performance 問題的 table

其中 tmp_blks_read / tmp_blks_written 代表 tempfile 讀取寫入的 block 數量，我們在建立 index 的時後用到 tempfile 是很自然的，除此之外，如果太常用到 tempfile 會導致效能變得很差

而這兩個欄位平常是空的，如果要做觀測，需要特別改設定把他們打開

如果平常要對這張 table 做 query 要記得做 sorting 才會拿到比較有用的數據

範例：
```sql
SELECT round((100 * total_exec_time / sum(total_exec_time) OVER()::numeric, 2)) percent,
       round(total_exec_time::Numeric, 2) AS total,
       calls
       round(mean_exec_time::numeric, 2) AS mean,
       substring(query, 1, 40)
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10
```

另外也可以主動去 reset 這張 table:

```
SELECT pg_stat_statements_reset()
```

### logging slow queryes
我們可以把 slow query 定義一個大於 0 的值，只要比這個久的 query 都會被記錄下來
```
# 預設是 -1
loh_min_duration_statement = -1
```

但要記得，不是所有 slow query 都是拖垮效能的主因，畢竟 1000 個 500ms 的 query(500s) 比兩個花 5秒(10s)的 query 來得糟

## Optimizer

假設現在有三張 table

```
table `a` aid(integer, indexded) 100 million rows
table `b` bid(integer, indexded) 200 million rows
table `c` cid(integer, indexded) 300 million rows
```

然後有一個 view
```sql
CREATE VIEW v AS
SELECT *
FROM a, b
WHERE aid = bid
```

現在有個 query 那 planner 到底會怎麼去做出 plan 呢？
```sql
SELECT *
FROM v, c
WHERE v.aid = c.cid
AND cid = 4
```
如果照這個 query 去執行，可能會使用兩個迭代 O(n^2) 的方式，或者 Hash join / Merge join，而這些方式都不是最好的，因此 optimizer 會先做 transformation 的處理

### transformations
先把 view 變回原本的 query
```sql
SELECT *
FROM
(
  Select *
  FROM a, b
  WHERE aid = bid
)AS v, c
WHERE v.aid = c.cid
AND cid = 4
```
接著 flatten subselects
```sql
SELECT *
FROM a, b, c
WHERE a.aid = c.cid
AND aid = bid
AND cid = 4
```
經過邏輯推導變成下面這樣，就可以用 index 分別 query 三張 table
```sql
SELECT *
FROM a,b,c
WHERE a.aid = c.cid
AND aid = bid
AND cid = 4
AND bid = cid
AND aid = 4
AND bid = 4
```

除了這個之外，還有其他種優化：
### Exhaustive searching
現在 query 已經做完 transformation，接著 planner 會做 exhaustive searching，找出所有可能的 plan 並找出一個最好的

pg 在決定這些 plan 的時候也會在背後做一些優化：
### Constant folding
如果做了一些運算，而可以算出常數的話， pg 會把它轉成常數

在下面的 plan 裡面可以看到它自動把 3 + 1 變成 4，這樣就可以用 index 去做搜尋
![](https://i.imgur.com/Qtpp56i.png)

但如果換一個方式去做搜尋的話，index 就會失效：
![](https://i.imgur.com/DqMLoNe.png)

### function inlining
在 postgresql 裡面還有一個特殊的加速方式叫做 function inlining

比方說下面有一個標註為 immutable 的 function
```sql
CREATE OR REPLACE FUNCTION ld(int)
RETURNS numeric AS
$$
  SELECT log(2, $1);
$$
LANGUAGE 'sql' IMMUTABLE;
```

```sql
SELECT ld(1024);
# 10
```

接著做出一個 table 用這個 function 做 index

```sql
INSERT INTO a SELECT generate_series(1, 10000);
CREATE INDEX idx_ld ON a (ld(aid));
```
雖然我們是用這個 function 建立的

但如果去搜尋這張 table 會發現下面的結果：
![](https://i.imgur.com/3zeUtgZ.png)
他的 index 其實是用 log function 建立得，而不是原本的 ld function

![](https://i.imgur.com/wMNVdKh.png)
所以就算不是用這個 function 去搜尋，還是可以用到原本的 index(Index Scan)

### Join pruning
pg 還會幫忙把不需要的 join 拿掉

![](https://i.imgur.com/NAvHvey.png)
下面的結果：如果沒有要去拿 y 就不會去 join y
![](https://i.imgur.com/djLLcIh.png)

### Speed up set operations
set operations 是指含有 UNION / INTERSECT / EXCEPT 這些關鍵字的 sql query

![](https://i.imgur.com/KAR5rfD.png)
![](https://i.imgur.com/kvAzBYJ.png)
其中 aid = 3 跟 bid = 3 是 pg 自己推導出來的，如果不這樣做，那就會是 sequential scan，如果先推出這樣的結論，搜尋就可以使用 Index Scan

> 常常有人不知道 UNION ALL 跟 UNION 的區別，UNION 會去除重複資料，而且排序，但這些 UNION ALL 都不會去做，但也因此 UNION ALL 速度較快


## Understand Execution plans

EXPLAIN 可以幫我們看到 execution plan

看 plan 的關鍵是從裡面往外面看(inside out)

![](https://i.imgur.com/zs8xbwj.png)
以這個 plan 來說，是從對 b 做 sequential scan 開始的，然後又有 cost 跟 actual time 這兩個 block
cost 是用預測的，而 actual time 那邊則是跑完 query 後真正的時間

如果要讓 EXPLAIN 更 verbose 可以使用 `EXPLAIN (analyze, verbose, costs, timing, buffers)`

### join_collapse_limit

在 planning 階段， pg 會嘗試檢查所有可能的 join 順序

而在 join 非常多的情況下，這樣可能反而是相對花時間的操作

join_collapse_limit 這個設定值就是在控制這樣的行為

比方說有三個 query:
```sql
-- implicit join
SELECT * FROM tab1, tab2, tab3
WHERE tab1.id = tab2.id
AND tab2.ref = tab3.id;

SELECT * FROM tab1 CROSS JOIN tab2 CROSS JOIN tab3
WHERE tab1.id = tab2.id
AND tab2.ref = tab3.id;

-- explicit join
SELECT * FROM tab1 JOIN (tab2 JOIN tab3)
ON (tab2.ref = tab3.id)
ON (tab1.id = tab2.id)
```
這三個 query 其實最後都會讓 pg 做一樣的事情，但到底要進行多少組合，就是用這個參數控制

## Function in pg

因為 pg 裡面可以用的語言很多，所以要指定語言
```sql
CREATE OR REPLACE FUNCTION mysum(int, int)
RETURNS int AS
'
  SELECT $1 + $2;
' LANGUAGE 'sql';

SELECT mysum(10, 20);
-- 30
```

然後 pg 裡面 function 除了根據 naming 之外也會根據參數，所以 mysum(int8, int8) 跟 mysum(int, int) 可以是兩個完全不同的 function

因為單引號常常需要做 escape 所以可以換成兩個錢
```sql
CREATE OR REPLACE FUNCTION mysum(int, int)
RETURNS int AS
$$
  SELECT $1 + $2;
$$ LANGUAGE 'sql';
```
但有些語言裡面 `$$` 是有意義的，像是 bash / perl
所以也可以在 $ 之間放進去一些可以識別的字
```sql
CREATE OR REPLACE FUNCTION mysum(int, int)
RETURNS int AS
$body$
  SELECT $1 + $2;
$body$ LANGUAGE 'sql';
```

### String formating
```sql
SELECT format('Hello, %s %s', 'pg', 13);
-- Hello, pg 13
SELECT format('Hello, %s %10s', 'pg', 13);
-- Hello, pg 13
```

```sql
SELECT format('%1$s, %1$s, %2$s', 'one', 'two')
-- one, one, two
```

## Triggers
trigger 一定是對一張 table 或者一個 view 做事情

而且如果同時在 table 有多個 trigger 的時候，他 fire 的順序是按照 trigger 的名字字母來排序的

在 trigger 裡面有一些特殊變數可以用，像是 INSERT / UPDATE 的操作後會有 NEW 這個 variable 代表即將進來的資料，UPDATE / DELETE 則是有 OLD 代表即將改變的資料

```sql
CREATE OR REPLACE FUNCTION trig_func()
RETURNS trigger AS
$$
  BEGIN
    IF NEW.temperature < -273
    THEN NEW.temperature := 0
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER sensor_trig
BEFORE INSERT ON t_sensor
FOR EACH ROW
EXECUTE PROCEDURE trig_func();
```

效果如下：
![](https://i.imgur.com/Sr1OdXd.png)

## Transaction log
目前所有比較近代的 db 都有方法可以讓這個 db 的 hardware 就算 crash 或者插頭被拔掉，還是可以在系統重啟之後回到正常狀態

而 pg 實作的方法就是靠 Write Ahead Log(WAL) 或者在以前是 xlog

主要的概念就是先把要做的事情先寫到 log 再去寫到 data file，因此 pg 的 transaction log 不只是 log，在系統異常的時候，他還代表可能之後要修復的紀錄

一般來說這些資料放在 pg_wal 資料夾裡面 `/var/lib/pgsql/13/data/pg_wal`

### check points
雖然 transaction log 可以修復受損的資料，但 pg 也不可能一直寫入 transaction log，某個時間點會做回收的動作，這個時間點就是 checkpoint

書中提到 checkpoint 時間間隔如果太短，會造成 performance 較差，因為當某個 block 被 touch 到，那就要整個寫到 WAL 裡面，如果再下個 checkpoint 之前有做更改，只需要去改 WAL 的部分紀錄，不用全部寫進去 WAL，但沒有寫到如果 checkpoint 間隔太長的話會有什麼副作用（除了需要的 disk 變多之外）

## Troubleshooting
這跟前面的 System statistics 很像，但給了一些可以方便我們找出問題的 SQL

### pg_stat_activity
通常不知道發生什麼事情的話會先第一個看這張 table，因為他通常可以給我們一個概念，這個 db 發生了什麼事情

比方說我們可以看看現在有多少連線，有沒有 idle 中的：
```sql
SELECT datname,
count(*) AS open,
count(*) FILTER (WHERE state = 'active') AS active,
count(*) FILTER (WHERE state = 'idle') AS idle,
count(*) FILTER (WHERE state = 'idle' in transaction) AS idle_in_trans
```

如果看到  idle in transaction 的連線數量很多的話就要小心了，首先要看這些連線已經維持了多久
```sql
SELECT pid, xact_start, now() - xact_start AS duration
FROM pg_stat_activity
WHERE state LIKE '%transaction%'
-- 以第三個欄位排序
ORDER BY 3 DESC;
```

也可以看有沒有一些跑了很久的 query:
```sql
SELECT now() - query_start AS duration, datname, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY 1 DESC;
```

如果是使用 ORM 的系統，常常會產生很長的 query，而 pg_stat_activity 只會儲存 1024 bytes 的 query clause

這長度可以透過 `track_activity_query_size` 這個參數來調整

如果想要快速知道有問題的 query 從哪來，有時候很難判斷，這時候最好請 developer 加上 application_name 在不同的 application 裡面，這樣才知道從哪個系統來的 request 出問題

### Checking for slow queries
設定 log_min_duration_statement 這個參數，可以讓 query 超過這個時間的 query 被額外記錄下來，這個參數預設是 -1(被關掉)

使用這個功能的時候要記得，紀錄這些時間長的 query 並意識到他們的存在是好的，但很常他們並不是造成系統很慢的主因，如果有幾百萬個 500ms 的 query，會比單一個很長的 query 來的更嚴重

所以最好還是搭配 pg_stat_statements 這個 view 來確認系統中發生得問題，不要太依賴 slow query

### Checking for missing indexes
有一個 query 可能可以讓你比較快找出 missing index

這樣可以找出哪些大 table 比較常使用 seq scan
```sql
SELECT schemaname, relname, seq_scan, seq_tup_read,
      idx_scan, seq_tup_read / seq_scan AS avg
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

### Checking for memory and I/O
pg 裡面有個預設關閉的功能： track_io_timing

如果覺得 IO 有問題，可以打開來追蹤看看，但要記得關掉因為效能上會有影響

另外也可以從 pg_stat_database 這張 table 大概看出一點端倪

其中的欄位 blk_read_time / blk_write_time 通常跟 temp_files / temp_bytes 一起變高

而這時候通常是要去調整 work_mem 或者 maintenance_work_mem (create index) 的時候了，要記得記憶體不夠的話，他就會用磁碟的空間，而這會導致速度變得很爛

### checkpoint messages
前面有提到 checkpoint 會去回收 transaction log，而 checkpoint 間隔如果太短會效能不好

如果真的太短，系統會印出 log 提醒你：
```
checkpoints are occuring too frequently
```

### careless connection management
在 pg 裡面每個 db connection 都是一個 process，但這些 process 是使用 shared memory(mapped memory)

在這個前提下，如果某個 connection 意外 crash，很有可能 memory 正在被這個 crash 的 connection 編輯中，為了安全起見，postmaster(main process) 會去把其他所有連線都踢掉，避免這個髒資料影響到其他的 process，等記憶體清乾淨資料才會讓這些 connection 重新連線