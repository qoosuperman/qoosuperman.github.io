---
title: "Iptables Introduction"
catalog: true
toc_nav_num: true
date: 2022-5-29 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1600623050499-84929aad17c9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80"
tags:
- Devops
catagories:
- Devops
updateDate: 2022-5-29 22:26:24
# top: 0
description: Iptables introduction
---
## Intro
之前總是看不太懂 iptables 的設定，最近總算有機會看了課程跟一些文章來理解他

IPtables 在 Linux 系統裡面扮演封包過濾的角色，是防火牆的一部分，但因為設定上不親民，目前有一些比較新的 Linux 系統有漸漸使用不同方式取代他，比方說 [firewalld](https://firewalld.org/)，但因為大部分的 Linux 系統還是使用 IPtables，所以還是很有了解他的價值

Linux 的 IPtables 是基於 netfilter 這個封包過濾的框架做出來的，netfilter 根據封包過濾的幾個不同時機提供了 5 個 hook，而 IPtables 裡面就是根據 chain 的種類把不同規則綁定在這些 hook 上面

這篇文章主要在了解 iptables 如何使用，更深入的介紹可以參考這篇[A Deep Dive into Iptables and Netfilter Architecture](https://www.digitalocean.com/community/tutorials/a-deep-dive-into-iptables-and-netfilter-architecture)

## Outline
- [Intro](#intro)
- [Structure](#structure)
- [Examples](#examples)
- [References](#references)

## Structure
先介紹一下 IPtables 的架構

一張 table 可以有多個 chain，而每個 chain 又可以有多個 rule
![](https://i.imgur.com/qDUjxFF.png)

### Default tables
一開始系統就會建立好預設的下面五張 table：

- Filter: 用來判斷是否讓封包通過，是最常用的 table
- NAT: network address translation，決定怎麼修改封包的來源跟目的地，比方說可以把封包轉到無法由外部直接訪問的網路，也常常用來分享 ip 位置，比方說在你的電腦上跑另一台虛擬機，就可以靠 NAT table 讓虛擬機用你的電腦 ip
- Mangle: 用來改變封包的 header
- Raw: 看完解說還是不太懂，目的是用來 disable connection tracking，總之很少用
- Security: 把封包打上 SELinux 的標記，會影響 SElinux 的行為

### Default chains
default 也有五種 chain，他們對應到會在不同時機觸發規則
- INPUT
- OUTPUT
- FORWARD
- PREROUTING
- POSTROUTING

每張 table 預先就會設定上一些 chain 如下：
![](https://i.imgur.com/Ca9YJYv.png)

chain 的作用時機可看下圖
![](https://i.imgur.com/1tIeGXn.png)

- 如果從外面來的封包，會先經過 PREROUTING chain -> INPUT chain -> 到 linux 主機
- 如果要轉送給其他 host，會是 PREROUTING -> FORWARD -> POSTROUTING
- 如果是送到網路則是 OUTPUT -> POSTROUTING

要包含 table 的話可以看下面這張圖
![](https://i.imgur.com/NBYPbYP.png)
> note: 同一個 chain 在不同 table 也有優先序的原因也是因為在 netfilter 中有寫好有先順序了

當 request 從外面進來，會先經過 nat table PREROUTING chain，如果是送給本機，就會走 filter table 的 INPUT chain，然後到 nat OUTPUT -> filter OUTPUT

如果是 forward 就會走左邊的路 -> filter FORWARD -> nat POSTROUTING

### Rule
看 rule 的規則是從上到下，如果第一條 rule 是所有封包接收，第二個 rule 是所有封包丟棄，那其實第二條規則是沒用的，因為在第一條規則已經全部的封包都符合條件，會被接收進來

每一條 rule 都是 match + target 的形式

match 可以 match 下面幾種：
1. protocol
2. source / destination IP or network
3. source / destination IP
4. network interface

taget 則是說明當 match 完全符合的話會怎樣，而每個 chain 也都有預設的 target，像是 INPUT chain 的預設 taget 是 ACCEPT
1. ACCEPT(接受，封包不會繼續往下走)
2. DROP (ignore packet)
3. REJECT (除了 drop packet 之外，還會送 reject response 回去)
4. LOG (用 system logger 紀錄封包，然後這個風包會繼續往下個 chain 走)
5. RETURN (如果是在子 chain return，會回到 call 這個 chian 的 chain，如果已經是上層，就會用 default policy 處理封包)

寫了那麼多，最後來到怎麼用指令設定 chain / rule

### Commands
#### Display chain and rules
統一是使用 iptables 這個指令工具，下面列出怎麼觀察目前有哪些規則，如果沒有用 -t 選項指定 table 的話預設是看 filter table 的設定
```bash
> iptables -L # display filter table
> iptables -t nat -L # display nat table
> iptables -nL # display numeric output
> iptables -vL # display using verbose output
> iptables --line-numbers -L # use line nums
```

#### Create / Delete chain
看完一些使用 custom chain 的例子之後，我覺得自己做的 chain 應該更適合說成一堆 rule 的集合體，跟 default 那些 chain 的意義在於觸發時機不同有些差異，可以看後面的 example4
```bash
> iptables [-t <table>] -N CHAIN # 新增
> iptabels [-t <table>] -X CAHIN # 刪除
```

#### Change rules
我們可以改變 chain 的 default target

```bash
> iptables -P <CHAIN> <TARGET>
# ex. 把 input chain 的行為預設改成 drop
> iptables -P INPUT DROP
```

如果要加上 rule 使用 -A 或者 -I option，預設一樣加在 filter table 身上
```bash
# 放在 chain 的最後面
> iptables [-t <TABLE>] -A <CHAIN> <RULE_SPECIFICATION>

# 插入某條 rule ，如果沒給 RULENUM 就是放在這個 chain 最前面
# 如果有給就是插在那條 rule 之前
> iptables [-t <TABLE>] -I <CHAIN> [<RULENUM>] <RULE_SPECIFICATION>
```

用 -D 選項去刪除 rule
```bash
> iptables -D <CHAIN> <RULE_SPECIFICATION>
# or
> iptables -D <CHAIN> <RULENUM>
```

清除所有 rule 則是用 -F 選項
```bash
> iptables [-t <TABLE>] -F [<CHAIN>]
```

-j 這個選項比較微妙，後面接的是 target 或者 custom chain，用法：
```bash
> iptables -A INPUT -s 216.58.219.174 -j DROP
```
他的實際用法在後面的範例比較好理解

其他還有像是下面這些選項可用
![](https://i.imgur.com/rdohUCx.png)
![](https://i.imgur.com/0OaDiSo.png)
![](https://i.imgur.com/5O5u9Eg.png)

#### Save rules
改完 iptables 之後並不會在重開機之後保留下來，要做儲存的動作才會在重開機之後保留設定

但對於不同的 distro 通常是使用不同套件：

Debain / Ubuntu:
```bash
> apt-get install iptables-peristent
> netfilter-persistent save
```

CentOS / RedHat:
```bash
> yum install iptables-services
> service iptables save
```

## Examples
### Example1
來看看實際使用的例子吧！
```bash
iptables -A INPUT -s 216.58.219.174 -j DROP
```
這條指令因為沒有指定 table，所以設定在 filter table 上面，source ip 指定 216.58.219.174，target 指定 DROP

這時候去看 iptables 就會生出一條 rule，如果 source IP 符合的直接 DROP，destination 是 0.0.0.0/0 代表所有的 ip，所以要符合這條規則只要 source 符合就可以
![](https://i.imgur.com/Cc9wZCL.png)

### Example2
```bash
iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp -dport 22 -j DROP
```
這會產生下面兩條 rule，首先會把 destination port 22 source IP 來自 10.0.0.0/24 的封包都接受，其他 destination port 22 的都 drop 掉，這種情境像是這個伺服器要限定公司 ip 的人才能 ssh 進來
![](https://i.imgur.com/GKzG8U7.png)

### Example3
limit 這個 module 比較特別，可以用通行證的概念來想像，--limit-bust 指定通行證最多有幾個(default 是 5)，同時也決定了一開始的通行證數量， --limit 則是單位時間允許痛過的封包數，或者說發行通行證的速率

比方說下面的規則，我決定每分鐘允許通過的封包個數是每分鐘 6 個(每 10 秒生成一個通行證)，也可以解讀成每分鐘會重新生成六個通行證，但是 limit-burst 限制了最多數量是五個，所以雖然他 10 秒會重生一個通行證，但是最多還是五個

因此段時間內最多只有五個封包可以通過，超過五個之後，就要再等 10 秒才會有新的通行證
```bash
> iptables -A INPUT -p icmp -m limit --limit 6/m --limit-burst 5 -j ACCEPT
> iptables -P INPUT DROP
```
### Example4
這個例子中會做一個新的 chain，在裡面放上兩條 rule，接著放到 filter table，filter table 就等於多了這兩條 rule 的設定
```bash
> iptables -N LOGNDROP
> iptables -A LOGNDROP -p tcp -m limit --limit 5/min -j LOG --log-prefix "iptables BLOCK"
> iptables -A LOGNDROP -j DROP
> iptables -A INPUT -j LOGNDROP
```
這裡的 log 會存到 /var/log/syslog 這個檔案裡面
![](https://i.imgur.com/JCxEcNQ.png)

## References
[關於limit和limit-burst的解釋](https://www.796t.com/content/1550026828.html)
[Using iptables](https://www.netfilter.org/documentation/HOWTO/packet-filtering-HOWTO-7.html)
[A Deep Dive into Iptables and Netfilter Architecture](https://www.digitalocean.com/community/tutorials/a-deep-dive-into-iptables-and-netfilter-architecture)