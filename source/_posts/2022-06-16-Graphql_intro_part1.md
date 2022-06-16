---
title: "GraphQL Intro part1 - Type and Schema"
catalog: true
toc_nav_num: true
date: 2022-6-16 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1619963685444-129be6c657e9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1672&q=80"
tags:
- GraphQL
catagories:
- GraphQL
updateDate: 2022-6-16 22:26:24
# top: 0
description: graphql introduction part1
---

因為業務需要，最近接觸了 Graphql，雖然以前大概知道是什麼，也用過 facebook 的 api 來找資料，但是沒想到背後要了解的東西這麼多 QQ

下面大部分的內容是透過鐵人賽的[這個系列](https://ithelp.ithome.com.tw/articles/10200678)了解吸收之後再用自己的方式解說一遍，另外也有搜尋一些其他資料再加上自己想補出的部分

## Outline
- [Intro](#intro)
- [Type](#type)
- [Schema](#schema)

## Intro
GraphQL 是一種資料查詢 / 修改的語言，透過 Graphql 可以用更彈性的語法拿資料，或者修改資料，在 Graphql 開發出來之前，大部分公司使用 RESTful 的 API

打個比方，如果是在部落格的系統下，RESTful 的設計風格通常是將文章跟用戶的 API 分開，如果同一個頁面要有作者跟文章資訊，需要一次 request 去拿用戶資訊，一次去拿文章資訊

但在 Graphql 風格的設計下，通常一個 request 同時可以拿到用戶跟文章資訊

首先開發出來的的公司是 facebook，目前 Github / Shopify 等公司也有使用

但既然這東西這麼好，為什麼沒有大家都開始使用? 為了解答這個問題，我這邊 survey 了一些他的優缺點

### Pros and Cons
#### Pros
1. 對於 client 比較有彈性拉想要的資料，避免過去同一隻 api 拿回來的資料可能少了一點點或者太多的情況
2. 減少 request 來回次數，其實跟上面有點像，不用因為少了一點點資訊就需要打別的 API
3. depracate 方便，過往 deprecate 需要整個 API 一起，但 graphql 允許你把這個 query 的某幾個欄位 deprecate
4. 有一些原本的 restful API 比較難支援的功能， 像是 subscription

#### Cons
1. 請求一率使用 POST，難藉由 HTTP action 知道目的
2. 容易有效能問題，很常遇到 N+1 問題
3. 有學習門檻，要使用的人都要花一段時間了解這個系統
4. 把原本簡單的 url 複雜化，比方說要查詢 user id 為 2 的人，從下面的例子來說看起來是比較複雜一些
```
# RESTful
http://urlpah/users/2

# Graphql
query("query{users(_id:" + req.params.userId + "){_id, name}}")
```

### Best Use Case
結合上面的優缺點來看，可以想想看什麼情況比較適用 graphql 的設計呢？

[這篇文章](https://slicknode.com/blog/graphql-or-not-graphql-pros-and-cons/)最後說的最適用 graphql 的情境我很同意，當你要對接的 interface 有很多，這時候如果沒有多一點彈性，很容易要設計非常多 restful api，同時這些 client 也能減少他們那邊的 code

另外我覺得當產品還在快速發展中，api 變化迅速，也是另一種情境，因為 graphql 可以根據特定欄位 deprecate，如果是 restful 的情況可能需要迭代很多版本的 api

## Type
Graphql 可以想成是一個由各種型別 (Type) 組合而成的世界，裏面包括了基礎型別 (Scalar Type)，跟我們自己定義的一些物件型別 (Object Type)，還有一些特殊功能的型別，像是 query / mutation / subscription，還有一些衍伸的 enum / interface ...etc

### Scaler Type
最基礎會有五種基礎型別：

String / Int / float / Boolean / ID

在這其中 ID 滿特別的，可以是 string 或者 integer，實作時通常是傳入 uuid string

### Custom Scalar Type
除了原本的基礎型別之外，我們也可以自訂基礎型別，在 Schema 裏面用 `scalar` 這個關鍵字去定義
```
scalar Date
```

什麼時候要用 custom scalar type? 可以參考 Shopify 的建議：

1. 當你需要一個有特殊語意的值時，可使用 Custom Scalar Type
2. 在 client 端檢查較為複雜的格式的話，可以使用寬一點的 type 如 String
3. 定義比較明確如 DateTime 就是要 ISO 格式不接受其他，那就可以考慮使用 Custom Scalar Type 來規範 Client 不能亂傳

常見並且適用 Custom Scalar Type 的情境有： Date / JSON / Positive Int / URL / Email

### Object Type
Object Type 其實可以視為我們一般使用的物件，但在設計上通常會設計成方便 client 使用的樣子，而非完全依照 server 這邊原本物件的設計

一個 Object Type 下面會有很多個 field，而每個 field 通常單位會是 scalar type 或者另一個 object type

像下面，Order 這個 Object type 有三個欄位：owner / productVariants 跟 price

price 回傳的格式會是 Integer，owner 會是 id 的形式, 驚嘆號表示回傳值不會是 null， productVariants 回傳的格式則是 ProductVariant 這個 Object Type 的陣列
```
type Order {
  owner: ID!
  productVariants: [ProductVariant]
  price: Int
}
```

### Root Type
在這些眾多型別之上，還有一個 root type

root type 中最多擁有三個 field: query / mutation / subscription
![](https://i.imgur.com/GSm9QKP.png)

## Schema
在 graphql 裏面我們用 schema 告訴其他人可以用哪些元素拼湊，用他們發出 request 之後就可以拿到想要的 response

### Comment
在 schema 裏面註解十分重要，可以幫助閱讀的人快速理解每個型別的用途

可以用單行 " 或是多行 """ 來加入文件註釋 (會在文件中呈現)，另外也可以用單行的 # 來表達單純的註釋 (不會在文件中呈現)。

習慣上 type definition 使用 """ 來多行註釋，field 則是使用 " 來單行註釋。

### Simple Example
雖然很想單獨講 schema，但搭配 query 比較好說明，所以會先偷渡一些 query 的概念

比方說下面的 schema 在跟別人說我的系統裡面有一個叫做 hello 的 Query

```
type Query {
	hello: String!
}
```
query 是一種特別的型別，他擔任 schema 的進入點

如果看到這樣的 schema，表示你可以像下面一樣用 hello 這個 query 去打 api，並且從 schema 上面知道你會拿到一個字串，而且不會是空值

```
query {
	hello
}
```

而你可以預期會拿到這樣的 response:

```json
{
	"data": {
		"hello": "world"
	}
}
```

但通常來說不會有這麼簡單的 schema，再稍微複雜一點的情況如下：

用 me 這個 query 可以拿到 User 這個 object type
```
type Query {
	me: User
}
```
而 User 是 Object type，所以要去看這個 Type 裡面有什麼欄位可以拿，看到他有 id 跟 name 這兩個欄位
```
type User {
	id: Int
	name: String
}
```
因此你可以向下面這樣下 query，雖然 User 有兩個欄位可以拿，但目前的頁面你可能只需要 name，所以拿 name 就好

```
query {
	me {
		name
	}
}
```

拿到的 response 預期可能長這樣：

```json
{
	"data": {
		"me": {
			"name": "Anthony"
		}
	}
}
```

以完整的圖來表示：
![](https://i.imgur.com/6jRlvvD.png)

### Exclamation mark

schema 裡面的驚嘆號表示 non-nullable，但他有兩個面向，一個是用作 argument 的的時候，一個是用作 field 的時候

#### Used in field
```
type Story {
  id: ID!
  name: String!
  length(unit: LengthUnit = METER): Float
  episodes: [Episode!]!
}
```

以上面的例子來說，name 是 Story 的一個 filed ，因此 String 後面的驚嘆號表示回傳回來的值絕對不是空值

[Episode!]! 表示回傳一個陣列，裡面都是 Episode 物件，裡面的驚嘆號也是 nullable，所以每個物件都不會是 nil，外面的驚嘆號表示陣列不會是空值，所以一定會是一個陣列

BTW, 裡面的 length 表示需要一個參數叫做 unit，如果是 optional 的參數就要給預設值，在這個例子裡面預設值是 METER

#### Used in Argument

如果作為 argument 使用的時候，驚嘆號代表了這些參數不能不給，以下面的 input 來說，userId 跟 groupId 這兩個參數就必須要給
```
input AssignUserGroupMutationInput {
	userId: ID!
  groupId: ID!
}
```

#### Different expressions
下面整理了一些比較常見的狀況：
1. field 為 nullable
```
field: User
```
2. fields 為 nullable, array 裡的值也為 nullable
```
fields: [User]
```
3. fields 為 nullable, array 裡的值為 non-null
```
fields: [User!]
```
4. fields 為 non-null, array 裡面的值也為 non-null
```
fields: [User!]!
```

至於要不要加上驚嘆號，[這邊文章](https://ithelp.ithome.com.tw/articles/10200678)的建議是：剛開始設計時，除了 ID 以外的欄位都不要加上 ! 因為一旦修改就會是 breaking change。


### Reference
[鐵人賽](https://ithelp.ithome.com.tw/articles/10200678)
[shopify 的 schema design 教學](https://github.com/Shopify/graphql-design-tutorial/blob/master/TUTORIAL.md)