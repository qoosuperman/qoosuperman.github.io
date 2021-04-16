---
title: "Shell variables"
catalog: true
toc_nav_num: true
date: 2021-04-16 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1616244013240-227ec9abfefb?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80"
tags:
- Shell
catagories:
- Shell
updateDate: 2021-04-16 22:26:24
# top: 1

---

之前做了很多跟 shell 有關的筆記，但那時候還沒有很好的筆記習慣(其實現在也沒有？)，導致筆記散落各地，希望之後可以慢慢整理起來，變數這篇就當作系列的第一篇吧！

# 變數
變數主要分成 Environment variables 跟 shell variable

環境變數就是整個系統通用，需要去 export

shell variable 只存在當下這個 shell

## 常用指令
`env` 可以列出所有的環境變數

`printenv` 可以列出所有指定環境變數 ex `printenv HOME`

`set` 如果後面沒有接參數，會印出目前所有變數，包括環境變數，還有 shell function

`unset` 取消一般變數跟環境變數

`export` 把變數 export 出去代表變成環境變數

## Assign 變數用法
1. 等號兩邊不能直接接空白字元
2. 變數名稱只能是英文字母與數字，但是開頭字元不能是數字
3. 變數要存字串的話，雙引號裡面可以使用 `$` 轉換變數，但單引號不行
```
『var="lang is $LANG"』則『echo $var』可得『lang is zh_TW.UTF-8』
『var='lang is $LANG'』則『echo $var』可得『lang is $LANG』
```
4. 如果需要把指令得到的資訊存到變數中，可以使用反引號或者 $ 來存指令
```bash
list=`ls`
echo $list #files
或者
list=$(ls)
echo $list #files
```
5. 可以利用 `declare`跟`typeset` 宣告變數類型
```
-a  ：將後面名為 variable 的變數定義成為陣列 (array) 類型
-i  ：將後面名為 variable 的變數定義成為整數數字 (integer) 類型
-x  ：用法與 export 一樣，就是將後面的 variable 變成環境變數；
-r  ：將變數設定成為 readonly 類型，該變數不可被更改內容，也不能 unset
```
```bash
> sum=100+2
> echo $sum
100+2
> declare -i sum
> echo $sum
102
```

## 特殊變數
#### PS1
命令提示字元存在 PS1 這個變數裡面，指的就是 terminal 裡面左邊那邊要顯示什麼，如果要改的話就像下面這樣
```bash
> cd /home
> PS1='[\u@\h \w \A #\#]\$ '
```

#### 錢字號 `$`
其實 `$` 本身也是個變數，代表目前這個 Shell 的執行緒代號，所以使用 `echo $$` 就可以看到現在這個 bash 的 PID

#### `?`
`?` 這個變數代表上一個指令的回傳值，如果沒有錯誤的話，回傳值就是 0
```bash
> name="qoo"
> echo $? # 0 (因為上一個指令沒有錯誤訊息，所以是回傳0)
> 1name="qoo"
> echo $? #127 (上一個指令有錯誤訊息，所以就是回傳錯誤代碼)
```

更多範例：
```bash
> id -un
vagrant
> echo ${?} # 上一個 command 也就是 id -un 的結果
0
> id -unx
id: 不適用的選項 -- x
Try 'id --help' for more information.
> echo ${?}
1
```
```bash
# Display the user name
USER_NAME=$(id -un)
# Test if the command succeed
if [[ "${?}" -ne 0 ]] # 這裡的 ? 是 id -un 執行的結果
then
  echo "The id command did not execute succesfully"
  exit 1
fi
```
#### `#`
`#` 是一個特殊變數 表示輸入幾個參數
```bash
# luser-demo06.sh
#!/bin/bash

# Display how many parameters user put in
NUMBER_OF_PARAMETER="${#}"
echo "You supplied ${NUMBER_OF_PARAMETER} arguments on the command line"
```
```bash
> ./luser-demo06.sh hello
You supplied 1 arguments on the command line
```
#### `@` 所有引數(每個都作為獨立的字串)
```bash
for USER_NAME in "${@}"
do
  PASSWORD=$(date +%s%N | sha256sum |head -c 48)
  echo "${USER_NAME} : ${PASSWORD}" 
done
```
#### `$*` 所有的引數(合起來作為單個字串)

#### `$!`
最近一次執行的 background job PID

#### `${RANDOM}`
隨機產生一組數字

#### `HOSTNAME`
host name

### 查詢特殊變數
其實以上這些變數可以透過 man bash 查詢 `Special Paramter` 找到

`$0` 代表第0個參數，比方說 `./deploy.sh -e ...` 裡面的 `./deploy.sh`
`$1` 代表第一個參數以此類推
`$#` 代表參數的數量
`$@` 代表`"$1" "$2" "$3" "$4"`之意，每個變數是獨立的
`$*` 代表` "$1c$2c$3c$4"` 這裡的 c 是分隔字元，預設是空白鍵，要注意跟 `$@` 還是有差別，但是一般來說記憶 `$@` 就可以

範例：
```bash
# test.sh
echo "$0"
echo "$1"
echo "$#"
echo "$@"
echo "$*"
exit 0

# shell 裡面執行
> ./test.sh qoo goo
./test.sh # $0
qoo       # $1
2         # $2 (並沒有把 $0 算進去)
qoo goo   # $@
qoo goo   # $*
```

### positional parameter
positional parameter 代表的是 command line 裡面的內容，像是 `0` 在 shell 裡面也是一個變數

parameter 是使用在 shell script 裡面的變數

argument 是傳進去 shell script 裡面的 data

兩者的關係是： argument 被寫在 command line 上面，然後變成存在 parameter 裡面的值

`${0}` 這個變數就代表第一個 position paramter，也就是使用者打在 command line 上面的 script 本身

```bash
# luser-demo06.sh
echo "${0}"

# 下指令
> ./luser-demo06.sh
./luser-demo06.sh
```

---

## 特殊操作子

目前在看 shell script 的時候主要看過三個類別比較特別的運算子：1.預設值 2.取字串的第幾個字 3.刪除取代替換文字

以下稍微整理一下：

### 預設值
#### `:-` 跟 `-`
語法差在有沒有冒號：

`<變數>=${<要測試的變數>-<預設值>}`，反正就是預設值放在 `-` 後面

`<變數>=${<要測試的變數>:-<預設值>}`，反正就是預設值放在 `:-` 後面

範例：
```bash
> VARIABLE=${TEST:-app}
# 或者
> VARIABLE=${TEST-app} # 差在有沒有冒號
```
兩者的行為表現上有差別，在上面的例子裡面，如果 TEST 這個變數有設定，但是值是 NULL 的話 `:-` 這種還是會取代掉，但 `-` 這種就不會有作用

例子：
```
> TEST=
> echo ${TEST-app}

> echo $(TEST:-app)
app
```
#### `:=`
意思跟上面的很像，但如果用等於的話，連TEST 的值都會被替換掉
```bash
> VARIABLE=${TEST:-app}
> echo $VARIABLE
app
> echo TEST

> unset VARIABLE
> VARIABLE=${TEST:=app}
> echo $VARIABLE
app
> echo $TEST
app
```

#### `:?` 跟 `?`
使用方式：
```
USERNAME=${1:?"Specify a username"}
```
兩者的差別：

`${parameter:?word}` 如果 parameter 沒有設定或是值是 nil, ''(空字串)的時候會跳出錯誤(把後面的訊息 print 到 STDERROR), 如果不是 interactive shell 的話會會 exit 這個 process

`${parameter?word}` 如果 parameter 沒有設定會跳出錯誤
```bash
> unset xyzzy ; export plugh=

> echo ${xyzzy:?no}
bash: xyzzy: no # 因為 xyzzy 沒有設定，所以發生錯誤

> echo ${plugh:?no}
bash: plugh: no # 因為 plugh 是空字串，所以發生錯誤

> echo ${xyzzy?no}
bash: xyzzy: no # 因為 xyzzy 沒有設定，所以發生錯誤

> echo ${plugh?no} # plugh 是空字串，但有設定，所以沒發生錯誤
```

cheat sheet：
![](https://i.imgur.com/tTjuM0S.png)
cheat sheet 中文版：
![](https://i.imgur.com/3lDgKT3.png)

[參考資料1](https://unix.stackexchange.com/questions/122845/using-a-b-for-variable-assignment-in-scripts/122848#122848)

[參考資料2](https://unix.stackexchange.com/questions/122845/using-a-b-for-variable-assignment-in-scripts/122848#122848)

[參考資料3](https://stackoverflow.com/questions/8889302/what-is-the-meaning-of-a-question-mark-in-bash-variable-parameter-expansion-as-i)


### 取字串的第幾個字
用法：
```bash
# ${parameter:offset:length}
$ var=901.32.02
$ first_char="${var:0:1}"
$ echo "${first_char}"
9
```
範例：
```bash
for file in $(ls 2015*); do
  echo "handling ${file}"
  date=$(echo ${file} |grep -Eo '[[:digit:]]{8}')
  year=2015
  month="${date:4:2}"
  day="${date:6:2}"
  gsutil cp $file gs://ishin-log-transfer/${year}/${month}/${day}/${file}
  bq load --max_bad_records=100 --source_format=NEWLINE_DELIMITED_JSON "ishin_prod_logs.sign_in_logs\$${year}${month}${day}" gs://ishin-log-transfer/${year}/${month}/${day}/${file} sign_in_logs.schema.json
done
```

### 刪除取代替換文字
`#` 井字號的使用：從左邊刪除
```bash
> path=${PATH}
> echo ${path}
/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
> echo ${path#/*local/bin:} # 把前面的 /usr/local/bin: 拿掉
/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
> echo ${path##/*:}
:/home/dmtsai/bin
# /usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
```
說明：

`#` 代表從變數內容的最前面開始向右刪除，且僅刪除最短的那個

`##` 代表從變數內容的最前面開始向右刪除，且僅刪除最長的那個

`*` 是萬用字元，代表0到無窮多個字元

`%` 的使用：從右邊刪除
```bash
> echo ${path}
/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
> echo ${path%:*bin}
/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin
# /usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
> echo ${path%%:*bin}
/usr/local/bin
# /usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
```

取代：
```bash
> echo ${path}
/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
> echo ${path/sbin/SBIN} # 兩斜線中間的是舊字串，右邊的是新字串
/usr/local/bin:/usr/bin:/usr/local/SBIN:/usr/sbin:/home/dmtsai/.local/bin:/home/dmtsai/bin
# 第一個符合 sbin 的被取代
> echo ${path//sbin/SBIN}
# 兩條斜線的話就是所有符合的都被取代
```
cheat sheet
![](https://i.imgur.com/noJH4G0.png)