---
title: "Dynamic Port Setting on ECS"
catalog: true
toc_nav_num: true
date: 2021-03-18 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1616013031850-2370d198820a?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
tags:
- Devops
- AWS
- Docker
catagories:
- Devops
updateDate: 2021-03-18 22:26:24
# top: 1

---

# Dynamic port mapping on ECS

## WHY?
對於要 export port 給外部的 app 來說(ex. web app)，如果固定 host port 的話，因為 port 不能衝突的關係，所以一個 instance 只能有一個 app container，如果想要同時有兩個 web app container 就需要兩個 instance，如果 instance 還有資源的話就會造成浪費

## HOW?
1. target group
在 create 一個 service 的時候，需要指定這個 service 對應的 target group

而這個 target group 的 health check port 需要設定成 traffic port，如果沒設定的話會一直判定 service 為 unhealthy 一直把 service kill 掉

2. security group
因為 host port 設定成 dynamic port，因此 container 對應的 port 變成一個 range

在這個 instance 身上的 security group(sg)，需要設定 inbound rule 為 ephemeral port range(32768–65535)

這裡需要特別說明一下，有些 aws 文件會寫 49153–65535 這個範圍，但這是 for Docker 1.6 以下的版本，目前的 range 已經是 32768–65535，本人已經先幫忙踩雷 QQ

3. ACL
如果有用 ACL 的話，port range 跟 sg 一樣要設定成 32768–65535

4. task definition
這個 service 所使用的 task definition `host port` 需要設定成 `0` 這個 magic number

這樣就會自動使用 Docker 的 port

## Future work
如果要加上 auto scaling 的機制還要研究一下 ScalableTarget 跟 cloudwatch event 的搭配

## References
[aws doc](https://aws.amazon.com/tw/premiumsupport/knowledge-center/dynamic-port-mapping-ecs/)