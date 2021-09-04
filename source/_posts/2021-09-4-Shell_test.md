---
title: "Shell Script Test(判斷式)"
catalog: true
toc_nav_num: true
date: 2021-09-4 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1630702379394-e202e2fbe01e?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1434&q=80"
tags:
- Shell
catagories:
- Shell
updateDate: 2021-09-4 22:26:24
# top: 1
description: Shell test
---
# Shell Script Test(判斷式)
在 Shell Script 中非常容易使用到判斷式，偏偏代號非常的難記，所以想說整理一下

## Outline
- [使用方法](#使用方法)
- [判斷式代號](#判斷式代號)
- [多個判斷串連](#多個判斷串連)
- [`[]` 或者 `[[]]` 規則：](#`[]`-或者-`[[]]`-規則：)
- [`=` 跟 `==`](#`=`-跟-`==`)
- [補充](#補充)
- [參考資料](#參考資料)

## 使用方法
```bash
if [ 條件判斷式 ]; then
	...
elif [ 條件判斷式 ]; then
  ...
else
  ...
fi
```
範例一： 確認 uid 是不是 0(root)
```bash
if [[ ${UID} -eq 0 ]]
then
  echo "YOU ARE ROOT"
else
  echo "YOU ARE NOT ROOT"
fi
```
範例二： 確認輸入值是 y 還是 n
```bash
read -p "Please input (Y/N): " yn
[ "${yn}" == "Y" -o "${yn}" == "y" ] && echo "OK, continue" && exit 0
[ "${yn}" == "N" -o "${yn}" == "n" ] && echo "Oh, interrupt!" && exit 0
echo "I don't know what your choice is" && exit 0
```
其中的
`[ "${yn}" == "Y" -o "${yn}" == "y" ]`
也可以這樣改寫：
`[ "${yn}" == "Y" ] || [ "${yn}" == "y" ]`

範例三
```bash
if [[ ! -d "${ARCHIVE_DIR}" ]]
# 如果資料夾不存在的話...
```
## 判斷式代號
| symbol | meaning                            | 白話文  |
|--------|------------------------------------|---|
| -f     | 如果這個檔案存在，而且是一個 file，則為真 |有這個檔案存在的話就...   |
| -d     | 如果這個檔案存在，而且是一個 folder，則為真 | 有這個資料夾存在的話就...  |
| -e     | 如果這個檔案存在則為真             | 有這個檔案存在(不管他是 file 還是 folder)的話就...  |
| -h     | 如果這個檔案存在，而且是一個 symlink，則為真  |   |
| -r     | 如果這個檔案存在，而且 readable，則為真       |   |
| -w     | 如果這個檔案存在，而且 writable，則為真       |   |
| -x     | 如果這個檔案存在，而且 executable，則為真     |   |
| -z     | string 長度為 0 則為真 | 這個 string 沒東西的話就...  |
| -n     | string 不是 null 則為真 |這個 string 有東西的話就...   |
| -s     | 檔案大小大於 0 為真       |   |


| symbol | meaning                            |   |
|--------|------------------------------------|---|
| -eq     | 等於 |   |
| -ne     | 不等於 |   |
| -gt     | 大於             |   |
| -lt     | 小於  |   |
| -ge     | 大於等於       |   |
| -le     | 小於等於       |   |


## 多個判斷串連
這部分其實前面的例子就有寫到

| symbol | meaning                            |   |
|--------|------------------------------------|---|
| -o     | or |   |
| -a     | and |   |

ex.
```bash
if [ "$APP_TYPE" = app -o "$APP_TYPE" = admin]; then
  # do something
fi
```

也可以用 `&&` 還有 `||` 來串連判斷式，或者放在後面繼續執行的動作
```bash
[ "$STRING_A" = 'A' ] || [ "$STRING_B" = 'B' ] && export REPO_NAME="Myapp"
[ "$APP_TYPE" = cs ] && export REPO_NAME="MySecondApp"
```

## `[]` 或者 `[[]]` 規則：
1. 因為中括號用在很多地方，要注意如果是用在判斷式的話，括號兩端需要有空白
2. 中括號裡面每個元件都要有空白來分隔
3. 在中括號內的變數，最好都以雙引號括號起來
4. 在中括號內的常數，最好都以單或雙引號括號起來
5. 兩個中括號是 bash 有的用法，有的 shell 可能不支援，但最原始就有一個中括號的用法
6. 如果去查 `[[` 的用法他會說跟 `test` 的用法依樣，使用 `help test` 可以查到一些判斷的方法，像是 `eq` `ne`

## `=` 跟 `==`
在判斷式裡面，`=` 跟 `==` 的意思不同， `==` 會套用 pattern 的比較，但是 `=` 必須要完全相同


## 補充

### `-t`
下面這段的意思是，如果用 interactive shell 的方式跑 bash，會改成執行 zsh
```bash
if [ -t 1 ]; then
  exec zsh
fi
```

## 參考資料
- [Bash Guide for Beginners](https://tldp.org/LDP/Bash-Beginners-Guide/html/)
- [常見用法整理](https://blog.csdn.net/shenhuxi_yu/article/details/53047012)
- [-t 是什麼意思](https://unix.stackexchange.com/questions/389495/what-does-t-1-check)
- [鳥哥教學](http://linux.vbird.org/linux_basic/0340bashshell-scripts.php)