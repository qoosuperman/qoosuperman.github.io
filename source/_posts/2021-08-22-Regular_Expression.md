---
title: "Regular Expression"
catalog: true
toc_nav_num: true
date: 2021-08-22 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1629577582606-8ca8a689e4e3?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80"
tags:
- Regular Expression
- Ruby
- Shell
catagories:
- Regular Expression
- Ruby
- Shell
updateDate: 2021-08-22 22:26:24
# top: 1
description: regular expression
---

# Regular Expression

- [Basic Operation](#basic-operation)
- [Group](#group)
- [Assertions](#assertions)
- [Lookaround](#lookaround)
- [Examples](#examples)
- [Ruby 相關](#ruby-相關)


因為單純想要讓自己工作上有比較方便的文件可以參考，所以這篇都以 Ruby 或者 bash 的寫法來作為例子

## Basic Operation
### 特殊符號
| 代號 | 代表                                       |   |   |   |
|------|--------------------------------------------|---|---|---|
| \w   | [0-9a-zA-Z_] 英文數字或底線                              |   |   |   |
| \d   | [0-9]                                      |   |   |   |
| \s   | white space (tabs, regular space, newline) |   |   |   |
| \W   | not in [0-9a-zA-Z_]                        |   |   |   |
| \D   | anything that’s not a number               |   |   |   |
| \S   | anything that’s not a space                |   |   |   |


其他特殊符號
![](https://i.imgur.com/kLhTZMP.png)
這要怎麼用呢？ 比方說我現在要把文件裡面所有用到數字的地方挑出來：
```bash
grep -n '[0-9]' regular_express.txt
# 等同於
grep -n '[[:digit:]]' regular_express.txt
```


### 量詞 `{}`
如果想要比對連續的相同規則，可以用 `{}`

```ruby
# 使用 {5} 表示連續出現 5 次
> 'abcde12345'.match(/\d{5}/)   # <MatchData "12345">

# 使用 {2,} 表示連續出現 2 次以上
> 'a++'.match(/\w\+{2,}/)       # <MatchData "a++">
> 'a++'.match(/\w\+{2,}/)       # nil

# 使用 {2, 5} 表示連續出現 2 ~ 5 次
> 'Hi!'.match /^\w{2,5}!/       # <MatchData "Hi!">
> 'Helloooo!'.match /^\w{2,5}!/ #nil
```

量詞還有幾個更常用的特殊字元：

- `*` 出現 0 次以上，等於 `{0,1}`
- `+` 出現一次以上，等於 `{1,}`
- `?` 出現 0 次或 1 次，等於 `{0,}`

### 中括號 `[]`
不管中括號裡面有幾個字，最後都只代表一個字元
範例：
```bash
> grep -n 't[ae]st' regular_express.txt #[ae] 代表 a 或 e
8:I can't finish the test.
9:Oh! The soup taste good.
```
如果我們要選的是所有大寫的 A B C...Z，就可以直接用 `[A-Z]` 
如果要選的這一字元是所有數字跟英文，就可以使用 `[A-Za-z0-9]`

### 反向選擇 跟 行首字元`^`
反向選擇範例(在 `[]` 裡面)
```bash
> grep -n 'oo' regular_express.txt 
1:"Open Source" is a good mechanism to develop programs.
2:apple is my favorite food.
> grep -n '[^g]oo' regular_express.txt 
# 選到帶有 'oo' 的行，但是 oo 前面不能是 g
2:apple is my favorite food. # 結果就少了 good 那一行
```
行首字元範例 (不在 `[]` 裡面)
```bash
> grep -n '^[a-z]' regular_express.txt
# 可以得到第一個字元是小寫字元的行
> grep '^first' regular_express.txt
# 得到 first 開頭的行
```
### 行尾字元 `$`
```bash
> grep -n '\.$' regular_express.txt
# 得到結尾是句號的行
> grep 't$' regular_express.txt
# 得到結尾是t 的行
```
### 任意一個字元 `.`
```bash
> grep -n `g..d` regular_express.txt
# good 跟 glad 都會被抓出來
1:"Open Source" is a good mechanism to develop programs.
9:Oh! The soup taste good.
16:The world <Happy> is the same with "glad".
```

---

## Group
group 是拿來捕獲特定文字供後續使用
```ruby=
> 'user: Alan'.match(/user: (\w+)/)
=> #<MatchData "user: Alan" 1:"Alan">

# 可以用巢狀結構
> 'fullName: Alan Hsu'.match(/fullName: ((\w+) (\w+))/)
=> #<MatchData "fullName: Alan Hsu" 1:"Alan Hsu" 2:"Alan" 3:"Hsu">

t = "First sentence. Second sentence.Third sentence!Fourth sentence?Fifth sentence."
t.gsub(/([.!?])([A-Z1-9])/, "\\1\n\\2") # => "First sentence. Second sentence.\nThird sentence!\nFourth sentence?\nFifth sentence."
```

我們可以幫這些群組命名，讓他更符合語意
```ruby=
> result = 'fullName: Alan Hsu'.match(/fullName: (?<firstName>\w+) (?<lastName>\w+)/)
=> #<MatchData "fullName: Alan Hsu" firstName:"Alan" lastName:"Hsu">
> result[:firstName]
=> "Alan"
```
### non-capturing group
如果捕獲的文字不重要，可以在前面加上 `?:`

```ruby=
> '192.168.0.1'.match /(\d{1,3}\.){3}\d{1,3}/
 => #<MatchData "192.168.0.1" 1:"0.">
> '192.168.0.1'.match /(?:\d{1,3}\.){3}\d{1,3}/
 => #<MatchData "192.168.0.1">
```

### backreference

我們可以用 `\1` `\2` 等等來代表已經捕獲的文字
```ruby=
> ('2a2b').match(/(\d+)a\1b/)
=> #<MatchData "2a2b" 1:"2">
> ('1a2b').match(/(\d+)a\1b/)
=> nil
```

## Assertions
wiki:
> 斷言是一種放在程式中的一階邏輯 ( 例如一個結果為 true 或 false 的判斷式 ) ，當程式執行到斷言的位置時就會執行判斷，若結果為 true 則繼續執行，結果為 false 則中止執行。

前面提到的 `^` `$` 也都是 assertions 的一種，常見的還有文字邊界 `\b` 跟 lookaround

文字邊界顧名思義就是會確定所在位置是不是文字的邊界
```ruby=
> 'difference between Javascript and Java.'.sub(/Java/, 'Ruby')
 => "difference between Rubyscript and Java."
> 'difference between Javascript and Java.'.sub(/\bJava\b/, 'Ruby')
 => "difference between Javascript and Ruby."
> 'difference between Javascript and Java.'.gsub(/\b/, '|')
 => "|difference| |between| |Javascript| |and| |Java|."
```

## Lookaround
這部份是比較進階的用法
```
?=  is for positive look ahead
?!  is for negative look ahead
?<= is for positive look behind
?<! is for negative look behind
```
先來看 lookahead , 意思是「往前看」，語法為：

Positive lookahead ： X(?=Y)

Negative lookahead ： X(?!Y)

解釋為： 我要找 X 而其後方必須/不可為 Y ；而其中 X 和 Y 都可以是一個合法的表達式。

比方說 `/a(?=b)/` 會 match 到 "ab" 裡面的 "a"，但不會 match "ac" 裡面的 a，要注意的是雖然有用括號刮起來，但像是 non-capture group 一樣，他們並不會被放到群組裡面

```ruby
> 'abc'.match(/b(?=c)/)
 => #<MatchData "b">
```

lookahead 跟 non-capturing group 有點像，但 lookahead match 到的部分不包括括號裡面的東西

```ruby=
> 'abc'.match(/a(?=b)/)
 => #<MatchData "a">
> 'abc'.match(/a(?:b)/)
 => #<MatchData "ab">
```

---

## Examples

```ruby
> group = "You: are not coool".match(%r{(^.*):(.*)})
#<MatchData "You: are not coool" 1:"You" 2:" are not coool">
> group[0]
"You: are not coool"
> group[1]
"You"
> group[2]
" are not coool"
```

```ruby
> target.match(%r{(application|assessment)/(\w+)})
```


找到 html tag 裡面的雙引號：

`[^<]*>` 代表最後是 `>` 然後前面是除了 `<` 之外任意東西的 n 個

`"(?=[^<]*>)` 就是找到雙引號，他的後面需要有 `>`，然後這個 `>` 的前面到雙引號之間不能有 `<`
```ruby
> '<tag>this is a double quote "  </tag>'.match(/"(?=[^<]*>)/)
 => nil
> '<tag href="this is a double quote ">'.gsub(/"(?=[^<]*>)/, "|")
 => "<tag href=|this is a double quote |>"
```

---

## Ruby 相關
### ruby 的 `%r`
`%r` 裡面的東西會自己轉變成 regular expression(class 是 Regexp)
好處是不用去做 escape
```ruby
%r{/home/user}
# 會等於
/\/home\/user/
```

### match
一般常見的用法：

mtach 的結果會回傳 MatchData 物件
```ruby=
> string = '{fontsize: 54}Biigger text{fontsize}'
> result = string.match(/\{fontsize: *(\d*)\}(.*?)\{fontsize\}/)
> result[1]
 => "54"
> result[2]
 => "Biigger text"
> result.captures
 => ["54", "Biigger text"]
```
如果是用 block，裡面被 yield 出來的參數也是同樣的 MatchData 物件
```ruby=
string.match(/\{fontsize: *(\d*)\}(.*?)\{fontsize\}/) do |match|
  p match[1]
  p match[2]
  p match.captures
end

#"54"
#"Biigger text"
#["54", "Biigger text"]
```

### gsub

可以在 gsub 裡面使用 regular expression 應該大家都知道，但如果想要比較複雜的操作，在 gsub 的 block 裡面 yield 的物件是 String 物件，可以用 `RegExp.last_match` 拿到 MatchData 物件

```ruby=
> string.gsub(/\{fontsize: *(\d*)\}(.*?)\{fontsize\}/) do |s|
  p s.class
end
=> "String"

> string.gsub(/\{fontsize: *(\d*)\}(.*?)\{fontsize\}/) do
  match = Regexp.last_match
  "<span font-size='#{match[1]}'px>#{match[2]}</span>"
end
=> "<span font-size='54'px>Biigger text</span>"
```

### `=~`
如果只是想看某段字串是否符合 regular expression 可以用這個 operator

他的回傳值是符合的地方的 index
```ruby=
> 'test123' =~ /123/
 => 4
```

### scan
會把符合 regular expression 的部分都放到 array

如果要用 group 的 regular expression 則會變成 nested array
```ruby=
> '123test123'.scan /123/
 => ["123", "123"]
> '123test123'.scan /(123)/
 => [["123"], ["123"]]
```

---

## 參考資料
[五倍紅寶石的介紹](https://5xruby.tw/posts/15min-regular-expression)
[Stackoverflow](https://stackoverflow.com/questions/12493128/regex-replace-text-but-exclude-when-text-is-between-specific-tag)
[Stackoverflow: Difference between ?:, ?! and ?=](https://stackoverflow.com/questions/10804732/difference-between-and)
