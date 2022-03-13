---
title: "Note About Jenkins"
catalog: true
toc_nav_num: true
date: 2022-3-13 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1508028922235-7b9a1b690358?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80"
tags:
- Jenkins
catagories:
- Devops
updateDate: 2022-3-13 22:26:24
# top: 1
description: Note About Jenkins
---

## Intro
最近幾個禮拜碰了很多 Jenkins，覺得眉角滿多的，覺得值得做一篇記錄下來，其中尤其環境變數這邊碰到滿多出乎意料的狀況，記錄下來才不會忘記然後重踩一次坑

## Outline
- [Environment variable](#environment-variable)
- [Credentails](#credentails)
- [Conditions](#conditions)
- [Docker](#docker)
- [Build other job in a pipeline](#build-other-job-in-a-pipeline)
- [Tips](#tips)

## Environment variable
### Automated exported variables
有一些環境變數會自動被放到 Jenkins 執行環境中，像是 BUILD_ID / JOB_NAME 等等，可以參考[官網](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#using-environment-variables)

另外放在這個 pipeline 裡面的 parameters 也都會自動被 export 出來

### How to use
使用環境變數，可以清楚地在前面加上 env. 來拿，或者直接呼叫變數名字也可以
```groovy
node {
  sh "echo ${env.MY_VARIABLE}"
  sh "echo ${MY_VARIABLE}"
}
```

### Scope
environment variables 可以設定在全域也可以設定在 stage 裡面，如果在 stage 裡面就只有那個 stage 可以用到

```groovy
pipeline {
    environment {
        ENVIRONMENT = "${params.Environment}"
    }
    stages {
      environment {
        ENVIRONMENT2 = "${params.Environment2}"
      }
      stage('Setting1') {
        steps {
          script {
            sh "echo ${ENVIRONMENT}"  // OK
            sh "echo ${ENVIRONMENT2}"  // OK
          }
        }
      }
    }
    stages {
      stage('Setting1') {
        steps {
          script {
            sh "echo ${ENVIRONMENT}"  // OK
            sh "echo ${ENVIRONMENT2}"  // empty
          }
        }
      }
    }
```
如果不想在全域設定環境變數污染環境，可以用 [withEnv](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/#withenv-set-environment-variables)

下面的例子使用單引號，表示這個 env 是 shell 拿到的
```groovy
node {
  withEnv(['MYTOOL_HOME=/usr/local/mytool']) {
    sh '$MYTOOL_HOME/bin/start'
  }
}
```

還有另一個設定環境變數的方式 `env.<變數名字>=`，但如果使用 `env.` 的方式設定，那也是有 scope 限制，跟使用最外面的 environment 設定的效果不同
```groovy
node {
  env.MY_VARIABLE = 'test'
}
```
如果不會在執行的環境裡面被使用，就盡量不要環境變數，畢竟 export 這麼多環境變數可能影響程式的行為

如果需要全域的變數而不是環境變數的話，建議在最前面全域的地方宣告之後，後面再去定義
```groovy
def TASK_NUM = ''
def Image
node {
  TASK_NUM = 'test'
  Image = docker.image('myimage')
}
```

### Case preserving
這個地方我覺得滿雷的，如果前面已經有一個變數，後面要再去定義另一個變數，他們拼起來一樣只有大小寫不同的時候，就會去改變原本的變數而不是宣告另一個變數

```groovy
pipeline {
    agent { label 'myec2' }
    parameters {
        choice(name: 'Environment', choices: ['develop'])
    }
    environment {
        ENVIRONMENT = 'production'
        TASK_NAME = 'my_task'
    }
    stages {
        stage('Settings') {
            steps {
                script {
                  // Environment 從 develop 被改成 production
                  // 並不會去宣告另一個 ENVIRONMENT 的變數
                  sh 'echo $ENVIRONMENT' // empty
                  sh 'echo $TASK_NAME'   // 'my_task'
                }
            }
        }
    }
}
```

## Credentails
credentials 有分成多個種類，可以參考[這裡](https://www.jenkins.io/doc/book/using/using-credentials/)

我比較常用的有 `Secret text` 跟 `Username and password` 這兩種

`Secret text` 使用起來跟前面的環境變數滿像的，拿到的時候就是一個字串
```groovy
stage ('Secrets') {
    environment {
        TEXT = credentials('SECRET_TEXT')
    }
    steps {
        sh "cp $TEXT .env"
    }
}
```

`Username and password` 自動會拿到兩組字串，變數會是後面加上 `_USR` 跟 `_PSW` 的 suffix

```groovy
stage ('Secrets') {
    environment {
        TEXT = credentials('SECRET_USER_PASS')
    }
    steps {
        script {
          def GIT_CREDENTIAL = "https://${TEXT_USR}:${TEXT_PSW}xxx.git"
        }
    }
}

```

`withCredentials` 跟 `withEnv` 的使用方法差不多，但後面要註記使用的 credential 的種類
```groovy
withCredentials([usernamePassword(
  credentialsId: 'TEXT',
  usernameVariable: 'TEXT_USR',
  passwordVariable: 'TEXT_PSW')]) {
  def url = "https://${GIT_USR}:${GIT_PSW}xxx.git"
  sh "git clone ${url}"
}
```

## Conditions
condition 可以讓我們來定義達到某個條件的時候這一步再去執行

jenkinsfile 的 [condition](https://www.jenkins.io/doc/book/pipeline/syntax/#when) 有滿多種可以用

我比較常用到的有兩種： `environment` 跟 `expression`

```groovy
stage('my stage')
    when {
        // 當 REPO_NAME 這個環境變數等於 'my repo' 才去執行
        environment name: 'REPO_NAME', value: 'my repo'
    }
    steps {
      ...
    }
}
```

expression 相較之下是比較萬用一點
```groovy
// 當 params.CopyFromDevelop 有東西才去執行
when {
    expression { params.CopyFromDevelop }
}
// 也可以用 regular expression
when {
  expression { params.AdditionalTypes =~ /another/ }
}
```

## Docker
在容器化越來越流行之下，Jenkins 也整合了很多 docker 的功能

下面的範例示範怎麼把 image 從某個 ECR 拉下來再放到另一個 ECR repo
```groovy
stage('Pull image') {
    steps {
        script {
            def CopiedImage
            docker.withRegistry("https://xxxx.dkr.ecr.ap-south-1.amazonaws.com", "ecr:ap-south-1:aws-instance-role") {
                sh "docker pull xxxx.dkr.ecr.ap-south-1.amazonaws.com/my-repo:develop"
                CopiedImage = docker.image("xxxx.dkr.ecr.ap-south-1.amazonaws.com/my-repo:develop")
            }
            docker.withRegistry("https://xxxx2.dkr.ecr.ap-south-1.amazonaws.com", "ecr:ap-south-1:another-role") {
                CopiedImage.push("another_tag")
                def new_tag = "another_tag" + '-' + new Date().format('yyyyMMdd-HHmmss')
                CopiedImage.push(new_tag)
            }
        }
    }
}
```

另外也可以把 container 當作 agent 直接在上面執行 job 內容(但 image 需要在這之前先拉到要執行的 slave node)
```groovy
pipeline {
    agent {
        docker {
            customWorkspace '/root'
            image 'my_image'
            label 'tool' // 指定執行的 slave node
            args  "--entrypoint='' -v /etc/passwd:/etc/passwd:ro -e ENVIRONEMT=debug"
        }
    }
}
```

當然也支援直接跑 container 起來，甚至可以用巢狀結構來執行
```groovy
docker.image('mysql:5.7').withRun('-e MYSQL_ALLOW_EMPTY_PASSWORD=yes -p 3306:3306') { mysql ->
    docker.image('redis').withRun('-p 6379:6379') { redis ->
        def image = docker.image('my_image')

        image.inside("-u root"){
            // wait until mysql server up
            sh 'while ! mysqladmin ping -u root -h 127.0.0.1; do sleep 1; done'
            sh "cd my_dir && bundle exec rake db:migrate"
        }
    }
}
```
現在的 slave 也可以直接跑在 container 裡面，但如果 job 裡面又會用到 container，通常會用 docker in docker 的方式來進行，只要把 host 的 `/var/run/docker.sock` mount 到 slave container 裡面的 `/var/run/docker.sock` 就可以用原本 host 的 docker daemon

看到滿多文章都有介紹的，像是[這篇](https://www.gss.com.tw/blog/jenkins-docker)

## Build other job in a pipeline

可以在 job 裡面呼叫別的 job
```groovy
stage('deploy'){
    steps {
        build job: 'build image',
            parameters: [
                string(name: 'Environment', value: params.ENVIRONMENT),
                booleanParam(name: 'WithCache', value: false)
            ]
    }
}
```

## Tips
在 Jenkins GUI 上面 create jobs 的時候可以空 build 一次，如果沒有文法錯誤，雖然失敗但就會幫忙把 parameters 的部分建出來