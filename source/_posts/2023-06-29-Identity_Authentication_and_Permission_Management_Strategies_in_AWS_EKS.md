---
title: "AWS EKS 中的身份驗證與權限管理策略"
catalog: true
toc_nav_num: true
date: 2023-06-29 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1687894986595-da703eb96375?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80"
tags:
- Devops
- AWS
- K8S
catagories:
- Devops
updateDate: 2023-06-29 22:26:24
# top: 0
description: Identity Authentication and Permission Management Strategies in AWS EKS
---

## Outline
- [Introduction](#introduction)
- [Why](#why)
- [IAM roles for service accounts(IRSA)](#iam-roles-for-service-accounts%28irsa%29)
- [AWS IAM Authenticator](#aws-iam-authenticator)
- [踩雷過程](#%E8%B8%A9%E9%9B%B7%E9%81%8E%E7%A8%8B)
- [References](#references)

## Introduction

Amazon Elastic Kubernetes Service (EKS) 是在AWS上使用Kubernetes(簡稱 K8S)進行容器管理的一個選項

我們可以使用 AWS 的 EC2 來自行搭建 Kubernetes，但 EKS 的好處在於它能夠自動管理 Kubernetes 的 control plane，這樣我們只需支付一點額外費用，就不需要花費人力去管理複雜 control plan運作。

最近我們正在使用 terraform 搭建新的 EKS cluster，正在處理EKS的權限時遇到了一些小問題，我想稍微記錄一下這些經驗，並介紹 EKS 的身份驗證與權限管理策略

## Why
接下來，讓我們談談為什麼需要處理EKS的權限。

讓我們用兩個例子來說明：

1. 在 EKS 上運行的 Pod 無法直接存取 AWS 的 S3 資源，因為它們沒有相應的 AWS IAM 權限。
2. 如果作為 IAM User 登入，您也無法直接控制 Kubernetes cluster，因為 IAM User 沒有Kubernetes Role 的權限。

為了應對這兩種情況，AWS 提供了兩種解決方案：

- IAM roles for service accounts(IRSA)
- AWS IAM Authenticator

接著會一一介紹他們

## IAM roles for service accounts(IRSA)
通常，我們會為 Pod 分配一個 Service Account，而 IRSA 這個功能允許 Kubernetes 的 Service Account 拿到 IAM Role 的權限，透過這種方式使 Pod 能夠操作部分 AWS 資源

具體的實現原理很複雜，而我發現下圖解釋得很清楚，有空的話也可以去看看 [原文](https://mohaamer5.medium.com/iam-roles-for-service-accounts-with-eks-irsa-good-bye-aws-credentials-1cdf1fa5192)
![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*rHxhoE-uJwVQEdIhQMTn3A.png)


能做到的前提主要有兩個：
1. AWS IAM 支援使用 OIDC JSON Web Token(JWT) 做認證(但建立 Role 的時候要指定支援)
2. Kubernetes 的 Service Account 在某個版本後開始支援 projected service account tokens，他也是基於 OIDC JWT

有了這些設定，我們就可以實現在 Kubernetes cluster 中讓 Service Account 具有 IAM Role 的權限，從而使 Pod 能夠訪問所需的AWS資源

### 實作細節
接下來說明如何用 terraform 做出有 IAM role 權限的 Service Account

這篇 [文章](https://antonputra.com/terraform/how-to-create-eks-cluster-using-terraform/#create-eks-cluster-using-terraform) 提供了詳細的說明，我用裡面的例子來說明

1. 開啟 EKS cluster 的 OIDC provider 功能（它不會自動啟用）
```
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.demo.identity[0].oidc[0].issuer
}
```
2. 建立提供 serveice account 使用的 IAM Role，在 assume role policy 中要記得註明可以由 OIDC provider assume 為此 IAM Role
```
# 這個 assume role policy 為重點
data "aws_iam_policy_document" "test_oidc_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    condition {
      test     = "StringEquals"
      variable = "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub"
      values   = ["system:serviceaccount:default:aws-test"]
    }


    principals {
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
      type        = "Federated"
    }
  }
}

resource "aws_iam_role" "test_oidc" {
  assume_role_policy = data.aws_iam_policy_document.test_oidc_assume_role_policy.json
  name               = "test-oidc"
}

```
3. 在建立 service account 時，確保在 annotation 中寫上相應的 IAM Role arn

```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-test
  namespace: default
  annotations:
    # 重點在這
    eks.amazonaws.com/role-arn: arn:aws:iam::424432388155:role/test-oidc
---
apiVersion: v1
kind: Pod
metadata:
  name: aws-cli
  namespace: default
spec:
  serviceAccountName: aws-test
  containers:
  - name: aws-cli
    image: amazon/aws-cli
    command: [ "/bin/bash", "-c", "--" ]
    args: [ "while true; do sleep 30; done;" ]
  tolerations:
  - operator: Exists
    effect: NoSchedule
```

4. 如果此 IAM Role 有 S3 權限，那麼新建立的 pod 就可以訪問 S3 的資源
```
kubectl exec aws-cli -- aws s3api list-buckets
```


## AWS IAM Authenticator
現在我們來探討如何使用 aws-iam-authenticator 將 IAM Role / User 綁定到 K8S 的 group，以便透過 IAM Role 操控 K8S。

當我們要使用 IAM 權限來訪問 Kubernetes 資源時，就會觸發這個機制，如下圖所示：

1.我們的電腦首先向 AWS STS 要求代表當前 IAM 身份的 token（未繪製在圖上），然後帶著 token 訪問 Kubernetes 的 API server

2.Kubernetes 的 API server 使用該 token 訪問 AWS IAM Authenticator server 的 `/authenticate` API

3+4.AWS IAM Authenticator server 對該 token 進行處理和初步驗證，然後將傳給 AWS STS，會得到 GetCallerIdentityResponse

5.AWS IAM Authenticator server 使用 `aws-auth` configmap 中的規則，將 GetCallerIdentityResponse 中的內容映射到相應的 Kubernetes 身份（group / username）

6.一旦知道 Kubernetes 的相應身份，Kubernetes cluster 就可以使用原有的 RBAC 機制來處理該請求，並將 response 返回給我們。

![](https://7903508.fs1.hubspotusercontent-na1.net/hub/7903508/hubfs/newblog1.png?width=624&name=newblog1.png)

### 實作細節
我使用 terraform 中的 [kubectl provider](https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs) 來實作

1. 首先建立要使用的 Kubernetes ClusterRole 和 ClusterRoleBinding。我將 deployer 這個 role 綁定到 deployers 這個 group。需要特別注意的是，deployers group的資源不需要額外建立，Kubernetes 會自動處理

```
resource "kubectl_manifest" "test_role" {
  yaml_body = <<-EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployer
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
    k8s-app: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources:
      - "namespaces"
      - "pods"
      - "services"
      - "replicationcontrollers"
      - "persistentvolumeclaims"
      - "persistentvolumes"
    verbs: ["watch", "list", "get"]
EOF
}

resource "kubectl_manifest" "test_role_binding" {
  yaml_body = <<-EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: deployer
subjects:
  - kind: Group
    name: deployers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: deployer
  apiGroup: rbac.authorization.k8s.io
EOF
}
```

2. 接下來建立要使用的 IAM Role。由於希望多人可以登入並使用此角色，因此將可以使用者清單放入 deployer_users_list 中
```
resource "aws_iam_role" "deployer" {
  name = "deployer"

  assume_role_policy = data.aws_iam_policy_document.deployer.json
}

data "aws_iam_policy_document" "deployer" {
  version = "2012-10-17"
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    principals {
      type        = "AWS"
      identifiers = var.deployer_users_list
    }
  }
}
```

3. 因為 aws-auth configmap 一開始就存在，所以我們需要在 Terraform 中創建一個空殼，然後將此 configmap import
```
terraform import module.k8s-resources.kubectl_manifest.aws-auth v1//ConfigMap//aws-auth//kube-system
```

4. 修改 `aws-auth` configmap 的 mapping 規則
```
resource "kubectl_manifest" "aws-auth" {
  yaml_body = <<-EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - groups:
      - deployers
      username: "aws:{{AccountID}}:eks-deployer:{{SessionName}}"
      rolearn: ${var.deployer-role-arn}
EOF
}
```
5. 要使用的開發者們在使用這個角色進行登入之前，要像下面這樣來設定 `~/.aws/config` 跟 `~/.aws/credentials` 檔案
```
# ~/.aws/config
[profile eks-admin]
role_arn = arn:aws:iam::<account id>:role/<role name>
source_profile = anthony

# ~/.aws/credentials
[anthony]
...
```
6. 最後，透過 aws 指令完成 kube config 設定

```
aws eks update-kubeconfig  --name <cluster name> --region <region> --profile eks-admin
```

這樣，就可以使用 IAM Role 來扮演使用 Kubernetes 的 deployer role 來管理 cluster 並進行相關操作了

## 踩雷過程
### IRSA
根據別人的 [建議](https://antonputra.com/terraform/how-to-create-eks-cluster-using-terraform/#create-iam-oidc-provider-eks-using-terraform)，我決定在建立完 OIDC provider 之後，測試建立一個具有 S3 權限的 IAM Role，並將服務帳戶關聯到該角色，以便讓 Pod 可以取得 S3 資源的訪問權限


在創建 OIDC provider 時，我沒有遇到問題，然而，在建立 Cluster 內的 Pod 時，我一開始完全無法建立

踩雷過程中的第一個問題是：預設情況下，只有建立 EKS Cluster 的 IAM User 才擁有該 Cluster 的 admin 權限。我猜測這是因為 AWS 不希望該權限被移除後沒有人能夠操作 Cluster

由於 Cluster 是透過持續交付流程 (CD) 建立的，如果我想操作該 Cluster，就需要使用跟 CD 中相同的 IAM User 身份進行操作，或者透過 aws-iam-authenticator 為我的 IAM User 提供權限

### aws-iam-authenticator

在嘗試使用 [kubectl provider](https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs) 建立 Kubernetes 資源時，我一直遇到問題，並且持續收到 "Unauthorized" 的錯誤訊息。這讓我很難判斷問題的來源。

我嘗試過 Terraform 的 [調整 Log level 為 debug 的方法](https://developer.hashicorp.com/terraform/internals/debugging) ，但並沒有提供太多幫助

kubectl provider 的參數主要包含三個：host / cluster_ca_certificate / token，我也嘗試將這些參數的值輸出到root level，以檢查它們的值是不是正常，但這同樣並沒有提供太多幫助如果是在 module level output 的參數，無法透過 `terraform output` 指令確認, [reference](https://stackoverflow.com/questions/52503528/why-is-my-terraform-output-not-working-in-module)）

最後，我在 CloudTrail 中看了 AWS 操作記錄，才發現我一直以為已經切換到 CD 流程使用的 IAM User，但實際上並未完全切換。意識到這點後，問題才得以解決

另外，特別提一下，aws-auth configmap 可以將 Kubernetes group 的權限綁定到 IAM User 或 IAM Role（目前無法綁定到 IAM group）。它們分別對應 configmap 中的 mapUsers 和 mapRoles 部分，而這裡的 username 將 IAM Role 在 Kubernetes Cluster 中映射到指定的名稱，所以通常會使用 "aws:{{AccountID}}:eks-developer:{{SessionName}}" ，這樣做才可以知道當前操作 Cluster 的人的身份([reference](https://dev.to/aws-builders/eks-auth-deep-dive-4fib))

下面的 mapRoles 規則允許名為 abc 的 Role 使用 system:masters 這個 group 的權限來操作 Kubernetes，而 mapUsers 則允許名為 a-user 的 user 使用 system:masters 這個 group 的權限來操作 Kubernetes
```
apiVersion: v1
kind: ConfigMap
metadata:
    name: aws-auth
    namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::555555555555:role/abc
      username: ops-user
      groups:
        - system:masters
  mapUsers: |
    - userarn: arn:aws:iam::555555555555:user/a-user
      username: admin
      groups:
        - system:masters
```


## References
[How to Create EKS Cluster Using Terraform?](https://antonputra.com/terraform/how-to-create-eks-cluster-using-terraform/#create-iam-oidc-provider-eks-using-terraform)

[How to create EKS Cluster using Terraform MODULES?](https://antonputra.com/terraform/how-to-create-eks-cluster-using-terraform/#create-public-load-balancer-on-eks)

[AWS document on aws-auth configmap setting](https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html)

[Exploiting Authentication in AWS IAM Authenticator for Kubernetes](https://blog.lightspin.io/exploiting-eks-authentication-vulnerability-in-aws-iam-authenticator)
