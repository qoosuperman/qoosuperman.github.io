---
title: "Docker command line tool memo"
catalog: true
toc_nav_num: true
date: 2021-10-17 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1634413656640-0bc2a33be4d1?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1856&q=80"
tags:
- Docker
- Devops
catagories:
- Devops
updateDate: 2021-10-17 22:26:24
# top: 1
description: Docker command line tool memo
---

# Docker CLI
## Most commonly used
這個 cheatsheet 放一些自己比較常用到的 command
```bash
> docker --version
> docker ps
> docker inspect <container id>
> docker logs <container id> -f

# 操作 container
> docker run <image_id or name>
> docker restart <container id>
> docker pause <container id>
> docker unpause <container id>
> docker exec -it <container_id> /bin/bash
> docker stop <container id>
> docker restart <container id>
> docker attach <CONTAINER ID>
> docker container prune

# 操作 image
> docker build -t <image_name> .
> docker build -f Dockerfile.prod
> docker tag <SOURCE_IMAGE[:TAG]> <TARGET_IMAGE[:TAG]>
> docker images
> docker pull <image name>
> docker rmi <image id>
> docker search <image name>
```

## docker commands
以下介紹各種不同的 docker command

### `run`
使用某個 image 把 container 跑起來

#### run a mysql container up
```bash
> docker run --name <自己取個container名字> -p 3306:3306 -e MYSQL_ROOT_PASSWORD=<密碼> -d mysql:<版本號>

# ex.
docker run --name mysql1 -p 3306:3306 -v /var/lib/mysql -e MYSQL_ROOT_PASSWORD=password -d mysql:5.7
```

#### options
- `-d` :背景執行
- `-p` :做 port forwarding，`-p 8080:80` 意思是把主機的8080 port 所有流量轉發到這個Container的80port
- `-P` :做 port forwarding，forward 到一個隨機的主機 port
- `-i` : 互動模式，可以把輸入 forward 到 docker daemon，通常跟 t 一起使用
- `-t` : 給 container 一個偽輸入終端
- `-v` : `-v <主機路徑>:<container的對應路徑>` 把 container 的路徑映射到主機的路徑，現在建議改用 --mount
- `--restart=always` : 如果 container 遇到例外的情況被 stop 掉，例如是重新開機，docker 會試著重新啟動此 container
- `--rm` : 執行完之後把這個 image 刪除，否則平常跑完 container 都要用 `docker rm` 把停止的 container 停掉，如果加上這個就少了這步驟
- `-e` : 設定環境變數 ex. `-e RAILS_ENV=$RAILS_ENV`

最後面有[補充說明](#supplement)為什麼需要同時給 `-i` 跟 `-t` 兩個參數


### `inspect`
可以看到這個 container 詳細資訊

可以搭配 `--format` 使用 json path 撈到想要的資料，像是 container 的 ip
```bash
> sudo docker inspect --format='{{.NetworkSettings.IPAddress}}' 4b0b567b6019
172.17.0.3
```

其中很重要的一部分是看這個 container 為何被停掉

可以看到這個 docker 已經停掉了，exit code 137，然後 `OOMKilled` 是 false 表示不是因為 memery 不夠被停掉的
```
"State": {
 "Status": "exited",
 "Running": false,
 "Paused": false,
 "Restarting": false,
 "OOMKilled": false,
 "Dead": false,
 "Pid": 0,
 "ExitCode": 137,
 "Error": "",
 "StartedAt": "2019-10-21T01:13:51.7340288Z",
 "FinishedAt": "2019-10-21T01:13:51.7961614Z"
}
```

更多的 [exit code](https://medium.com/better-programming/understanding-docker-container-exit-codes-5ee79a1d58f6)

### `prune`
prune 又分成刪除 image 或者刪除 container

ex. 把所有已經停掉的 container image 移除:
```bash
> docker container prune
> sudo docker rm $(sudo docker ps -aq -f state=exited)
```

對沒在用的 image 進行刪除：
```bash
> docker image prune # 把 dangling 狀態的 image 砍掉
```

同時把不需要的 image / container 都砍掉：
```bash
> docker system prune
```

### `tag`
我們不可能記住 image 的 sha key 所以需要用 tag 讓他更好記住

```bash
# 如果不給他一個版本，預設會是 latest
> docker tag a1234567 myapp
> docker tag a1234567 myapp:1.0
```

### `build`
```bash
# 在有 Dockerfile 的目錄下面執行
> docker build .

# 也可以給他個名字，之後就可以用這個 tag 直接跑起 container
> docker build -t <image_name> . # 接著就可以 docker run <image_name>

# 同時幫一個 image 標注多個 tag
> docker build -t myapp -t myapp:1.0 .

# 也可以用 -f 指定使用哪一個檔案來 build image
> docker build -f Dockerfile.prod

# 可以使用 STDIN 來 build image
> docker build - < Dockerfile

```

### `logs`
把 container 的 STDOUT 顯示出來
```bash
> docker logs <CONTAINER>
> docker logs -f <CONTAINER> # 會像是 Linux 的 tail -f 持續更新 log
```

### `stop`
如果下這個指令, docker enginer 會送 `SIGTERM (-15)` 這個指令到 main process, 這個指令會要求 process 把自己正常關掉

如果 main process 無法處理 -15 指令, 那 docker engine 就會送出 `SIGKILL(-9)` 指令, 這個情況下, process 有可能會在沒辦法 clean-up 的情況下結束

### `commit`
用當下的 container 做出 image
```bash
> docker commit <container ID> <user ID>/<image name>
```


### `restart`
docker restart 結合了 stop 跟start 這兩個指令

### `images`
列出已經下載的 image

所有 docker image 的 id 都是 64hex digit

預設只會顯示 12hex digit

加上 `--no- trunc` 顯示全部 64 數字

### `ps`
```bash
# 顯示所有 active contaienr
> docker ps
> docker ps --filter "status=exited"
# 顯示所有包括已經停掉的 container
> docker ps -a 
```

### `pull`
把映像檔從 Docker Registry 拉下來
Docker Registry 上面有各種不同的應用程式, 從基本 Linux images 到各種進階 image
```bash
> docker pull ubuntu
```
如果沒有特別註明的話, 會下載最新的版本, tag 是 `latest`
但也可以加上 tag 下載特定版本
```
> docker pull mysql:5.6
```

image 的完整命名可以參考 [[image]]

### `diff`
可以看我們現在的 container 跟 image 版本的差異
```
> docker diff <container id>

C /home # C 表示 changed
A /home/abc # A 表示 added
A /home/cde
A /home/fgh
# D 表示 deleted
```

### `search`
搜尋映像檔
```bash
docker search ubuntu -f is-official=true
docker search <映像檔名稱 ex.ubuntu> -f is-official=true
```

### `attach`
如果我們 detach 一個 container 之後, 我們可以用 attach 回去

detach 的方法是 `control + P` 加上 `control + Q`

```
> docker attach [Conatiner id] [container name]
```

### `volume`
把 host 的 volume mount 在 container 上面

-v 是舊的用法，新的建議使用 --mount
```bash
> docker run \
--mount type=<mount type>,source=<path>,target=<container path> <image name>
# ex
> docker run \
--mount type=bind,source=/data/mysql,target=/var/lib/mysql mysql
```

### `execute`
可以對某個運作中的 container 下指令
```bash
> docker exec -it <container id> bash
```

### `network`
做一些跟網路有關的操作

```bash
> docker network ls
```

## Supplement
補充說明：到底為什麼需要給 -i 跟 -t 這兩個參數? 這要從 docker 的架構開始說起，docker 是 client server 的架構，client 只是一層薄的 layer，把要做什麼告訴 docker daemon，而在 windows 或者 mac 裡面，因為沒有 Linux 容器化的科技，所以 docker 需要在電腦上跑一個輕量的 linux 虛擬機，才有辦法把 docker daemon 跑在裡面

而每個 Unix process 對於 I/O 都有三種 channel: STDIN / STDOUT / STDERR，因為 docker daemon 是不同的 process，所以 如果我們要把 cli 輸入的東西丟給 docker daemon，docker 需要做些事情

docker run 做的事情只有把 docker daemon 的 output 丟到 client，並不包含把 input 丟給 docker daemon

所以我們需要明確的說請把 cli 上面的 input forward 到 docker daemon，這就是 `-i` 這個參數

但這還不夠，一般來說我們平常用的 cli 都包含終端機模擬器，他會持續等候回應，然後接收像是 `ctrl + c` 這些訊號，如果不給 `-t` 這個參數，他預設會跑在 noninteractive mode，只有加了這個參數，才會給我們一個虛擬的終端機