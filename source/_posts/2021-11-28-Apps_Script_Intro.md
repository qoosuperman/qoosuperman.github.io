---
title: "Apps Script Intro"
catalog: true
toc_nav_num: true
date: 2021-11-28 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?ixlib=rb-1.2.1&ixid=MnwxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2664&q=80"
tags:
- Apps Script
- Javascript
catagories:
- Javascript
updateDate: 2021-11-28 22:26:24
# top: 1
description: Apps Script Introduction
---

## Intro
最近想要加一些增進生活便利的功能，但又不想去 AWS 上面開機器花錢錢，剛好工作的時候隔壁坐了一個 app script 精通玩家，藉此開始接觸這個工具，做些小筆記幫助在這裡

Note: App script 現在支援 ES6 語法，因此親民很多

## Outline
- [Intro](#intro)
- [How to begin](#how-to-begin)
- [How to Execute](#how-to-execute)
- [Debug](#debug)
- [Special rules](#special-rules)
- [Libraries](#libraries)
- [Version Control](#version-control)
- [Google Api Cheatsheet](#google-api-cheatsheet)
- [Javascript Cheatsheet](#javascript-cheatsheet)
- [Others](#others)
- [References](#references)

## How to begin
有兩種開啟方式：
- 直接在 google drive 上面開新的 apps script 專案
- 透過 google sheet 開啟

他們在專案管理畫面看起來就會不同
![](https://i.imgur.com/12uQdtJ.png)

如果是用 sheet 開的 app script 就可以用下面的方式拿到 spread sheet 而不用指定 id
```js
SpreadsheetApp.getActiveSpreadsheet()
```

## How to Execute
要執行的時候，選單上面可以選擇 function 名字，選完之後按下旁邊的執行就可以執行 / 測試功能，如果要設定成定時啟動，去左邊有個小時鐘，那邊就可以設定啟動方式

當然這種免費服務是有 quota [限制](https://developers.google.com/apps-script/guides/services/quotas)的，不要太忘我設定了太多，到時候會有帳單寄過來

## Debug

在每一行的最前面點一下會變成紫色，就等於下了中斷點

![](https://i.imgur.com/kpUh3fE.png)

如果要 print 東西出來，用 `Logger.log()`

## Special rules
通常自己在寫 javascript 可以自己決定 function 名字，但在寫 app script 的時候要注意有些 function 名字是有特殊意義的，比方說你想要用這個 app script 做一個網頁就需要有一個 `doGet` 的 function 存在，你想要這個 google sheet 在打開的時候就做些什麼事情，你可以把 function 名字設定成 `onOpen`，這樣就不用另外設定 trigger，其他類似的還有很多，再麻煩自己看看 Google 文件

## Libraries
如果想要用其他 app script 寫好的東西，可以在資料庫這邊加上 script id

有一些像是送 slack 訊息通常可以這樣用
![](https://i.imgur.com/Cc4BHnc.png)

## Version Control
使用 app script 要怎麼做版本控管呢？

感謝隔壁的大神開示，可以使用 [clasp](https://developers.google.com/apps-script/guides/clasp) 這個套件，隨時把 code pull 下來或者 push 上去，就可以搭配 git 做版本控管了！

但我本身開發還是比較常在 App script 的介面上面開發，因為 Google 自己的 api 在上面有很多自動補全的功能，效率會高一些

---

如果是工程師背景的差不多可以開始寫了，接下來是自己補充的 cheatsheet

---

## Google Api Cheatsheet
### Property
app script 裡面的 property 對我來說比較像一般 application 所謂的 credential

比方說在這個 script 裡面我會用到自己的記帳用 google sheet，但這些 code 我又會放上 Github 儲存，我是不太想要全世界都知道我的記帳用 google sheet 是放在哪裡，所以在 code 裡面想把它隱藏掉，這時候就會用到 property

App script 的 script 有三個層級：document / script / User

如果是 script properties，那把同一個 script 給別人執行，也會拿到一樣結果

但如果是 User 的層級，就是設定在個人身上，別人拿你的 code 執行也不知道你設定的 secret

使用方法如下：

```js
var userProperty = PropertiesService.getUserProperties();
userProperty.setProperty('uservar', 'Hello');
Logger.log(userProperty.getProperty('uservar')); // Hello
```

三種不同的 property:
```js
PropertiesService.getUserProperties()
PropertiesService.getScriptProperties()
PropertiesService.getDocumentProperties()
```

目前 UserProperty 在文件上面已經標註 deprecated，經過測試，不同 script 的 UserProperty 也沒辦法互相 share，更多請再參考[文件](https://developers.google.com/apps-script/reference/properties/properties)

### Google Sheet
#### Special functions
如果使用 google sheet 另外做出來的 app script，`onOpen` 這個 function 會在每次文件被打開的時候 trigger，就不用自己設定 trigger 了

#### Customized menu
```js
function onOpen() {
  let spreadSheet = SpreadsheetApp.getActiveSpreadsheet()
  let menuItems = [
    {name: 'insertEvents', functionName: 'addEvents'}
  ]
  spreadSheet.addMenu('在日曆上加入事件', menuItems)
}
```
![](https://i.imgur.com/z7qA8Pc.png)

#### Dropdown list
這個操作有點反直覺，是用 `setDataValidation` 這個 method 來設定的

然後 trigger 需要設定在 on Edit，這樣每次有新的一列，才會讓新的這一列也有下單選單
```js
function dropDownList() {
  let spreadSheet = SpreadsheetApp.openById('gsheet_id')
  let mainSheet = spreadSheet.getSheetByName('eventList')
  // set colors
  let colorList = spreadSheet.getSheetByName('colors').getRange('B2:B12').getValues()
  let colorRangeRule = SpreadsheetApp.newDataValidation().requireValueInList(colorList)

  let lastRow = mainSheet.getLastRow()
  mainSheet.getRange(2, 5, lastRow-1).setDataValidation(colorRangeRule)
}
```
#### Get the range of a table
有時候會有點難拿到某個 table 的 region，比方說在同一個 sheet 裡面有資料跟另一個樞紐分析表，這時候可以用 `getDataRegion` 這個 function 去拿到樞紐分析表的範圍
```js
function createPivotTable() {
  let sheet = spreadSheet.getSheetByName('2021-10')
  let lastRow = sheet.getLastRow()
  let sourceData = sheet.getRange(1,1,lastRow,7);
  var pivotTable = sheet.getRange('K1').createPivotTable(sourceData)
  // 用第六欄做分析
  pivotTable.addPivotValue(6, SpreadsheetApp.PivotTableSummarizeFunction.SUM);
  // 用第五欄做分類依據
  var pivotGroup = pivotTable.addRowGroup(5)
  let range = sheet.getRange('K1').getDataRegion()
  Logger.log(range.getValues())
}
```

#### Chart
把 Chart 變成圖片的方法：[文件](https://developers.google.com/apps-script/reference/charts/charts)

```js
var imageData = Utilities.base64Encode(chart.getAs('image/jpeg').getBytes())
var imageUrl = "data:image/jpeg;base64," + encodeURI(imageData)
```

我自己則用比較曲折的方法，先把圖片上傳到 drive 之後再用 multipart 的 form 送到 Line notify，可以參考我的 github [repo](https://github.com/qoosuperman/apps-scripts/blob/master/monthly_expense_summary/code.js#L126-L134)

#### Macro
這算是一個小訣竅，有時候會覺得 Google 的 api 不知道怎麼使用，這時候可以用錄製巨集的方式加速開發，錄製完成之後打開原始碼，也會是 app script 的介面，這時候就可以看看自動生成的 code 怎麼做的

### Drive
### get folder / file by name
因為要用 name 拿到檔案或資料夾只有 getFoldersByName 或者 getFilesByName 這個 API

所以要用下面這個比較不直觀的寫法
```js
let folder_iterator = DriveApp.getFoldersByName(foldername)
var folder
if (folder_iterator.hasNext()) {
  folder = folder_iterator.next();
} else {
  folder = DriveApp.createFolder(foldername);
}
```

### Web
也可以用 app script 部署網頁

但這個部署網頁的入口一律都是 `doGet` 這個 function

通常在網頁裡面會放一些 js 的 code，可以用 `HtmlService` 這 service + evaluete 把 js code 用樣版引擎的方式去跑，更多可以參考[文件](https://developers.google.com/apps-script/guides/html/templates#scriptlets)
```js
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
  .evaluate()
  .setTitle('下載檔案 from Anthony')
}
```

在樣板裡面可以直接呼叫別的 function

這裡的樣版引擎是用 `<? ?>`

如果要顯示的話是用 `<?= ?>`

```html
<div class="container">
  <div class="row">
    <div class="col-12">
      <h1 class='text-primary'>檔案下載</h1>
      <ul>
        <? var data = getData(); ?>
        <? for(let i = 0; i < data.length; i++) { ?>
          <li>
            <span>
              <?= data[i][0] ?>
              <a href="<?= data[i][4] ?>"> 下載 </a>
            </span>
          </li>
        <? } ?>
      </ul>
    </div>
  </div>
</div>
```

`<?!=  ?>`則是避免語境跳脫的顯示，通常用在要 include 另一段自己可以相信的 code

比方說自己寫的 html 裡面要 include 自己另一個檔案
```html
<!-- index.html -->
...
<?!= include('style.css'); ?>
...
<!-- style.css.html -->
<style>
    body {
        font-family: "Microsoft JhengHei";
    }
</style>
```

另外，我們除了 doGet 還可以在 app script 做一個 doPost function，他可以當作送 post 的 api，有了這兩個 api 就可以用 `doGet` 做出一個表單送回給自己的 `doPost` 端點來處理

這段是 html 的 code，我們把設定 form 的目的地，設定成 http method post，url 則是從 template 的 serviceUrl 屬性拿到
```html
<!-- form.html -->
...
<form action="<?= serviceUrl ?>" class="login-form mt-2" method="post">
  <div class="form-group">
      <label for="date">日期</label>
...
```

下面這段是 app script 主體，在 template 身上放 serviceUrl 這個屬性，等這個 form 送出之後就會 trigger doPost 這個 function 的內容
```js
function doGet() {
  let template = HtmlService.createTemplateFromFile('index')
  // form 要送到哪個 url 塞到 template 的 serviceUrl 這個屬性
  // 會回傳這個 app 被部署到的 url
  template.serviceUrl = ScriptApp.getService().getUrl()
  return template.evaluate().setTitle('title')
}

function doPost(e) {
  let date = new Date(e.parameter.date)
  let amount = e.parameter.amount
  let category = e.parameter.category
  return result(date, amount, category)
}
```

#### client side call server side script
在網頁裡面還可以做到比較進階的事：直接 call server side script 做事情

所以雖然我們可能只有一個 post 端點，但透過這個就可以把網頁搞得很複雜

更多可以參考[文件](https://developers.google.com/apps-script/guides/html/reference/run)

下面簡單寫一個範例：
```html
<!-- 沒有目的地的 form -->
<form id='test'>
  ...
  <input type='submit' value="上傳檔案" onclick="this.value='檔案上傳中'; google.script.run.withSuccessHandler(fileUploaded).uploadFiles(this.parentNode);">
</form>
```

這一段表示，觸動 onclick 之後執行幾件事情：
1. 這個按鈕顯示改成檔案上傳中
2. 執行 server side 的 uploadFiles function，執行結果成功(因為有 catch error 所以不管怎樣都成功)就會把結果丟給 client side 的 fileUploaded function 執行

js(client side):
```js
<script>
  // 送出之後隱藏原本表單內容，顯示上傳結果
  function fileUploaded(status) {
    document.getElementById('upload').style.display = 'none';
    document.getElementById('output').innerHTML = status;
  }
</script>
```

js(server side):
```js
function uploadFilesAndRecord(form) {
  ...
}
```

### Calender
開發的時候發現 calender api 有兩個：傳統的跟 advanced calender service

如果用傳統的 calender api, 要 insert calender event 的時候在 location 滿有限制的，我建議使用 advanced calender service

下面這個是傳統用法，注意這裡的時間要是 Date 物件
```javascript
let endAt = new Date(Date.parse(values[i][2]))
let options = {
  location: values[i][2], // string
  guests: values[i][3],
  sendInvites: false,
  description: values[i][7] || 'No description'
}
let event = calender.createEvent(eventTitle, startAt, endAt, options)
event.setColor(eventColor).addPopupReminder(remindBeforeMinutes)
```

下面這個是用 advanced calender service
```js
let startAt = TimeUtilis.getAbsoluteDateHour(values[i][1]).toISOString()
let endAt = TimeUtilis.getAbsoluteDateHour(values[i][2]).toISOString()
let options = {
  summary: eventTitle,
  location: location,
  description: description,
  start: {
    dateTime: startAt
  },
  end: {
    dateTime: endAt
  },
  attendees: [
    {email: 'oldwuniwniw@gmail.com'},
    {email: 'qoosuperman@gmail.com'}
  ],
  colorId: eventColor
}
// To user Calender, the service must be turn on
let event = Calendar.Events.insert(options, 'eqo1eottco4dtr18e5m0dd76d0@group.calendar.google.com');
```

顏色對應的數字參考 [這裡](https://developers.google.com/apps-script/reference/calendar/event-color)

---
## Javascript Cheatsheet

其實覺得比較麻煩的主要在分析日期上面，最坑的是 getMonth 拿回來的數字是 0-11，所以要加上 1 才是正確月份

範例
```js
var date = parseInt(new Date().getDate())
var hour = parseInt(new Date().getHours())
// 如果要比較完整的年月日我會把它變成字串來比
var dateString = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd')
```

- [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
    - `Date.prototype.getFullYear()`
    - `Date.prototype.getMonth()`
        - **0-11**
    - `Date.prototype.getDate()`
        - 1-31
    - `Date.prototype.getDay()`
        - 0(Sunday)-6
    - `Date.prototype.getHours()`
    - `Date.prototype.getMinutes()`
    - `Date.prototype.getSeconds()`
    - `Date.prototype.getMilliseconds()`
    - `Date.now()`
    - `Date.prototype.getTime()`

### js libraries
使用 app script 的網頁可以用很多 library

可以參考他們有 host 哪些 https://developers.google.com/speed/libraries

所以也可以搭配 jquery library 很簡單的在網頁上做出 date picker 效果

---

## Others
- 現在 line notify 已經可以支援送本地的圖檔: [link](https://engineering.linecorp.com/zh-hant/blog/using-line-notify-to-send-stickers-and-upload-images/)

---

## References
[這次主要參考的工具書](https://www.books.com.tw/products/0010849846)

[Google 提供的 quick start](https://developers.google.com/apps-script/quickstart/custom-functions)

[Template doc](https://developers.google.com/apps-script/guides/html/templates#scriptlets)

[Run server code at client side](https://developers.google.com/apps-script/guides/html/reference/run)

[Udemy 上的教學課程(我沒有看，同事提供的)](https://www.udemy.com/course/course-apps-script/)

[用錄製巨集的方式做樞紐分析](https://hawksey.info/blog/2020/10/working-with-pivot-tables-in-google-sheets-using-google-apps-script/#gref)

[用 app script 接 twitter Oauth 傳圖片的範例](https://gist.github.com/rcknr/6095720)

[使用 App script + Line notify 同時傳送圖檔跟文字](http://white5168.blogspot.com/2018/04/google-apps-script-19-google-line-notify.html#.YaMdGvFBxhE)

[form 的 multipart 可以讓我們同時傳送文字圖片等多種訊息在一個 request 裡面](https://blog.kalan.dev/2021-03-13-html-form-data/)
