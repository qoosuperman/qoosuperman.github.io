---
title: "SSH Tunnel"
catalog: true
toc_nav_num: true
date: 2021-08-25 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1629831676333-8e33b2d7cdd9?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80"
tags:
- SSH
- Shell
catagories:
- SSH
- Shell
updateDate: 2021-08-25 22:26:24
# top: 1
description: Ssh Tunnel
---

# SSH Tunnel

## 前言
工作上時不時會用到 ssh tunnel，但要用的時候又會忘記需要複習，寫一篇比較完整的筆記給自己參考

另外大部分的內容跟圖片是參考另一個 [文章](https://johnliu55.tw/ssh-tunnel.html)，只是嘗試用自己的話再寫一次

## Outline
- [Intro](#intro)
- [Local Port Forwarding](#local-port-forwarding)
- [Remote Port Forwarding](#remote-port-forwarding)
- [常用選項](#常用選項)
- [Examples](#examples)
- [Note](#note)
- [References](#references)


## Intro
Tunneling 指的是將網路上的 A、B 兩個端點用某種方式連接起來，形成一個「隧道」，讓兩端的通訊能夠穿透某些限制（例如防火牆），或是能將通訊內容加密避免洩漏

SSH tunnel 用起來感覺很像把某個 port 映射到另一個 port 上面，所以 ssh tunneling 又叫做 ssh port fowarding

Local Forwarding 是將 Client 上的 Port 打開以供連線；Remote Forwarding 則是將 SSH Server 上的 Port 打開

## Local Port Forwarding
```
ssh -L [bind_address:]<port>:<host>:<host_port> <SSH Server>
```
要特別注意 host 是 ==相對於 ssh server 的 hostname==

`bind_address` 沒有指定的話預設會 bind 在 localhost 上面，如果想把 port 9090 開放給所有人用可以把他改成 `0.0.0.0`
### 範例一
在 server 上有個服務開 8080 port，但防火牆上只有開 port 22 給你用
這時候就可以建立 ssh tunnel

tunnel 建立起來之後，連到自己電腦的 9090 port 就等於連到伺服器上的 8080 port
```
ssh -L 9090:localhost:8080 johnliu@my-server
```
在這個例子中，因為想要在本地端開這個 port，因此 `bind_address` 是 localhost，可以省略不寫

想要把本地的 9090 port 拿來用對應到 server 那個 port，所以 `port` 是 9090

對於那一台 `my-server` 來說，host 是他的本地端，所以 `host` 一樣是 `localhost`，然後 `hostport` 是 `8080`

![](https://i.imgur.com/OzW49Jb.png)

![](https://i.imgur.com/lU3Gshe.png)

### 範例二
如果今天你想連到伺服器的 8080 port，而這個伺服器沒辦法透過本機連
但是有另一台機器可以連到他，而你可以 ssh 這台機器
```
ssh -L 9090:192.168.1.101:8080 johnliu@my-server
```
因為這個 8080 的 port 對於這台 ssh server 來說是 192.168.1.101，所以 `host` 是 `192.168.1.101`
![](https://i.imgur.com/a15B5lO.png)


## Remote Port Forwarding
```
ssh -R [bind_address:]<port>:<host>:<host_port> <SSH Server>
```
在 SSH Server 上開啟 bind_address:port 等待連線，當有人連上時，將所有資料轉送到 host:host_port 去。 注意， ==host 是相對於 Client 的位址，也就是送出 ssh command 的電腦==，而不是 SSH Server ！

> 雖然理論上是這樣，但實際上因為安全性考量，要調整 `/etc/ssh/sshd_config` 這檔案的一些設定才能把 port expose 給外部使用

### 範例一
比方說今天你的電腦有個服務開在 8080 要給客戶用，你有一個有 public ip 的機器可以 ssh 進去
```
ssh -R 0.0.0.0:9090:localhost:8080 johnliu@external-server
```
因為對外機器想要給所有人連，所以 `bind adress` 是 `0.0.0.0`，對外的 `port` 是 `9090`

自己這邊要給外面連的 port 是 `8080`，然後這時候 `host` 是相對於送出 ssh command 的這台電腦而言，所以是 `localhost`

這樣子，客戶只要連上對外機器的 Port 9090 就等於是連上了你電腦的 Port 8080。

![](https://i.imgur.com/Qufl5m2.png)

### 範例二
如果今天這個服務不是開在自己電腦，但可以 access 的到，而想透過 public ip 開給自己家裡可以用的話

```
ssh -R 0.0.0.0:9090:192.168.1.100:8080 johnliu@external-server
```
這個 192.169.1.100 是相對於你的電腦這台主機的 host
![](https://i.imgur.com/WbnoSoW.png)

## 常用選項
- `-N`

不要執行任何遠端指令。沒有加這個參數時，建立 Port Forwarding 的同時也會開啟 Remote Shell，讓你可以對 SSH Server 下指令，而這個參數可以讓 Remote Shell 不要打開。

- `-f`

讓 ssh 指令在背景執行，讓你可以繼續用 Shell 做事情。通常會搭上面的 -N 使用。

- `-C`

把所有溝通內容做過壓縮處理

- `-p`

指定 ssh server 的 port，只有在不是 22 的時候需要指定

## Examples
透過 ad-gateway 連到背後的 db
```bash
ssh -f ec2-user@ad-gateway -L 3308:<rds host>:3306 -N
```

某台 ssh server 的 ssh port 開 3000，透過他連到背後 db，並且把通道的內容作壓縮傳送
```bash
ssh -f -N -C -L $port:<dbhost>:3306 ec2-user@ad-gateway -p 3000
```

## Note
使用結束記得把 ssh tunnel 關掉
```bash
pkill -f $port
```

## References
[超棒講解 ssh tunnel 的文章](https://johnliu55.tw/ssh-tunnel.html)
[如何抓所有正在聽的 port](https://www.cyberciti.biz/faq/unix-linux-check-if-port-is-in-use-command/)
