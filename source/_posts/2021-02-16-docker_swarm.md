---
title: "Docker Swarm introduction"
catalog: true
toc_nav_num: true
date: 2021-02-16 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1610062070518-55e6a3d3a290?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1567&q=80"
tags:
- Devops
- Docker
catagories:
- Devops
updateDate: 2021-02-16 22:26:24
# top: 1

---
# Docker swarm
## Intro
Docker swarm 模式中，當我們 create service，我們同時會指定想要的狀態(replica 數量 / network / storage resource)，Docker engine 會試圖去 maintain 在這個 state

擔任Manager角色的Docker Swarm節點主機，主要管理Docker Swarm叢集運作狀態，所有擔任Manager角色的Docker Swarm節點主機，便需要執行同步、確認、更新、複寫等等Docker Swarm叢集運作狀態的工作任務。

正常的多 manager node 運作方式如下圖
![](https://i.imgur.com/Clxbqke.png)

當擔任Manager角色的Docker Swarm節點主機數量「過少」時，有可能因為Manager主機故障損壞，進而導致Docker Swarm叢集崩潰；反之，若Manager角色Docker Swarm節點主機數量「過多」，則會因為叢集維運工作任務的往返網路流量過大，導致同步和更新狀態的寫入效能降低

Docker官方的最佳建議做法當中，擔任Manager角色的Docker Swarm節點主機數量應為「奇數」，最主要是考量Docker Swarm叢集中的「仲裁」（Quorum）及「容錯」（Fault Tolerance）機制。

最小規模應建置「3台」擔任Manager角色的Docker Swarm節點主機，此時可容許「1台」Manager角色主機發生故障損壞事件，並且不影響Docker Swarm叢集的運作，就算建置 4 台 manager 角色主機，還是只能允許 1 台 manager 角色主機故障
![](https://i.imgur.com/ADCDTqc.png)

## 名詞解釋
- node: 主機的別稱, 也可以稱作 host, node 又分成 manager 跟 worker 兩種不同角色

- service: 在 node 上面執行的 tasks，比方說這個 service 可能包含三個不同的 tasks 並且每個 task 裡面有一個 container

- replica: 指這個 service 每個正在執行的 task

## replicated and global service
docker swarm 裡面的 service 有兩種部署方式： replicated / global

replicated service 指定想要的 replica 數量, 每個 replica 都一樣，會被分配到不同的 worker node 裡面

global service 會在每一個 node 身上跑一個 task(包括 manager node), 不用特別指定 task 數量, 這種通常是用在 monitor agent

下圖的例子是跑一個 three-service replica + 1 global replica
![](https://i.imgur.com/zo9tuPz.png)

## 部署
在部署之前需要在機器上面 initial docker swarm(create docker swarm cluster)
```bash
> docker swarm init --advertise-addr <MANAGER-IP>

Swarm initialized: current node (qfqzhk2bumhd2h0ckntrysm8l) is now a
manager.
To add a worker to this swarm, run the following command:
docker swarm join \
--token SWMTKN-1-253vezc1pqqgb93c5huc9g3n0hj4p7xik1ziz5c4rsdo3f7iw2-
df098e2jpe8uvwe2ohhhcxd6w \
192.168.0.143:2377
To add a manager to this swarm, run 'docker swarm join-token manager' and
follow the instructions.
```
如果要加入新的 worker node 就像下面這樣加入
```bash
> docker swarm join --token <TOKEN> <worker IP>
> docker swarm join --token SWMTKN-1-41r5smr3kgfx780781xxgbenin2dp7qikfh9eketc0wrhrkzsn-8lbew6gpgxwd5fkn52l7s6fof 192.168.65.3:2377
```

在建置好各個機器之後，可以來部署服務，指令如下：
```bash
> docker service create
```
下圖表示當指令下下去之後 Docker 會做哪些事情
![](https://i.imgur.com/CICaSDL.png)

Docker swarm 會根據指令決定要建多少的任務(tasks)跟容器
![](https://i.imgur.com/rQGi9xC.png)

以這個例子來說就是這個 service 需要 4 個 replica(tasks), 用的是 alpine 這個 image
```bash
> docker service create --replicas 4 --name hellogoogle alpine ping google.com
```

## Drain a node
當我們把一個 node drain 掉，表示不在讓它身上有新的 task, 而且會停止現有的 task, 同時把這些 task 分配到其他 node 身上
```bash
> docker node update --availability drain worker1
```
可以把一個被 drain 掉的 node 再重新 active
```bash
> docker node update --availability active worker1
```
## Routing mesh
在 Docker swarm 裡面，所有 node 都會參與 routing mesh 過程，就算這個 node 身上沒有這個 service 的 task，但如果有個 request 進到這個 node，會透過 routing mesh 轉到有這個 task 的 node 身上

像是下面這張圖這樣
![](https://i.imgur.com/pwihv1e.png)
我們也可以在外面做一個 load balancer 搭配 routing mesh
![](https://i.imgur.com/1rbCW6V.png)
參考資料：https://docs.docker.com/engine/swarm/ingress/

## secrets / credentials
敏感資料可以用 docker swarm 的 secret 系統儲存
```bash
> echo "Secret" | docker secret create my_secret -
# 其中 my_secrt 是這個 secret 的名字
> docker secret ls
# 列出所有 secret
> docker inspect SECRET_NAME
> docker secret rm my_secret
```
傳 secret 給 service 的話可以在一開始 create 的時候丟進去或者 update 再丟
```bash
> docker service  create --name="nginx" --secret="my_secret" nginx:latest
> docker service update --secret-rm="my_secret" nginx
> docker service update --secret-add="my_secret" nginx
```
## Limit resource
我們可以限制 cpu 或者記憶體等等資原在各個 service 身上
```bash
--limit-cpu
--limit-memory
--reserve-cpu
--reservce-memory
```
## stack file
Docker Stack 是 docker-compose 的延伸，在原本的 docker-compose 已經定義了 service 的長相，但docker stack file 還要寫上一些跟部署有關的參數

例如原本的 docker-compose file 長這樣：
```yaml
version: '3'

services:
  nodejs:
    build:
      context: ./
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_HOST=mongo
      - PORT=3000
    ports:
      - '3000:3000'
    depends_on: [mongo]
  mongo:
    image: mongo
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data: {}
```
其中 mongo service 的 image 是直接從線上拉的沒問題，但 nodejs 的 image 是 local 的，需要先把他推到 registry

```yaml
services:
  nodejs:
    image: 127.0.0.1:5000/nodejs
```

```
> docker-compose push
```
接著補上跟部署有關的參數
```yaml
version: '3'

services:
  nodejs:
    image: 127.0.0.1:5000/nodejs
    build:
      context: ./
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_HOST=mongo
      - PORT=3000
    ports:
      - '3000:3000'
    depends_on: [mongo]
    deploy:
      replicas: 6
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "0.1"
          memory: 1G
  mongo:
    image: mongo
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data: {}
```
接著就可以部署這個 stack 了
```bash
> docker stack deploy --compose-file docker-compose.yml stackdemo
```

```bash
> docker stack ls
# 列出所有 stack
> docker stack ps STACK_NAME
# 列出某個 stack 的所有 service
> docker stack rm STACK_NAME
# 移除某個 stack
```

## Commands
```bash
> docker node ls
# 列出目前的 node
> docker node promote <docker-node>
# Promote node to manager
> docker node promote <docker-node>
# Demote node to worker
> docker node update --role manager docker-node
# 也可以用 update command 來更改 role
> docker swarm leave
# 在 worker node 裡面離開 swarm
> docker node rm worker1
# 在 manager node 裡面移除某個 worker node
> docker service scale <SERVICE-ID>=<NUMBER-OF-TASKS>
# 改 service 的 scale, 其中的 serviceID 也可以改用 service name
> docker service inspect <SERVICE_NAME>
> docker service rm <SERVICE_NAME>
> docker service update --image nginx:stable nginx
# 更新 service 使用的 image, 預設使用 rolling update
> docker service update --update-parallelism 3 nginx
# 可以指定同時更新多少個 tasks
> docker service rollback nginx
# Docker swarm 可以rollback 到 service 前一個版本
> docker service update --detach=false --update-failure-action rollback nginx
# 也可以在 update 的時候如果有任何失敗就 rollback
> docker service logs hellogoogle
# 看 service 的 log
> docker service logs --follow hellogoogle
# real time 看 log
```

## Note
Docker swarm 節點主機之間，要有下列相關的 port 開啟，否則會造成通訊錯誤
- TCP Port 2377：用於Docker Swarm叢集管理服務。

- UDP Port 4789： 用於Docker Swarm叢集Overlay Network跨主機網路流量。

- TCP/UDP Port 7946：用於Docker Swarm叢集節點主機互相通訊。

- IP Protocol 50（ESP）：用於Docker Swarm叢集Overlay Network跨主機網路流量進行加密時使用。

## References
https://gabrieltanner.org/blog/docker-swarm

https://www.netadmin.com.tw/netadmin/zh-tw/feature/167CDFB3615E42229B5C7053DC452755?page=5