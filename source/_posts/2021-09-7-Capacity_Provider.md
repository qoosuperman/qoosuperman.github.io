---
title: "Capacity Provider"
catalog: true
toc_nav_num: true
date: 2021-09-4 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1630872146677-5a4cefb1afce?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80"
tags:
- AWS
- Devops
catagories:
- Devops
updateDate: 2021-09-4 22:26:24
# top: 1
description: capacity provider
---
# Capacity Provider
工作上剛好用到 capacity provider，看了很多文件，覺得不做個紀錄一定又會忘記

## Outline
- [Intro of ECS system](#intro-of-ecs-system)
- [Intro of ECS scaling system](#intro-of-ecs-scaling-system)
- [Intro to capacity provider](#intro-to-capacity-provider)
- [Build capacaity provider with cloudformation](#build-capacaity-provider-with-cloudformation)
- [Note](#note)

## Intro of ECS system
要介紹 capacity provider，最好先知道為什麼需要它存在

一個 ECS 系統可以分成 container 的一邊跟 EC2 instance 的一邊

![container side](https://i.imgur.com/Wi9tp8s.png)

在 container 這邊，我們把打包好的 image 放到 ECR，把他寫在 task definition 來定義 task，task 是 ECS 裡面操作的最小單位，就像是 K8S 的 pod

我們可以由定義好的 task definition 執行 task，如果想維持 task 一直在運行的狀態，可以用 service 把 task 包起來，然後放進去 ECS cluster，cluster 會負責維持這些 service 在想要的狀態，像是如果 service 裡面的 task 掛掉，就會重新跑一個起來取代

![instance side](https://i.imgur.com/auGdyFd.png)

在 instance 這邊，我們用 auto scaling group(ASG) 控制 EC2 instance 的數量，所以會在 ASG 身上定義 launch condition，像是 EC2 的 AMI 要用哪一個還有 instance type 等等

在 ECS 系統中，有多少個 instance 代表這個 cluster 裡面有多少空間可以拿來放 service 的 tasks

![instance with task](https://i.imgur.com/KUsjuZ5.png)

最後的結果會是像上圖這樣，一個 cluster 裡面有多個 container instances，每個 instance 裡面會裝各種 task，一個 service 裡面包含的多個 task 可能散落在多個 instance(像是途中的灰色 task)

接著來看兩邊原本 auto scale 的機制

## Intro of ECS scaling system

![container side auto scale](https://i.imgur.com/OdJXlQI.png)

在 container 這邊，我們可以透過 cloudwatch alarm 監控 cpu / memory 來讓 ECS service 的 task 數量自動增減

![instance side auto scale](https://i.imgur.com/9kUqv6m.png)

在 instance 這邊，也可以一樣透過 cloudwatch alarm 監控 cpu / memory 來讓 ASG 自動增減 instance 數量

![combine both side](https://i.imgur.com/X30LqoM.png)

問題在於要怎麼讓兩邊的 scaling 機制結合起來

在 scale in 的時候，我們會把 task 關掉，如果 resource 夠，我們希望可以把多餘的 instance 關掉，而且不能關到 instance 上面還有 task 在跑的

在 scale out 的時候，我們要把 task 開起來，如果 resource 不夠，auto scaling group 要能夠自動開啟新的 instance

這時候就可以使用 capacity provider

## Intro to capacity provider

![ECS with capacity provider](https://i.imgur.com/Q8OamtO.png)

capacity provider 的概念像是上面這樣，在作出 capacity provider 的時候，會產生一個特殊的 metric 叫做 `CapacityProviderReservation`，主要就是靠這個 metric 來調節 instance 數量

這個 metric 的概念是 `task number / instance number x 100%`，要注意這邊的 number 是相對的

比方說 8 個 task 剛好符合 4 個 instance 的資源，目前狀態剛好是 8 個 task 跟 4 個 instance，那這個數值會是 100%，而如果是 10 個 task 跟 4 個 instance，那數值就是 5 / 4 * 100% = 125%

在我們建立 capacity proivder 的時候，要指定一個 `target capacity` 的數值，就會對應到上面的 `CapacityProviderReservation` metric，capacity provider 會盡量讓這個 metric 的數值符合我們設定的 `target capacity`

如果設定 100%，在上面的例子中，因為 task scale out 了，metric 變成 125%，為了符合 metric，capacity provider 就會讓 ASG scale out，讓 instance 變成 5 台，這樣 metric 又變回 100%

如果設定為 50%，代表我們想讓 task 在平常只佔用所有 instance resource 的 50%，在上面的例子中 8 個 task 跟 4 個 instance 的狀況是夠用的，但為了符合設定的 target capacity，他會再 scale out 另外 4 個 instance，讓 metric 變成 50 %

另外[官方文件](https://aws.amazon.com/tw/blogs/containers/deep-dive-on-amazon-ecs-cluster-auto-scaling/)還提到一點：

>  with a preference for the metric to be less than the target value if possible.

就是說如果現在有個尷尬的狀況，現在是 60%，如果再 scale out 一個 instance 會變成 40%，而我們的 target 設定 50%，他會傾向確保 instance 數量是夠的，所以這時候會再去 scale，讓 metric 變成 40%

目前找不太到 AWS 究竟是怎麼算出這個數值的，default 似乎是 CPU，不過如果到時候想要 create task，但不是 cpu 太高，而是記憶體不足，這個 task 依舊會是 provisioning state，這時候一樣會把 metirc 值調高(筆者已經實驗過)，所以還是會 trigger 另一次的 auto scale out

> Note: 在以前，如果要跑一個 task 起來但 resource 不夠，就會直接不跑，現在這個 task 會進入 provisioning state，最多一個 cluster 裡面會有 100 個 task 在這個狀態，他們最多會等待10 and 30 minutes，如果在這段期間還沒有足夠的 instance，他們會被停掉

值得一提的是，如果要一次 scale 大量 instance 的情況下，不一定 metric 預測得準，一樣會先猜測會需要多少個 instance 然後去 provision，但如果猜得不準，仍然有正在 provisioning state 的 task，那就會 trigger 另一個 scaling out 直到沒有 provisioning 的 task

想更了解運作機制的細節可以看[這篇官方的 deep dive](https://aws.amazon.com/tw/blogs/containers/deep-dive-on-amazon-ecs-cluster-auto-scaling/)

## Build capacaity provider with cloudformation

capacity provider 跟 auto scaling group 是一對一的關聯

使用 CFn 的時候，我們要把 capacity provider 跟 ECS cluster 的關係建立起來，我們可以直接在 ECS cluster 底下指定 capacity provider，或者建立 `AWS::ECS::ClusterCapacityProviderAssociations` 這個 resource 專門把關連建立起來

[這篇文章](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html)建議最好做出新的 ASG，如果用原本的 ASG 可能導致不會正確註冊到 capacity provider

### capacity provider 的 resource:
```json
{
    "AWSTemplateFormatVersion": "2010-09-09",
    "Resources": {
        "ECSCapacityProvider": {
            "Type": "AWS::ECS::CapacityProvider",
            "Properties": {
                "AutoScalingGroupProvider": {
                    // 在這裡跟 ASG 作出關聯
                    "AutoScalingGroupArn": "arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:a1b2c3d4-5678-90ab-cdef-EXAMPLE11111:autoScalingGroupName/MyAutoScalingGroup",
                    "ManagedScaling": {
                      // 每次 scale in / out 最多會一次改變幾個 container 數量
                        "MaximumScalingStepSize": 10,
                        // 每次 scale in / out 最少會一次改變幾個 container 數量
                        "MinimumScalingStepSize": 1,
                        // 允不允許 capacity provider 做 auto scaling
                        "Status": "ENABLED",
                        // 希望 CapacityProviderReservation 維持在 100%
                        "TargetCapacity": 100
                    },
                    // 保證在 scale in 的時候，身上有 task 的 instance 不會被停掉，通常是要打開
                    "ManagedTerminationProtection": "ENABLED"
                },
                "Tags": [
                    {
                        "Key": "environment",
                        "Value": "production"
                    }
                ]
            }
        }
    }
}
```

### Cluster Resource
一個 ecs cluster 底下可以有多個 capacity provider，可以透過分配比重調節它們的比例，然後每個 capacity provider 透過被關聯到的 ASG 增減 instance 數量
```json
{
  "MyCluster": {
    "Type": "AWS::ECS::Cluster",
    "Properties": {
      "ClusterName": "MyCluster",
      // 連結到 capacity provider
      "CapacityProviders": { "Ref" : "MyCapacityProvider" },
      "DefaultCapacityProviderStrategy": [
        "Base": 1,
        "CapacityProvider": "MyCapacityProvider",
        "Weight": 0
      ]
    }
  }
}
```
## Note
踩雷過程：
1. 我直接參考前面文件把 ASG 砍掉，但我同事說只要把 ASG instance 數量降為 0 再開回來就好
2. 一開始沒有設定到 cluster 身上的 `DefaultCapacityProviderStrategy`，這時候就算有跟 capacity provider 建立關聯也沒用
3. service 要重新 create，在 create 的時候如果不指定 `DefaultCapacityProviderStrategy`，他會吃 cluster 的 default strategy
4. 使用的 auto scaling group(ASG) 需要設定 `NewInstancesProtectedFromScaleIn` 為 true，否則沒辦法成功建立 capacity provider

[AWS 文件](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-capacityprovider.html)
[ECS cluster AWS 文件](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-cluster.html)
[不錯的介紹影片](https://www.youtube.com/watch?v=0j8D-be2J1k)
[Auto Scaling group capacity providers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html)
[TargetCapacity 代表什麼](https://stackoverflow.com/questions/64021278/how-target-capacity-is-calculated-in-aws-ecs-capacity-provider)
[官方 deep dive 文件](https://aws.amazon.com/tw/blogs/containers/deep-dive-on-amazon-ecs-cluster-auto-scaling/)
[AWS::ECS::ClusterCapacityProviderAssociations](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-clustercapacityproviderassociations.html#cfn-ecs-clustercapacityproviderassociations-defaultcapacityproviderstrategy)