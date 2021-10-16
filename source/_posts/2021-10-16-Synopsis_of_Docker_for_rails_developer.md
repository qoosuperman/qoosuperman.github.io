---
title: "Synopsis of Docker For Rails Developer"
catalog: true
toc_nav_num: true
date: 2021-10-16 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1632714394526-1e87d08d56c4?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1770&q=80"
tags:
- Ruby
- Rails
- Docker
- Devops
catagories:
- Rails
- Devops
updateDate: 2021-10-16 22:26:24
# top: 1
description: Synopsis of Docker For Rails Developer
---

## Intro
這篇文章紀錄 `Docker For Rails Developer` 我認為比較值得注意的內容
![](https://i.imgur.com/wTor1cj.jpg)

我認為這本書比較適合剛接觸 Docker，已經有開發 Rails application 的經驗，嘗試把 Rails server 容器化的工程師看

雖然大多數的概念都是從基礎教起，儘管如此，裡面有提到一些細節還滿實用的，對我來說第一次知道有 `docker-machine` 這工具可以用，看起來滿方便的

我沒有根據書的順序整理，而是把覺得重要的地方分成寫 Dockerfile 需要注意的細節 / development / production 環境分別需要注意的事情來做分類

## Outline
- [Intro](#intro)
- [Details when using Docker](#details-when-using-docker)
- [Create Development environment in container](#create-development-environment-in-container)
- [Run production environment](#run-production-environment)

## Details when using Docker
### CMD instruction in Dockerfile
Dockerfile 裡面的 instruction 很多有兩種形式： `Exec` form 跟 `Shell` form

```Dockerfile
CMD ["bin/rails", "s", "-b", "0.0.0.0"]
```
這種表示方法是 `Exec` form

如果這樣使用，rails server 會是這個 container 裡面的第一個 process(PID 1)，可以確保他正確的接收 unix signals，是比較建議的用法

```Dockerfile
CMD bin/rails s -b 0.0.0.0
```

這種 form 則是 `Shell` form，Docker 會用 `/bin/sh -c` 去執行這些指令，所以他會這樣執行：`/bin/sh -c bin/rails s -b 0.0.0.0`，這樣一來第一個 process 就不是 rails server 而是 `/bin/sh`

因為 `/bin/sh` 不會對他的 subproces 傳訊號，所以要關掉 server 的時候可能會導致一些問題，一般來說比較建議 `Exec` form

### dockerignore file

可以用 `.dockerignore` 這個檔案避免一些機密檔案被放到 image 裡面

以下是通常會放進去的檔案
```
#.dockerignore

.git
.gitignore

log/*

tmp/*

*.swp
*.swo
```

### Cache
當 Dockerfile 其中的步驟改了，這一層 layer 的 cache 就會被 invalidate

另外對於 `COPY` 這個指令，只要裡面包含的檔案有改過，cache 也會被 invalidate

然後 image 的每個 layer 都是根據前一層 layer build 起來，因此越前面的步驟改了，後面的 layer 都要重新 build

儘管如此，不注意 cache 的時候還是有可能產生問題，可以看看下面的例子

```Dockerfile
RUN apt-get update -yqq
RUN apt-get install -yqq --no-install-recommends nodejs
```
如果我們想要裝最新的 package，但因為前面 update 的指令沒有變，所以已經裝的 package 都是當時做新版的 package，這通常不是我們要的

所以 update 跟 install 最好都寫在一起
```Dockerfile
RUN apt-get update -yqq && RUN apt-get install -yqq --no-install-recommends \
  nodejs \
  vim
```

另外因為前面提到的關係，我們不想要就算只改了 readme，整個 image 也要重新 build

像是下面這樣
```Dockerfile
FROM ruby:2.6

RUN apt-get update -yqq  && apt-get install -yqq  --no-install-recommend nodejs

COPY . /usr/src/app/
# 因為改了 README 這一個 cache 被 invalidate

WORKDIR /usr/src/app
RUN bundle install
# 因為前面 cache invalidate，所以要重新這步
```

這時候可以考慮只把 Gemfile 先 copy 過去
```Dockerfile
FROM ruby:2.6

RUN apt-get update -yqq  && apt-get install -yqq  --no-install-recommend nodejs

COPY Gemfile* /usr/src/app
WORKDIR /usr/src/app
RUN bundle install

COPY . /usr/src/app/
# 就算改了 README，這一個 cache 被 invalidate，不會影響前面的步驟，gem 就不用重裝
```

## Create Development environment in container
### Run rails server
一般在開發環境，我們會這樣跑起 Rails server:

```bash
# 預設跑起來會聽 localhost 的 3000 port
> rails s
```

但如果在 container 裡面跑起 server，對於 container 來說來自 host 的 request 是外面的 request 而不是 localhost，所以需要 bind 在 `0.0.0.0` 這個 IP 上面，表示會聽所有的 IPv4 ip
```bash
> docker run -p 3000:3000 <image_id> bin/rails s -b 0.0.0.0
```

### Advanced gem management
Bundler 跟 Docker 其實想要嘗試做到類似的事情，但現在的機制讓他們有點尷尬的沒辦法做到原本想要做的

Bundler 原本的機制是想要安裝還沒安裝的 gem，但因為現在 container 每次都是全新的環境，所以只要 Gemfile 有小變動每次都要裝全部的 gem, 因為他會清掉後面的 cache

```Dockerfile
COPY Gemfile* /usr/src/app
# 上面有變動就會把下面的 cache 清掉
WORKDIR /usr/src/app
RUN bundle install
```

如果想要更快的跑起來，而且通常是開發環境才可以考慮這個解法： 把 gem cache 在 mount volume

```dockerfile
COPY Gemfile* /usr/src/app
# 上面有變動就會把下面的 cache 清掉
WORKDIR /usr/src/app
ENV BUNDLE_PATH /gems
# 加上這行指定 bundle path
RUN bundle install
```

```docker-compose
version: '3'
services
  web:
    build: .
    volumes:
      - .:/usr/src/app
      - gem_cache:/gems
...
volumes:
  gem_cache:
```

這邊做出一個名為 gem_cache 的 volume，把他 mount 在 container 上，每次要跑 docker-compose 之前先執行

`docker-compose exec web bundle install` 去更新這個 volume 裡面的 gem，接著就可以正常跑起 server

這樣做的缺點是如果 gem 的內容有變動，需要自己注意，否則可能會少裝了什麼套件

### Rails server cant start normally
如果我們把 host 的 `tmp/pids` mount 在本地的 volume 上面，有時候 app 沒有正常關閉可能會遺留 server.pid 這個檔案，他的路徑是 tmp/pids/server.pid

這時候可以考慮寫在 entrypoint 裡面去解決

```dockerfile
ENTRYPOINT ["./docker_entrypoint.sh"]
```

```bash
# docker-entrypointy.sh
#!/bin/sh
set -e
if [ -f tmp/pids/server.pid ]; then
  rm tmp/pids/server.pid
fi

exec "$@"
```

## Run production environment
### env files configuration
同時有 production 跟 development 的環境變數，我們的 config 檔可能長這樣：
```
.env
├── development
│   ├── database
│   └─── web
├── production
│   ├── database
│   └─── web
```

```
#.env/production/web
DATABASEHOST=database
RAILS_ENV=production
SECRET_KEY_BASE=
RAILS_LOG_TO_STDOUT=true
RAILS_SERVE_STATIC_FILES=true
```
SECRET_KEY_BASE 這個環境變數設定 key 用來對 rails 裡面用到的需要加密的資料作加密，其中包括用來加密 cookie，所以如果替換這個環境變數會導致用戶需要重新登入(如果使用 cookie 來做登入機制的話)

Rails 原先預設會把 log 存到 `log/<environment>.log` 的檔案，設定 RAILS_LOG_TO_STDOUT 讓他 print 到 stdout，這樣可以用 docker logs 去看 log

database 相關設定放在 `.env/production/database`
```
#.env/production/database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=my-password
POSTGRES_DB=production_db
```

### Separate dockerfiles
對於 development 跟 production 我們通常會使用不同的 Dockerfile

因為 production 會把 assets 都先 precompile 好，在 development 則是每次 request 都會重新 compile，所以 Dockerfile 會有點不同

```dockerfile
# Dockerfile.production
# 這一行放在 entrypoint 前
RUN bin/rails assets:precompile
ENTRYPOINT ["./docker-entrypoint.sh"]
...
```

### create production-like environment with VM
docker-machine 是一個 CLI tool，他可以搭配不同的 VM 做出 docker machine

這裡我們使用最常用的 VirtualBox

安裝 docker-machine
```bash
> cd /usr/bin
> wget https://github.com/docker/machine/releases/download/v0.13.0/docker-machine-Linux-x86_64
> mv docker-machine-Linux-x86_64 docker-machine
> chmod 755 docker-machine
```

在使用 docker-machine 做出環境之前要先安裝 VirtualBox，安裝完之後就可以下面步驟

```bash
> docker-machine create --driver virtualbox local-vm-1
# 檢查有沒有真的開起來
> docker-machine ls
# 可以 ssh 進去
> docker-machine ssh local-vm-1
# 可以 ssh 進去執行指令
> docker-machine ssh local-vm-1 "<command>"
```

然後我們可以把本地的 docker client 送指令的對象指向 VM 裡面的 docker daemon 而不是 local 的

```bash
> eval $(docker-machine env local-vm-1)
# 也可以切換回來 local
> eval $(docker-machine env -u)
```

docker-machine 甚至可以配合不同的 cloud provider 做出 instance

```bash
> docker-machine create \
--driver digitalocean \ ...

> docker-machine create \
--driver amazonec2 \ ...
```

### multi-stage builds
從 Docker 17.05 開始，可以在 Dockerfile 裡面寫不只一個 `FROM` 每一個 FROM 會開始做新的 stage，然後可以用 COPY 去複製前面一個 stage 裡面的產物

比方說 Rails 就可以複製產生出來的 static files