---
title: "CircleCI Dynamic Config 介紹"
catalog: true
toc_nav_num: true
date: 2024-12-17 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1655694774003-69c69d7ee5bb?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
tags:
  - Devops
catagories:
  - Devops
updateDate: 2024-12-17 22:26:24
# top: 0
og_image: "https://images.unsplash.com/photo-1655694774003-69c69d7ee5bb?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
description: CircleCI Dynamic Config 介紹
---

最近因為工作需要，接觸了 CircleCI 的 [Dynamic Config](https://circleci.com/docs/dynamic-config/) 功能，使用之後覺得這個功能既強大又非常的有幫助，所以想來好好介紹一下。

以下會介紹一下這個功能，透過範例來說明他解決了什麼問題，以及我的使用案例跟心得。

## 什麼是 Dynamic Config？

簡單來說，Dynamic Config 是透過 `.circleci/config.yml` 定義的流程（workflows），動態決定接下來的流程，官方稱一開始的設定為 "setup configuration"，而接下來動態產生的設定為 "dynamic configuration"。

下一個流程的配置（dynamic configuration）可以是事先準備好的檔案內容，也可以是動態產生的設定。

實際上在一開始的流程中，會產生一個 `CIRCLE_CONTINUATION_KEY` 的環境變數，用它來打 [Continue a pipeline API](https://circleci.com/docs/api/v2/index.html#tag/Pipeline/operation/listPipelines) 來繼續下個流程（[ref](https://circleci.com/docs/dynamic-config/#how-dynamic-config-works)），但實際上使用的時候並不用知道這些，只需要知道如何使用他們提供的 orb 來完成這些事情即可。

## Dynamic Config 功能解決了什麼問題？

在一般的 CircleCI 使用情境中，我們會在 `.circleci/config.yml` 中定義自動化流程，在 [官方文件](https://circleci.com/docs/workflows/#workflows-configuration-examples) 中可以看到很多範例

然而，當流程變得複雜時，就會遇到以下問題：

- 流程過於複雜，難以理解。
- 所有組件（commands、jobs、workflows）都必須寫在同一個檔案中，導致文件難以閱讀和維護。
- 當前後端同時存在於一個專案中，無法根據變動的檔案動態選擇要執行的流程。

而這些問題都可以透過 Dynamic Config 來解決，以下是一些來自 [官方文件](https://circleci.com/docs/using-dynamic-configuration/) 的範例。

## 範例

### 動態產生下個流程的 YAML 配置檔案

在這個範例中，setup configuration 裡面定義的流程會產生 `generated_config.yml` 這個檔案，而下個流程就會根據這個檔案來執行，這表示 Dynamic Config 支援憑空生成的配置檔案作為後續的 workflow 設定。

這裡使用到的 `circleci/continuation@1` 是一個 Dynamic Config 常常會用到的重要 orb（相當於 CircleCI 中的「套件」），透過它可以方便地串接下一個設定檔。

```yaml
# .circleci/config.yml
version: 2.1
setup: true
orbs:
  continuation: circleci/continuation@1

jobs:
  setup:
    executor: continuation/default
    steps:
      - checkout
      - run: # run command to run script to generate YAML config
          name: Generate config
          command: |
            ./generate-config > generated_config.yml
      - continuation/continue:
          configuration_path: generated_config.yml # use newly generated config to continue the pipeline

workflows:
  my-setup-workflow:
    jobs:
      - setup
```

### 根據檔案變動決定要執行的流程

在這個範例中，`.circleci/config.yml` 中定義的 workflow 執行完成後，產生一些參數，根據 `.circleci/continue_config.yml` 啟動並傳遞參數給下一個 workflow。

這裡使用了 [circleci/path-filtering](https://circleci.com/developer/orbs/orb/circleci/path-filtering) orb，它能根據檔案變動設置 pipeline 參數，進而動態選擇執行的 workflow。

例如：
- 若 `service1/` 目錄內的檔案變動，會將 `run-build-service-1-job` 參數設為 true，執行 `service-1` workflow。
- 若 `service2/` 目錄內的檔案變動，則執行 `service-2` workflow。

```yaml
# .circleci/config.yml
version: 2.1
setup: true

orbs:
  path-filtering: circleci/path-filtering@1

workflows:
  always-run:
    jobs:
      - path-filtering/filter:
          name: check-updated-files
          mapping: |
            service1/.* run-build-service-1-job true
            service2/.* run-build-service-2-job true
          base-revision: main
          config-path: .circleci/continue_config.yml # this is the default so not actually required but left in to illustrate options
```

```yml
# .circleci/continue_config.yml
version: 2.1
orbs:
  maven: circleci/maven@1.2.0

parameters:
  run-build-service-1-job:
    type: boolean
    default: false
  run-build-service-2-job:
    type: boolean
    default: false

workflows:
  service-1:
    when: << pipeline.parameters.run-build-service-1-job >>
    jobs:
      - maven/test:
          name: build-service-1
          command: 'install -DskipTests'
          app_src_directory: 'service1'
  service-2:
    when: << pipeline.parameters.run-build-service-2-job >>
    jobs:
      - maven/test:
          name: build-service-2
          command: 'install -DskipTests'
          app_src_directory: 'service2'
  run-integration-tests:
    when:
      or: [<< pipeline.parameters.run-build-service-1-job >>, << pipeline.parameters.run-build-service-2-job >>]
    jobs:
      - maven/test:
          name: run-integration-tests
          command: '-X verify'
          app_src_directory: 'tests'
```

### 根據變動檔案動態產生配置檔案，並把零組件配置在不同檔案

這個專案中，我們有兩個目錄，`src` 和 `docs`，分別存放程式碼和文件，而他們也有各自定義的流程（workflows）分別定義在 `code-config.yml` 和 `docs-config.yml` 中。
```
.
├── .circleci
│   ├── code-config.yml
│   ├── config.yml
│   ├── docs-config.yml
│   ├── no-updates.yml
│   ├── shared
│   │   └── jobs
│   │       ├── any-change.yml
│   │       ├── lint.yml
│   │       └── test.yml
│   │   └── workflows
│   │       ├── run-on-any-change.yml
|   |       └── @shared.yml
├── README.md
├── docs
│   └── my-docs.txt
└── src
    └── my-code.txt
```

在這個範例中，透過 `circleci config pack` 指令，可以把原本分散的 workflows / jobs 重新組合成 `.circleci/shared-config.yml`。(前面有提到正常情況下，我們會把 workflows / jobs 都定義在 `.circleci/config.yml` 中，使用這方式就可以分開定義比較複雜的 workflows / jobs)

接著根據變動的檔案，決定最後動態產生的檔案樣貌（ex. 若 `src/` 資料夾內檔案有變動，就會動態加上 `.circleci/code-config.yml` 這個檔案內容）
```yaml
version: 2.1
setup: true

parameters:
  always-continue:
    type: boolean
    default: false
  build-code:
    type: boolean
    default: false
  build-docs:
    type: boolean
    default: false

orbs:
  path-filtering: circleci/path-filtering@1.0.0
  circleci-cli: circleci/circleci-cli@0.1.9
  continuation: circleci/continuation@1.0.0

jobs:
  setup:
    executor: path-filtering/default
    steps:
      - checkout

      # Install the CircleCI CLI
      - circleci-cli/install

      # 把 shared 裡面的內容結合成 shared-config.yml
      - run:
          name: Generate shared configuration
          command: circleci config pack .circleci/shared >> .circleci/shared-config.yml

      # The mapping will be used to generate the dynamic configuration for all conditions that match.
      - path-filtering/set-parameters:
          base-revision: pack-validate-continue-main
          config-path: .circleci/no-updates.yml
          mapping: |
            .* always-continue true .circleci/shared-config.yml
            src/.* build-code true .circleci/code-config.yml
            docs/.* build-docs true .circleci/docs-config.yml

      # 根據上一部內容產生動態的 config 檔案
      - path-filtering/generate-config

      # 驗證產生的檔案有沒有錯誤（Optionally）
      # note: 上一步產生的東西會在 /tmp/generated-config.yml
      - run:
          name: Validate config
          command: circleci config validate /tmp/generated-config.yml

      # Continue the pipeline with the generated configuration.
      - continuation/continue:
          configuration_path: /tmp/generated-config.yml

workflows:
  setup-workflow:
    jobs:
      - setup
```

## 我用他來幫助我解決了什麼問題？

我們原本的流程（workflow）過於複雜，不同 workflow 的啟動條件包含大量條件判斷，讓人難以理解執行邏輯。

我將 parameters、commands 和 jobs 等基本組件抽離到 `shared_config.yml`，並且把流程啟動條件判斷拔除，把不同情境的流程分別定義在不同檔案中（檔案名稱本身也加強了可讀性），根據當下情況，產生最終的流程。

這樣的調整讓整體結構變得簡單易懂的同時，也降低了維護成本。

調整前後的檔案結構如下：

```
# 調整前
.circleci
└──config.yml

# 調整後
.circleci
├── config.yml
├── config_original.yml
├── shared_config.yml
└── workflows
    ├── pr_workflow.yml
    ├── production_backend_deploy_workflow.yml
    ├── production_frontend_deploy_workflow.yml
    ├── staging_backend_deploy_workflow.yml
    └── staging_frontend_deploy_workflow.yml
```

## 使用限制

Dynamic Config 雖然強大，但也有一些限制，在 [官方文件](https://circleci.com/docs/dynamic-config/#config-continuation-constraints) 的眾多限制中，我想提出兩個我覺得最重要的限制：
1. 一個完整的 pipeline 中 `continue` 的動作只能做一次，無法無限串接。
2. 使用 Dynamic Config 時，setup configuration 中只能啟動一個 workflow（可以透過條件判斷確保只有一個 workflow 被執行）。

## 心得

在理解並使用 Dynamic Config 後，我認為這是 CircleCI 使用者都必須了解的功能。

不像 GitHub Actions 可以將 jobs 和 commands 拆分成多個檔案，CircleCI 原本的單一檔案管理方式非常痛苦。Dynamic Config 的出現，讓工程師能更靈活地拆分和動態控制 pipeline，大大提升了自動化流程的可維護性。