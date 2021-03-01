---
title: "Synopsis of Continous Delivery With Docker and Jenkins"
catalog: true
toc_nav_num: true
date: 2021-03-01 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1605447302541-bd14aa1417ab?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
tags:
- Continuous Delivery
- Devops
- Jenkins
- Docker
catagories:
- Devops
updateDate: 2021-03-01 22:26:24
# top: 1

---

[Intro](#intro)
[Configuring Jenkins](#configuring-jenkins)
[Continous Integration Pipeline](#continous-integration-pipeline)
[Configuration Management with Ansible](#configuration-management-with-ansible)
[Continous Delivery pipeline](#continous-delivery-pipeline)
[Clustering with Docker Swarm](#clustering-with-docker-swarm)
[Advanced continous delivery](#advanced-continous-delivery)

---

以下內容幾乎都來自 Continuous Delivery with Docker and Jenkins 這本書

本文整理這本書的概要作為之後參考

# Intro
## What is Continous delivery

所謂的 Continous delivery(CD), 就是要把所有在產品上做的變化，包括新 feature / infra 上的變動 / bugfix 都用安全而且持續有效率的方式交付到使用者手上

在以前的情況，如果今天要在信件系統裡面加上一個功能，開發組花了一個禮拜之後開發交給 QA team，完成之後給 operation team，可能又要花幾天甚至幾個禮拜時間才能 release，如果使用 continous delivery 就可以讓使用者在開發完成之後很快可以使用到新功能

傳統的 delivery process:
- development
開發有時候包括市場分析的部分，通常會用敏捷開發的方式，demo session 則是為了得到消費者的第一手回饋
- QA
這個階段通常稱為 UAT(User Acceptance Testing)，其中 non-functional testing 是指效能, security 等等測試
- operations
通常是最短的一個階段，負責 release 新機能到 production 並 monitor
![](https://i.imgur.com/f6qaaVH.png)

其中一個最能闡述 continous delivery 的優點是 flicker 跟 yahoo，當時 yahoo 併購了 flicker，在併購之前他們的 deliver 策略是不同的，yahoo 很少 release，每次 release 都有複雜的測試跟 operation 過程，而 flicker 則是一天會有好幾次的部署，每次的變動都很少

最後調查出來，整個 yahoo 公司裡面 downtime 最少的就是 flicker 的 service，因此慢慢把這個策略用到其他產品上
![](https://i.imgur.com/Mi96qrn.png)

這也說明了： 如果 code 變動越少，這個 release 越安全，而這個步驟越經常執行就越安全

## auto deployment pipeline
為了讓 release 自動化達到 continous delivery 的境界，我們先看一下如果把它自動化之後 pipeline 應該要長怎樣
![](https://i.imgur.com/H5BRhu3.png)

### Continuous Integration
Continuous Integration 的階段提供檢查的第一手資訊給 developer，會跑 develper 寫的 unit tests 藉此檢查 code quality

### Automated acceptance testing
automated acceptance testing 的階段應該是由顧客跟 QA 一起準備的測試項目，用來取代傳統 UAT，它代表著這個產品是不是準備好 release 了

這個測試是為了讓傳統上使用者預期的行為寫到測試裡面，讓他跟著開發的內容一起被測試，而不是開發完一段時間之後再做測試，但這部分通常也是最困難的，因為要把原本的預期行為寫成 code 的測試

這裡常常造成困惑的地方是，到底哪些部分要給 QA team 測試，哪些測試要被程式 cover，可以用 Agile testing matrix 跟 testing pyramid 來澄清

#### The Agile testing matrix
![](https://i.imgur.com/j1PwN24.png)
- Acceptance Testing (automated)
這就是取代傳統 UAT 的部分，會寫成 user stories 或者一些範例，由 QA 跟使用者的觀點決定這個軟體應該如何運作，比較接近以 "user" 的觀點寫的

- Unit Testing (automated)
developer 自己寫的 unit tests，比較接近以 "code" 的觀點寫的

- Exploratory Testing (manual)
由 QA team 操作，試圖破壞這個系統，或想想有什麼可以改良的地方，在自動化的架構下，QA 不應該執行重複的測試項目

- Non-functional Testing (automated)
有關一些 performance, scalability, security 等等的測試

至於為什麼沒有看到 integration test 呢？首先我們要知道 integration test 會因為內容的不同，意義不同，如果是很小型的 service，那 integration test 可能就等於 unit test 跟 acceptance test cover 的範圍，如果是許多 module 之間的測試，那可能就會寫在一些 unit test 跟 UAT test 之間的地方，雖然寫法上接近 UAT test，但是是以 code 的觀點寫的，因為他可能會需要 mock 很多 module 的 service 等等

#### The testing pyramid
在這個金字塔裡面，越往上的測試會越慢，而且產生這些測試的成本越高，這也是為何 acceptance test 通常無法 100% cover，因此他們通常需要 feature 導向，然後選擇特定場景測試，否則可能會花太多資源在寫測試上

相較之下，寫 unit test 的成本是最少最快的，所以我們應該盡量 100% cover 這一塊

### Configuration management
這個部分就包括了所有部署需要的事情，像是安裝需要的套件，這裡會需要一些 configuration management tools，像是 Ansible, Chef 等等

另外還有一部分是 application monitoring，這通常需要串流 log 跟相關的 metric 到一個 dashboard 上面

## organizational prerequisites
如果要導入 continous delivery 需要有一些先決條件，就像要導入 Agile process 的話，組織上也需要有一些調整，比方說你需要有 product owner, stakeholders，整個組織也需要知道在 sprint 之中不能有其他需求上的改變

如果要導入 continous delivery，可以從 DevOps culture, a client in the process, and business decisions 這三點來看

### DevOps culture
在以前，軟體由一個 team 開發，可能是同一個人開發，測試，部署到 production，但隨著系統變大，組織變大，慢慢把這些工作分工，大家各司其職增進效率，獨立出 QA team, operation team，而每個工程師負責專業的一塊東西

這樣的壞處就是溝通需要額外的資源，組織分的越開，溝通上越困難，這樣的文化不利於 Continuous Delivery process，我們需要導入 DevOps culture

DevOps culture 的概念上像是回到最初，某個人或者某個 team 負責所有的工作，而可以轉換成使用這種 Devops model 的關鍵就在於自動化

一個 devops team 不一定都是 developer，有種常見的配置是 4 個 developer， 1 個 QA， 1 個 operation，但這些人需要非常緊密合作才能消除溝通資源的消耗
![](https://i.imgur.com/qK8HRT4.png)

---

# configuring Jenkins
Jenkins 是一個 open source 的自動化 server code，用 Java 寫的，目前最流行的 CI/CI 工具

## Jenkins architecture
Jenlins 大部分的使用方式都是拆成 master-slave 的架構，主要負責管控的為 Jenkins master，做事情的為 Jenkins slave 或者稱 Jenkins agent

可以在設定完第一個 slave 之後，把 master 的 node 變成 offline，不然有一些 build 還是會在 master 上面執行

master 的工作主要為
1. 接收 build 的 trigger
2. 送 nitofications
3. 處理 Jenkins client 上面的請求(像是網頁的)
4. 整合 slaves

## Configuring agents
master 跟 slave 溝通的方式有幾種：
1. SSH: master 本身已經有 ssh-client built-on，所以只有 agent 身上有 SSHD server 就可以辦到，這是一個方便且穩定的方法
2. Java Web Start: Java application 在 agent 上面開起來，然後在 master 跟 slave 之間建立 TCP 連線，如果 agent 在防火牆裡面不容易透過 ssh 連線的話有時候會用這個方法
3. Windows service: 在 master 身上註冊一個 windows server，不建議使用

agent 的設置上又可以分成好幾種：
- Permanent agents
- Permanent Docker agents
- Jenkins Swarm agents
- Dynamically provisioned Docker agents

### - Permanent agents
這種 agent 的缺點就是固定的 slave 數量，有幾個 slave 就要照顧他們不要讓他們輕易掛掉

通常這種範例會有下圖的情況：
需要 build 哪種東西，指定專門的 slave node 處理
![](https://i.imgur.com/yhL35KY.png)

如果要做一個 slave node 可以參考下面做法：
首先要把這個 node 準備好 => 一台機器跟環境設定
因為 Jenkins master 會在 slave node 上面安裝 client program，我們需要安裝跟 master 同樣的 Java version 在 slave node 上面

如果 master 是透過 ssh 連到 slave 就需要產生 master 這邊的 ssh key

接著就是在 master 這邊的 web UI 上面做設定

Manage Jenkins => Manage Nodes => New Node => Permanent Agent

之後有些比較需要注意的選項：

Launch method 在這個範例中使用 ssh 連線

然後 Remote Root directory 是指在 slave node 這邊選擇一個資料夾給 master 存放東西，所以 master 使用的 ssh user 需要對這個資料夾有 read / write access

接著會跳出一個 popup window 要輸入一些 credential，這個範例中我們選擇 `SSH Username with private keys`，然後填入自己的 ssh username 跟 ssh private key，這樣就設定完成

參考資料：
https://chathura-siriwardhana.medium.com/step-by-step-guide-to-add-jenkins-slave-nodes-f2e756c8849e

### - Permanent Docker agents
這種的 slave node 基本上每一台都會是一樣的，但每一台 slave node 上面需要裝好 Docker engine，至於環境的不同會寫在 build 裡面

在 pipeline 撰寫上的唯一不同就是需要指定 Docker image
```s
pipeline {
     agent {
          docker {
               image 'openjdk:8-jdk-alpine'
          }
     }
...
}
```
在這種情況下，每一個 slave agent 都長得一樣，只是在不同 script 下面我們會指定不同的 image，但如果不用 image 的話，通常每種不同專長的 slave node 有不同 label，會指定不同 script 使用不同 label 的 slave node
![](https://i.imgur.com/mBUd0kJ.png)

### Jenkins Swarm agents
Jenkins Swarm 可以讓我們動態增加 slave，不用每一台都是做設定

乍看之下這個方法可能沒什麼用，我們只是把設定 agent 的工作從 master 搬到 slave node 來做，但還是需要手動做，但在後面的 Clustering with Docker Awarm 的部分比較能感受它的價值

要做到這個需要裝個 pugin: `Self-Organizing Swarm Plug-in Modules`，接著在每一台可以做為 slave node 的機器上面安裝 Jenkins Swarm slave application，可以透過 `swarm-client.jar` 這個 application 安裝，指令如下
```
> java -jar swarm-client.jar -master <jenkins_master_url> -username
   <jenkins_master_user> -password <jenkins_master_password> -name jenkins-
   swarm-slave-1
```

### Dynamically provisioned Docker agents
還有另一個選項是，當有 build 產生的時候，就動態的產生一個 slave agent 處理

要做到這個方法需要在 master 這邊裝上 `Docker plugin`

Manage Jenkins => Configure System => Cloud => Add a new cloud => Docker
接著會填入一些資訊:

Docker URL: 要填入 Docker host machine 的 address，這也是之後那些 slave node(container) 會在哪裡跑起來

如果要讓 Docker host 跑在跟 master 同樣的一台機器上，Docker daemon 需要 listen to docker0 network interface
![](https://i.imgur.com/2LA17Xl.png)

接著要填入一些 Docker template 的參數
![](https://i.imgur.com/Uq7QGIL.png)
Docker image: 目前最多人用的 image 是這個 `evarga/jenkins-slave`

credentails: 對於 上面這個 image 來說 credentials 是 username: jenkins password: jenkins

Instance capacity: 設定最多可以多少個 agent(container) 同時跑起來

![](https://i.imgur.com/cM2NhNh.png)
跑的流程如上圖所示：
1. 當有個 Jenkins job，master 就會在 Docker host 跑起一個用 jenkins-slave image 做的 container，這個 container 實際上就是裝好 SSHD server 的 ubuntu container
2. master 會主動把這個新做出來的 slave node 加到自己的 agent list 裡面
3. agent 用 ssh 去執行這個 build 任務
4. 完成之後 master 會把 container 停掉並移除 container

# Continous Integration Pipeline
Jenkins pipeline 主要由兩個元件組成： stages 跟 steps

step 是指單一個操作，而 stage 則是邏輯上用來區別不同 steps 的東西，我們可以以 stage 為單位觀察 Jenkins pipeline 目前的進度
![](https://i.imgur.com/oWTo3sh.png)

## Pipeline syntax

- pipeline: 每一個 piepline 會定義在 `pipeline` 這個 block 裡面，其中 `stage` 跟 `steps` 都在寫這個 pipeline 裡面最主要執行的步驟

- steps: `steps` 是 pipeline 最基本的組成單位，有一些基本的 operations 可以使用, 其他 syntax可以參考這個頁面:https://jenkins.io/doc/pipeline/steps/
  - sh: 執行 shell command
  - custom: Jenkins 還有內建很多 operaions, 比方說 echo，但大部分都是把 sh 的 command 再包一層起來
  - script: 會執行 groovy-based code

step 的其他 syntax(主要是 basic steps):https://jenkins.io/doc/pipeline/steps/

- post: `post` 這個 block 會定義一個或多個 steps，這些 steps 會在符合條件的情況下(比方說 always 或者成功 / 失敗)，在 build 結束之後執行，常常是送通知等等事情，除了 always 還有這些選項：`changed`, `failure`, `success`, `unstable`

- agent: `agent` 則是指定這個工作給誰執行，可以用 `label` 來指令 slave node 或者 `docker` 指定 container

- triggers: `triggers` 這個設定定義了怎麼自動化 trigger pipeline， `cron` 是設定固定時間排程，`pollscm` 則是檢查 repo 是不是有更新

- options: `options` 定義一些選項，比方說 `timeout` 可以指定 pipeline 最長執行時間，`retry` 可以指定失敗的話重新執行的次數

- environment: `environment` 定義 env var 的 key value pair

- parameters: `parameters` 定義 user 應該丟進來的 parameters

- when: `when` 某個條件，決定這個 stage 是不是應該執行



```
pipeline {
     agent any
     triggers { cron('* * * * *') }
     options { timeout(time: 5) }
     parameters {
             booleanParam(name: 'DEBUG_BUILD', defaultValue: true,
             description: 'Is it the debug build?')
     }
     stages {
          stage('Example') {
               environment { NAME = 'Rafal' }
               when { expression { return params.DEBUG_BUILD } }
               steps {
                    echo "Hello from $NAME"
                    script {
                         def browsers = ['chrome', 'firefox']
                         for (int i = 0; i < browsers.size(); ++i) {
                              echo "Testing the ${browsers[i]} browser."
                         }
                    }
               }
          }
     }
     post { always { echo 'I will always say Hello again!' } }
}
```
## Triggers and notification
如果只是單純把 pipeline 寫出來，我們還是要手動去啟動，所以要真的自動化也要讓這些 pipeline 被自動 trigger

所有的 trigger 我們可以分成三個部分

### - External
這個方法主要有一個外在因素(notifier)去叫 Jenkins 開始執行 job，有可能是另一個 pipeline 或者 Github
![](https://i.imgur.com/ok1yFgR.png)

### - Polling SCM
這個方法比較不直覺，Jenkins 會固定時間 call github 然後檢查是不是這個 repo 有任何新的 push，有才去開始 job
![](https://i.imgur.com/bza3FsK.png)

有時候可能會用到這種方法：
1. Jenkins 如果架在防火牆內
2. 常常有 commit 但是每次 build 都需要花很長一段時間，這時候如果每次 commit 都去 build，可能會造成 server overload
```
triggers {
     pollSCM('* * * * *')
}
```
### - Scheduled build
表示 Jenkins 單純照著時間排成進行，不管有沒有其他外在因素
![](https://i.imgur.com/29IYbaN.png)

### Automated Acceptance Testing
![](https://i.imgur.com/yFmNp2c.png)

範例中 pipeline 整個流程像是下面這樣，把 code 推上去 Github(source code repository) 之後，自動 trigger build binary file 儲存到 Artifact repository，用這些 build 好的檔案執行 Acceptance testing, Non-functional testing，都通過的話就 release 到環境

而如果我們是直接用 docker 跑的話，這裡的 artifact 可以是 Docker registry(ex. Docker Hub)

其中 Jenkins 的運作可以看下圖
![](https://i.imgur.com/6eivOq3.png)

# Configuration Management with Ansible
Configuration Management 包括了 Application configuration 跟 Infrastructure configuration

Application configuration 通常包含了一些 flags 或者 propertiy files，像是 database address, logging level 之類的

Infrastructure configuration 則是定義在每台 server 上面要裝好哪些 dependencies，並且指定 applications 之間應該怎麼編排
![](https://i.imgur.com/DFvzOGe.png)
通常會有一個 configuration management tool 去讀取我們寫好的 configuration file 然後把環境準備好

書裡面還寫了很多怎麼使用 Ansible 的部分, 之後會再整理成另一篇

# Continous Delivery pipeline
## Nonfunctional testing
對於 non-functional testing 到底要測試什麼？像是對於使用者來說，一秒就大概是使用者覺得服務使用上沒有被打斷的極限，大於一秒就很有可能讓使用者不繼續使用你的服務

執行 non-functional testing 的步驟應該經歷下面這些過程：
1. 列出所有 non-functional test 清單
2. 決定哪些應該是不需要的，不需要的原因可能很多，像是這個測試的製作跟維護成本太高，或者本身系統是設計給單一 instance 使用，或者這個系統很小，目前使用簡單的 performance test 就已經夠了等等
3. 把他們拆成兩大類：
     - Continuous Delivery: 可以加到 pipeline 的
     - Analysis: 不適合加到 piepline 的，可能是執行時間太長等等原因
4. 對於應該放到 piepline 這些 test 加上對應的 stage，把他們放進去
5. 對於不應該放到 pipeline 的這些 test 準備自動化腳本，討論什麼時候該執行他們

以下列舉一些常見的 non-functional test
### Performance testing
這是在測試系統的反應跟穩定度，最簡單的就是送個 request 然後測量 round-trip time(RTT)

有時候可以使用專門的框架來測試時間，像是 Java 的 JMeter

### Load testing
load testing 是用來測試當有很多 concurrent requests 的時候，系統會有怎樣的行為，通常是測試平均的 request-response time，畢竟只有一個單獨 request 的時候，系統可能很快，但在 1000 個 request 同時打的情況下就不一定了

### stress testing
stress testing 又稱為 capacity testing 或者 throughput testing，這是用來測試同一時間有多少個 concurrent user 可以使用 service，雖然跟 load testing 很像但他們不一樣

在 load testing 裡面我們固定 concurrent 數量，然後測試 response time 超過某設定值就讓這個測試失敗

而在 stress testing 裡面，固定 response time，慢慢增加 thorughput 來找到臨界值

因此在 CD pipeline 裡面不適合加上 stress test，因為他需要比較長時間的嘗試，而是應該準備一個 test script，當作分別的 Jenkins pipeline 來執行，只有在需要測試的時候去 trigger，比方說我們覺得某段 code 可能會影響 performance 的時候可以測試看看

### Scalability testing
這在測試當我們使用不同 server 數量的時候，response time 如何反應，最棒的表現會是線性，像是當有一台 server 的時候，如果有 100 個 request，每個 request 平均是 500ms，如果有兩台應該要可以 serve 200 個 request，平均 response time 還是 500ms，但實際上很難做到，因為要在不同 server 間 keep data consistent

這種測試應該提供圖表比較好參考機器的數量跟 concurrent user 之間的關係

這個測試也不適合放在 CD pipeline 裡面

### Endurance testing
也稱為 longevity test, 把系統跑起來很長一段時間看看 performance 是不是有 drop，可以偵測有沒有 memory leak issue 跟 stability issue

因為這要跑很長一段時間，也不適合放在 CD piepline 裡面

### Security testing
Securirty test 又有分不同面向，如果是一些 authentication / authorization 應該直接放在 accesptance test phase, 但有一些像是 SQL injection 的防護，則應該歸類在 non-functional tests

但這些測試應該放在 CD pipeline 中
### Maintainability testing
這是在測試整個系統是不是好維護，檢查有沒有一些 anti pattern，然後有一些 design pattern 應該被使用讓這個系統比較好維護，測試 test coverage 也算是其中一環

### Recovery testing
測試萬一系統 crash 之後，多快可以 recover，有些公司甚至故意讓 production 環境 randomly fail，比較有名的像是 Netflix Chaos Monkey tool，會隨意關掉 production 的 instance，讓工程師寫出對於系統 fail 更彈性的 code

## Application versioning
在 versioning 方面通常有下面幾種策略：
- segment versioning: 最主要的一種，通常是以 `x.y.z` 這樣的方式表現
     - x: major version, 當他增加的時候表示不需向後相容
     - y: minor version, 當他增加的時候表示需要向後相容
     - z: build number, 通常表示需要前後相容
- timestamp: 直接用時間日期表示版本號，在 coding 上比較方便，因為不用人工下版本號
- hash: 用隨機亂數表示版本號，缺點是沒辦法從這些亂數判斷版本誰先誰後
- mixed: 組合前面幾種方式

## Complete continuous delivery pipeline
目前完整的 delivery process 就如同下面 Jenkins file 所寫的
```
   pipeline {
     agent any
     triggers {
       pollSCM('* * * * *')
     }

     stages {
       stage("Compile") { steps { sh "./gradlew compileJava" } }
       stage("Unit test") { steps { sh "./gradlew test" } }
       stage("Code coverage") { steps {
         sh "./gradlew jacocoTestReport"
         publishHTML (target: [
                 reportDir: 'build/reports/jacoco/test/html',
                 reportFiles: 'index.html',
                 reportName: "JaCoCo Report" ])
          sh "./gradlew jacocoTestCoverageVerification"
       }  }

       stage("Static code analysis") { steps {
         sh "./gradlew checkstyleMain"
         publishHTML (target: [
                 reportDir: 'build/reports/checkstyle/',
                reportFiles: 'main.html',
                reportName: "Checkstyle Report" ])
       }  }

       stage("Build") { steps { sh "./gradlew build" } }

       stage("Docker build") { steps {
          sh "docker build -t leszko/calculator:${BUILD_TIMESTAMP} ."
       }  }

       stage("Docker push") { steps {
          sh "docker push leszko/calculator:${BUILD_TIMESTAMP}"
       }  }

      stage("Deploy to staging") { steps {
          sh "ansible-playbook playbook.yml -i inventory/staging"
          sleep 60
       }  }

       stage("Acceptance test") { steps { sh "./acceptance_test.sh" } }
       # 在 staging 執行 UAT test，都正常才會往下執行部屬到 production

       // Performance test stages

       stage("Release") { steps {
          sh "ansible-playbook playbook.yml -i inventory/production"
          sleep 60
       }  }

       stage("Smoke test") { steps { sh "./smoke_test.sh" } }
       # 這一步只是檢查正確的版本有沒有被部署到 production 上
    }
 }
```
# Clustering with Docker Swarm
目前我們在 ansible script 裡面 hard code instance ip 資訊，代表我們沒辦法隨心所欲 scale instance，如果不想要加一個 instance 就改變我們的 code，也就是不想去管這些 instance ip 的話，我們應該善用 server clustering 的機制

## Server Clustering
server cluster 是一群互相連線的電腦，他們像是存在在同一個系統一樣一起工作，彼此之間通常是透過區網連線，連線速度必須快到就算他們是分散式系統，這樣的影響也要很小

使用者會透過一個 manager 去連到這個 cluster，這個 manager 需要去編排這些 process，像是 task dispatching, service discovery, load balancing, worker failure detection 等等
![](https://i.imgur.com/PmG9ZdI.png)

## Docker Swarm
Docker 這個團隊自己出了一套 clustering 系統叫做 Docker swarm

他會把多個 Docker hosts 轉變成一個 cluster, 稱之為 swarm，這些 host 可能分別扮演 manager 或者 worker 的角色，每個 swarm 裡面至少一個 manager

- node: 主機的別稱, 也可以稱作 host, node 又分成 manager 跟 worker 兩種不同角色

- Task: scheduling unit 的最小單位，會定義 container 的 image 還有一些需要給 container 執行的 command

- service: 在 node 上面執行的 tasks，比方說這個 service 可能包含三個不同的 tasks 並且每個 task 裡面有一個 container

- Replica: 每個 node 上面的每一個 container 都是一個 replica
![](https://i.imgur.com/hcidaoB.png)

雖然這張圖上面每個 node 都只有跑一個 container，但也有可能所有 container 跑在同一個 Docker host 上面，這要靠 manager 去編排
![](https://i.imgur.com/VWDglLK.png)

# Advanced continous delivery
## Pipeline
### Parallelizing pipelines
對很多 time-consuming 的 pipeline step 來說，像是 performance test，最好是平行執行節省時間

在 Jenkins 平行執行的方式主要又有以下兩種

- Parallel steps: 在同樣的 agent 上面平行執行，因為所有相關檔案會放在同一個機器上，所有執行上相對簡單，只是 resource 就會被限制在這一個 agent 裡面
- Parallel stages: 每一個 stage 會放在不同的 agent 上執行，也因此如果這個 stage 要用到另一個 stage 的某個檔案的話，要注意 file transfer(需要用到 Jenkinsfile 的 stash 關鍵字)

以下面的 parallel step 舉例

Stage1 的 step `one` 跟 step `two` 是平行執行的，而且 stage2 會等到前面兩個 step 都執行完才開始執行
```
   pipeline {
      agent any
      stages {
          stage('Stage 1') {
              steps {
                  parallel (
                          one: { echo "parallel step 1" }, # 平行執行 step1
                          two: { echo "parallel step 2" }  # 平行執行 step2
                  )
              }
          }
          stage('Stage 2') {    # stage2 等到 stage1 執行完成才會開始
              steps {
                  echo "run after both parallel steps are completed"
              }
          }
      }
   }
```
### Reusing pipeline components
很多時候，大部分的 code 會是重複的，只是要修改部分的參數，又或者是在很多不同的 pipeline 裡面要用到同一段 code，我們分別可以用 parameterized build / shared libraries 來解決
- parameterized build

下面這個例子吃一個外來的參數 `Environment`

這種做法在只有小部分的參數需要替換的時候，可以幫我們省下寫很多重複的 code，但不宜過度使用，不然 pipeline 可能變得難以理解
```
   pipeline {
      agent any
      parameters {
          string(name: 'Environment', defaultValue: 'dev', description: 'Which
            environment (dev, qa, prod)?')
      }
      stages {
          stage('Environment check') {
              steps {
                  echo "Current environment: ${params.Environment}"
              }
          }
      }
   }
```
![](https://i.imgur.com/2CnASAk.png)

- shared libraries
如果我們很多個 Jenkins file 要用到同一段 code，我們可以單獨把這些重複的 code 變成一個 repo 然後 include 他們

比方說我們建一個 Github repo, 這個 repo 只有一個檔案(慣例上我們把方法當作檔名，放在 `vars` 這個資料夾內)
```
# vars/sayHello.groovy  # 等等這個檔名 sayHello 就會變成可以使用的 step
/**
* Hello world step.
*/
def call(String name) {
  echo "Hello $name!"
}
```
接著在我們的 Jenkins 去 include 這個 library

Manage Jenkins => Configure System => Global Pipeline Libraries
![](https://i.imgur.com/UPSKJVB.png)

```
   pipeline {
      agent any
      stages {
          stage("Hello stage") {
            steps {
              sayHello 'Rafal'
            }
          }
      }
  }
```
剛剛使用的檔案 `sayHello` 可以直接當我們的 pipeline step

更多shared library例子：
https://www.jenkins.io/doc/book/pipeline/shared-libraries/

## CD Best practices
以下列出本書作者對於 CD best practice 建議
1. own process within the team
Development and Operations from the beginning to the end, from receiving requirements to monitoring the production:

- 確保自己會 pipeline 的每一個 stage, 包括怎麽 build software, 怎麼 release
- 避免有一個 pipeline 專家，大家都應該要會
- 找到一個可以分享 pipeline 狀況的方法，常用的方法是一個大螢幕放在公用空間
- 如果 developer / QS / operation 是不同專家，至少要在同一個 agile team, 根據專長分 team 常常造成沒有人對產品負責

2. automate everything!
如果你正在做某件事情第二遍，嘗試把他自動化

3. version everything!
包括 source code, build scripts, 測試, configuration management, pipelines, documents 等等，最好一切都要做 version 控制

4. use business language for acceptance tests!
用商業語言來寫測試可以改善雙向溝通

5. be ready to roll back!
> You don't need more QAs, you need a faster rollback

為了 rollback 的加速，可以考慮藍綠部署 / 金絲雀部署

6. don't underestimate the impact of people
就算是 QA 跟 IT operations 都是 Devops team 的一部分，一定會需要他們的專業，如果他們在做一些重複性的事情，應該要提供 training 把這些事轉為自動化

7. build in traceability!
number of requests, the latency, the load of production servers, 這些都應該做 monitor, 包括任何你覺得可以幫助你分析目前產品的資訊

8. integrate often!
> Continuous is more often than you think.

作者建議多使用 Trunk-base 開發模式 / feature toggle

9. build binaries only once!
對於 compile language 來說，應該只 build 一次，並在不同環境使用同一份 binary file, 除了節省時間 / 資源之外也可以避免不同環境之間的差異

10. release often!
作者建議甚至可以每一次的 commit 都做一次 release，避免一年做一次 release 然後事前可能要為這次的 release 做長達三個月的準備
> If it hurts, do it more often