---
title: "Javascript(JS) let, const 跟 var 的比較跟應用"
catalog: true
toc_nav_num: true
date: 2019-12-05 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1574804225567-c04d11d6bc33?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1568&q=80"
tags:
- Javascript
catagories:
- Javascript
updateDate: 2019-12-05 22:26:24
# top: 1

---
# let, const 跟 var 的比較跟應用
最近黑色星期五花錢用半價買了 Wes Bos 的 ES6 課程，所以順手來紀錄下自己的所學

眾所皆知 `let` 跟 `const` 是兩個 ES6 語法中才新增宣告變數的方式，而 `var` 是舊有的方式
這年頭流行先講結論，所以我先說這三者使用時機：

## 使用時機

1. 優先使用 `const`
2. 如果需要更新變數的時候才用 `let`
3. 在 ES6 裡面**盡量不要**使用 `var` 

這時機是 Wes Bos 建議的，但我目前也同意
接著要講的是這三者的不同點：

## 不同點1： 作用域

`var`: function scoped
`let / const`: block scoped

這也是大家比較熟悉的，在以往 JS 的切分方法就只有 function ，直到 let / const 出來才有 block scope 的概念

以下舉例 function scoped 跟 block scoped 的差異：
#### function scoped:
```js
function setWidth(){
  var width = 100  // 只活在 function 裡面
  console.log(width) 
}
console.log(width) //  width is not defined
setWidth() // 100
```
#### Block scoped:
```js
var age = 100
if(age > 12){
  var dogYears = age * 7
}
console.log(dogYears) // 700

var age = 100
if(age > 12){
  let dogYears = age * 7
}
console.log(dogYears) // dogYears is not defined

var age = 100
if(age > 12){
  const dogYears = age * 7
}
console.log(dogYears) // dogYears is not defined
```
## 不同點2： var 可以重複宣告，但 let /const 會出錯

這三者裡面只有 const 宣告的常數是不能更新的
除此之外可以看下面範例，只有 var 可以在那邊對同一個變數 var 來 var 去， let 跟 const 都會跑出錯誤訊息
```js
var me = "you"
var me = "you" // 沒事

let me = "you"
let me = "you" //Identifier 'me' has already been declared

const me = "you"
const me = "you" //Identifier 'me' has already been declared
me = "he" // Assignment to constant variable. 
// 只有 const 是不能更新的
```

## 不同點3： var 跟 let / const hoisting 的表現不同

感謝 Huli 的 [我知道你懂 hoisting，可是你了解到多深？](https://blog.techbridge.cc/2018/11/10/javascript-hoisting/) 這篇文章，真的有種醍醐灌頂的感覺，下面也會引用他的話跟例子

這邊直接先引用 Huli 大的其中一句話講結論：
> let 與 const 也有 hoisting 但沒有初始化為 undefined，而且在賦值之前試圖取值會發生錯誤。

以下舉例：
例1： 從頭到尾沒宣告變數使用的狀況
```js
console.log(a) // ReferenceError: a is not defined
```
例2： 傳統的 hoisting
```js
console.log(a)
var a = 2 // undefined
```
例3： 把 var 改成 let
```js
console.log(a)
let a = 2 // ReferenceError: a is not defined
```
看到這邊一定覺得我在話唬爛，明明就沒有 hoisting XD
不對！真的有！但不太容易察覺，除非像是下面這個例子
```js
var a = 10
function test(){
  console.log(a)
  let a
}
test() // ReferenceError: a is not defined
```
如果沒有 hoisting 行為的話，a 應該要讀取到外面的 10 而不是 ont defined 的結果，所以結論跟上面講過的一樣：**用 let / const 來宣告的話還是會有 hoisting 的狀況，但不會初始化成 undefined**

接下來來看看如何使用 closure

## Closure(閉包) 的使用
一般來說，我們可能會直接宣告一個變數，可是這樣不好，因為這變數會變成 global function，很容易造成不好的結果，比方說我可能不小心宣告一個 name 的變數，但實際上已經有其他功能需要用到原本的 name 變數

因此我們想要把變數鎖在一個範圍裡面不 leak 到外面

如果是 `var` 我們需要用到 IIFE （立刻被呼叫的函式）
```js
(function(){
  var name = 'qoo'
  console.log(name)
})()
// 'qoo'
```
如果是 `let` 或者 `const` 我們就用 Block 即可
```js
{
  let name = 'qoo'
  console.log(name)
}
// 'qoo'
```
這可以延伸到在教初學者時常會講到的 setTimeout 案例

## 經典的 setTimeout 問題
我們看看下面兩種 for loop 執行結果：
```js
for(var i = 0; i < 10; i++){
  console.log(i)
  setTimeout(function(){
    console.log(`Number${i}`)
  }, 1000)
}
// 0 1 2 3...10  Number10 x 10 次(一秒後)

for(let i = 0; i < 10; i++){
  console.log(i)
  setTimeout(function(){
    console.log(`Number${i}`)
  }, 1000)
}
// 0 1 2 3...10  Number0 Number1 ... Number 9(一秒後)
```
為什麼使用 var 的結果會這樣呢，因為他很快就把 for loop 執行完了，`var`是 function scope ，所以每次更改 i 值都會直接更改 Block 裡面的 i
但是 let 是 block scope，所以變數會被存在這個 block 裡面
那要怎麼修正他們，除了講出 Number 1 到 9 還要每隔一秒做一次呢？
`let` 比較簡單，只要把秒數乘上去就好：
```js
for(let i = 0; i < 10; i++){
  setTimeout(function(){
    console.log(`Number${i}`)
  }, 1000 * i)
}
```
`var` 就要用到 IIFE 了
在 for 把 i 丟給 block 的當下就傳進去 IIFE 裡面存起來
```js
for(var i = 0; i < 10; i++){
  (function(x){
    setTimeout(function(){
      console.log(`Number${x}`)
    }, 1000 * x)
  })(i)
}
```

好像是第一次研究 JS 這種基本的問題，實際寫一次也會讓自己知道是不是還有哪裡不清楚的地方

如果有哪裡有問題或者寫錯的也歡迎聯絡我，謝謝！

參考資料：

1. [Wes Bos ES6 課程](https://es6.io/)
2. [我知道你懂 hoisting，可是你了解到多深？](https://blog.techbridge.cc/2018/11/10/javascript-hoisting/)
3. [0 陷阱！0 誤解！8 天重新認識 JavaScript！](https://www.books.com.tw/products/0010832387)