---
title: "Synopsis of Nothing is Something"
catalog: true
toc_nav_num: true
date: 2023-01-30 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770&q=80"
tags:
- SQL
catagories:
- SQL
updateDate: 2023-01-30 22:26:24
# top: 0
description: Synopsis of Nothing is Something
---

看了 Sandi Metz 在 RailsConf 2015 的 [演講](https://www.youtube.com/watch?v=OMPfEXIlTVE&t=1808s)，覺得很受啟發，因此想要將這個演講的內容做個摘要紀錄下來，以下代稱 Sandi Metz 為講者

## Outline
- [Boolean Syntax in Ruby](#boolean-syntax-in-ruby)
- [Send Message Instead of Conditions](#send-message-instead-of-conditions)
- [Null Object](#null-object)
- [Refactor a Real Example](#refactor-a-real-example)
- [Summary](#summary)
- [References](#references)

## Boolean Syntax in Ruby
講者一開始寫過 Smalltalk 這個接近純 OO 的語言，而這個語言後來啟發了更多像是 Python / Ruby 等語言，在接觸 Ruby 的時候有的部分他覺得很不習慣

寫 Ruby 要知道 send message 才是正常的寫法，而使用 `.` 則可以說是 Ruby 提供的語法糖
```ruby
1.to_s
# 會等於
1.send(:to_s)

1 + 1
# 會等於
1.send(:+, 1)
```

上面的東西不令講者感到意外，令他意外的是一些 boolean 的特殊語法

Smalltalk 的關鍵字有幾種：
```
true false nil self super thisContext
```
但是 Ruby 則有很多
```
if alias and BEGIN def defined? .....
```
其中他認為最特別的是 if

```ruby
if (truthy)
  # code to eval when 'true'
else
  # code to eval when 'false'
end
```
其實 OO 裡面是討厭 type check 的，應該改用 OO 的方式來做，也就是改用 send message 的方式來做

## Send Message Instead of Conditions

那我們可以如何用 OO 的方式做到 if else 呢？ 我們可以 monkey patch

true 跟 false 的 class 分別是 TrueClass 跟 FalseClass
```ruby
class TrueClass
  def if_true
    yield
    self
  end

  def if_false
    self
  end
end
```

```ruby
class FalseClass
  def if_true
    self
  end

  def if_false
    yield
    self
  end
end
```
上面的改寫讓我們可以達到這樣的效果
```ruby
(1 == 1).if_true { puts 'evaluated block' }
> 'evaluated block'

(1 == 1).if_false { puts 'evaluated block' }
# block ignored
```

所以其實我們根本不需要 if
```ruby
if (1 == 1)
  puts 'is true'
else
  puts 'is false'
end
# 改寫
(1 == 1).
  if_true { puts 'is true' }.
  if_false { puts 'is false' }
```

> I don't want to change Ruby
  I want to change you

講者強調他並沒有想要大家改成這樣寫，但是他希望大家多想想如果沒有 if 的話該怎麼做，因為他很討厭 conditions

## Null Object
在平常時，我們可能很容易因為下面的情境遇到 NoMethodError
```ruby
Animal.find('pig')
> # object
Animal.find('')
> nil

ids = ['pig', '', 'sheep']
animals = ids.map { |id| Animal.find(id) }
# 第二個是 nil
animals.each { |animal| puts animal.name }
> NoMethodError
```

為了要修正上面的錯誤，我們常常做一些事情像是下面這樣

```ruby
animals.each { |animal|
  puts animal.nil? ? 'no animal' : animal.name
}
# 上面可以，但有點醜
animals.each { |animal|
  puts animal && animal.name
}
animals.each { |animal|
  puts animal.try(:name)
}
```

但我們仔細看看裡面的東西

```ruby
puts animal.try(:name)
puts animal.nil? ? '' : animal.name
puts animal == nil ? '' : animal.name
puts animal.is_a?(NilClass) ? '' : animal.name

if animal.is_a?(NilClass)
  puts ''
else
  puts animal.name
end
```
這不就是講者最討厭的 conditions 嗎 XD

而講者討厭的原因就是因為這些 condition 會不斷地在 code 裡面繁殖

他想要的就是單純送一個 message (message centric) 就不用在裡面使用 if 或者三元判斷式

所以先改成這樣做：
```ruby
class Animal
  def name
    ...
  end
end

class MissingAnimal
  def name
    'no animal'
  end
end

animals = ids.map { |id| Animal.find(id) || MissingAnimal.new }
animals.each { |animal| puts animal.name }
# 雖然解決了問題，但在這裡用 MissingAnimal 造成了 dependency(多知道一個 object 的功能)
```
這就是 Null Object Pattern

Null Object Pattern 的精神簡短來說就是 Active Nothing(可互動的 nothing)

為了進一步解決上述 dependency 的問題，需要再包一層物件上去
```ruby
class GuatenteedAnimal
  def self.find(id)
    Animal.find(id) || MissingAnimal.new
  end
end
animals = ids.map { |id| GuatenteedAnimal.find(id) }
animals.each { |animal| puts animal.name }
```
講者為這個例子做了一個總結

> Sometimes nil is nothing
  But if you send it a message, nil is Something
  If you're talking to nil, then it's something, stop checking nil

請大家開始相信 believe in nothing，就像 0 這個數字對我們來說的意義一樣

在有 0 這個概念以前，我們有一些事情是做不到的，有了 0 這個概念之後就變得很方便

但講者過去一段時間了解到 null object pattern 其實是一個簡單概念的其中一個小例子，接下來會再舉一個例子

## Refactor a Real Example
在這個例子中，一開始的功能是要把歌詞印出來

```Ruby
class House
  def phrase(number)
    data.last(number).join('')
  end

  def line(number)
    "This is #{phrase(number)}.\n"
  end

  def recite
    (1..data.length).map { |i| lin(i)}.join("\n")
  end

  def data
    [
      'This is the house that Jack built.'
      'This is the malt that lay in the house that Jack built.'
      'This is the rat that ate the malt,'
      'That lay in the house that Jack built.'
      'This is the cat that chased the rat,'
      'That ate the malt that lay in the house that Jack built.'
      'This is the dog that worried the cat,'
      'That chased the rat that ate the malt,'
      'That lay in the house that Jack built.'
    ]
  end
end
```
這時候新需求來了： New feature => RandomHouse

這個需求的具體內容是需要歌詞可以亂序排列，這時候繼承是一個很有吸引力的選擇，只要改一點 code ，下面這樣做就完成了
```ruby
class RandomHouse < House
  def data
    @data ||= super.shuffle
  end
end

RandomHouse.new.prase(3)
```
這時候又有新需求來了： New feature => EchoHouse

這個需求的具體內容是需要歌詞的同一個句子要重複兩次，首先改一下 House 裡面的內容
```Ruby
class House
  def phrase(number)
    data.last(number).join('')
  end
  # 改成
  def phrase(number)
    parts(number).join('')
  end

  def parts(number)
    data.last(number)
  end
end
```
這時候繼承還是一個很有吸引力的選擇
```Ruby
class EchoHouse < House
  def parts(number)
    super.zip(super).flattern
  end
end
```
現在的繼承狀況是這樣
![](https://i.imgur.com/TWUouOu.png)

就在這時候又有新需求來了： New feature => RandomEchoHouse

這時候就慘了

講者請大家試試看，請不要覺得繼續繼承或者拆出 module 共用可以解決你的問題

比方說繼續使用繼承也會很糟，因為跟 Echo House 的 code 重複了：
```ruby
class RandomEchoHouse < RandomHouse
 def parts(number)
  super.zip(super).flatten
 end
end
```

這時候更多人的選擇不是像上面一樣只重複部分的 code，而是重複所有的 code
```ruby
class RandomEchoHouse < House
  def data
    @data ||= super.shuffle
  end

  def parts(number)
    super.zip(super).flatten
  end
end
```

為什麼這時候會遇到這個困難呢？

用圖片來說明比較清楚：

![](https://i.imgur.com/NPQSIBZ.png)

我們可能以為 RandomHouse 只有橘色框框的部分，但其實真正的範圍比我們想像的範圍大，因為綠色部分是繼承而來的

![](https://i.imgur.com/T9a2hmg.png)

當我們想要兩者的功能但只繼承其中一邊的話是不可能的

講者為這一段說明留下一句註解：

> Inheritance is for specialization, is not for sharing code

**那到底該怎麼解決這個問題呢？**

這時候要問問自己一個問題 is Random House a House? ，如果是的話才適用於使用繼承的情境

不要因為命名是 House 就被騙了，應該要觀察行為來決定

我們回頭看看 Random House 的行為，我們要觀察他們哪裡不一樣最快的方式就是把他們變的越接近越容易看出來

> Reveal how things differ by making them more alike

```ruby
class House
  def data
    [
      'This is the house that Jack built.'
      'This is the malt that lay in the house that Jack built.'
      'This is the rat that ate the malt,'
      'That lay in the house that Jack built.'
      'This is the cat that chased the rat,'
      'That ate the malt that lay in the house that Jack built.'
      'This is the dog that worried the cat,'
      'That chased the rat that ate the malt,'
      'That lay in the house that Jack built.'
    ]
  end
end

class RandomHouse < House
  def data
    @data ||= super.shuffle
  end
end
# 改成
class House
  DATA =
    [
      'This is the house that Jack built.'
      'This is the malt that lay in the house that Jack built.'
      'This is the rat that ate the malt,'
      'That lay in the house that Jack built.'
      'This is the cat that chased the rat,'
      'That ate the malt that lay in the house that Jack built.'
      'This is the dog that worried the cat,'
      'That chased the rat that ate the malt,'
      'That lay in the house that Jack built.'
    ]

  def data
    @data ||= DATA
  end
end

class RandomHouse < House
  def data
    @data ||= DATA.shuffle
  end
end
```

使用表格來做思考，然後什麼改變了就給他一個名字

| class      | data     | ???      |
| --------   | -------- | -------- |
| House      | DATA     |          |
| RandomHouse| DATA     | shuffle  |

這裡的 ??? 應該填入什麼呢？往他上一層抽象來想的話，比較準確的應該是 order

| class      | data     | order!   |
| --------   | -------- | -------- |
| House      | DATA     |          |
| RandomHouse| DATA     | shuffle  |

這時候再重新問一次上面的問題：

Is Order a House?

明顯不是，那 Order 是什麼呢？他其實比較接近一個角色(role)，可以說是功能型球員，我們根據這樣的概念來改寫：

```ruby
class DefaultOrder
  def order(data)
    data
  end
end
class RandomOrder
  def order(data)
    data.shuffle
  end
end
```
我們現在需要的是把排序的相依從 House 裡面拿出來

首先改寫一下 House
```ruby
class House
  DATA = [...]
  attr_reader :data
  def initialize
    @data = Data
  end
end
```

然後把對 order 的相依性放進去

```ruby
class House
  DATA = [...]
  attr_reader :data
  def initialize(orderer = DefaultOrder.new)
    @data = orderer.order(DATA)
  end
end
```
這裡的概念就是把不同的東西抽出來，做成 pluggable behavior 的樣子

更精簡來說：

> Inject an object to play the role of the thing that varies

之後使用一樣的方式去改寫 EchoHouse
```ruby
class House
  def initialize(orderer: DefaultOrder.new, formatter: DefaultFormatter.new)
    @formatter = formatter
    @data = orderer.order(DATA)
  end

  def parts(number)
    formatter.format(data.last(number))
  end
end
class DefaultFormatter
  def format(parts)
    parts
  end
end
class EchoFormatter
  def format(parts)
    parts.zip(parts).flatten
  end
end
puts House.new(formatter: EchoFormatter.new).line(12)
```
這樣一來就解決了這個新需求的問題

把上面做的事情一樣一樣列出來的話可以拆成四個步驟：
1. Isolate the thing that vary
2. Name the concept
3. Define the Role
4. Inject the player

而這樣的方式使用到大家在討論 refactor 的兩個概念：composition + dependency injection

## Summary

看完這個 talk 真的受益良多，寫 code 滿容易卡在苦無思考方向，也許這個 talk 是一個很好的思考起點

另外之前碰到一些感覺需要 refactor 的 code 但不知道從何開始，有些情況應該是照著這樣的邏輯去解掉的

## References

[RailsConf video](https://www.youtube.com/watch?v=OMPfEXIlTVE&t=1808s)