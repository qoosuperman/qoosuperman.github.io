---
title: "Elixir Basics"
catalog: true
toc_nav_num: true
date: 2021-08-20 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1628438273202-a26e785d044f?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1791&q=80"
tags:
- Elixir
catagories:
- Elixir
updateDate: 2021-08-20 22:26:24
# top: 1
description: Basic things for Elixir
---

# Elixir Basic Introduction

會想學 Elixir 是想知道 functional programming 寫起來的手感，剛好公司有其他專案在使用，想要順便累積經驗，先學些基礎就可以從一些小票開始做起！

這篇主要在寫 Elixir 的基本，最可怕最精華的 OTP 還無法寫，因為還不會 XD

上了這個 [課程](https://www.udemy.com/course/) 之後了解一些基本概念，也感謝泰安老師開過 Elixir 的 workshop，讓我知道這個課程沒介紹到 Elixir 最精華的部分 QQ

希望之後如果多學到了什麼會再補充(每次都這樣講，但後來都沒時間補)

## Concept
在 functional programming 裡面，module 就是包著很多的 method 的集合，沒有 instance variable 的概念

在 elixir 裡面可以有多個同名的 method，但有不同的參數數量，在 elixir 裡面會認為是不同的 method, Cards.shuffle/0 跟 Cards.shuffle/1 是不同的 methods

在 elixir 裡面如果定義一個有 default 值的 function，其實總共一次做了兩個 function，他們接的參數數量不同

所以如果 looping 產生 atom 就會 memory leak

### pattern matching
因為非物件導向，所以在 elixir 裡面很多取值的行為都要透過 pattern matching 的方式實現

在等號左右邊，只要資料結構相同(ex. tuple 對上 tuple)，而且資料的數目相同，那就可以做 pattern matching，又或者說，其實每次在使用等號都在做 pattern matching

比方說 `Enum.split(deck)` 的結果會變成 `{my_hand, the_rest}` 這樣的結構

如果用 `Enum.split(deck)[0]` 這種方式會出錯

而是要用 `{hand, rest_of_deck} = Enum.split(deck)` 這種方式把東西 assign 給 hand 跟 reset_of_deck 這兩個額外的變數
```elixir
iex(2)> color
["red"]
iex(3)> [color]=["red"]
["red"]
```

如果是 map 比 map, 只要前面是後面的子集都可以成功
```
> html=%{head: "<html5>", status: "100", body: "some_str"}
> %{} = html
> %{head: head, status: "100"} = html
%{body: "some_str", head: "<html5>", status: "100"}
> head
"<html5>"
```

#### Case
在 elixir 的 case 裡面同樣是以 pattern matching 的方式進行
```elixir
def load(filename) do
  {status, binary} = File.read(filename)
  case status do
    :ok -> :erlang.binary_to_term(binary)
    :error -> "File not exist"
  end
end
```
然後這有更優雅的寫法，我們已經知道 File.read 會產生一個狀態跟副產品，就可以不用在外面先做一次 assignment
```elixir
def load(filename) do
  case File.read(filename) do
    {:ok, binary} -> :erlang.binary_to_term(binary)
    {:error, _reason} -> "File not exist"
  end
end
```

### pipe operator
因為不是物件導向的關係，我們很有可能會寫出下面這種 code
```elixir
def create_hand(hand_size) do
  deck = Cards.create_deck
  deck = Cards.shuffle(deck)
  hand = Cards.deal(deck, hand_size)
end
```
pipe operator 可以讓這種 code 變得很簡潔，他會把上一個產生的結果自動塞到下一個式子的第一個 argument

```elixir
def create_hand(hand_size) do
  Cards.create_deck
  |> Cards.shuffle
  |> Cards.deal(hand_size)
end
```

### 跟 Erlang 的關係
Elixir 跟 Erlang 的關係可以看下面的圖，其實 Elixir 就像是提供一個比較容易操作的介面讓我們操作 Erlang，最後都還是會轉成 Erlang 執行，有一些 Elixir 沒有的 library 可能需要靠 Erlang 的協助，像是畫圖就可以用 erlang 的 egd module
![erlang and elixir](https://i.imgur.com/C7BO0th.png)

下面這是另一個例子：
```
binary = :erlang.term_to_binary(deck)
File.write(filename, binary)
```

通常 erlang 的 module 都是小寫，而 Elixir 的 module 都是大寫

## 常用的 module
### Enum
像是 map 或者 filter 這種 function，後面接另一個匿名函式：
```elixir
def filter_odd_sqaures(%Identicon.Image{grid: grid} = image) do
  Enum.filter(grid, fn(sqaure) -> ... end)
end
```
如果要用 map 傳給另一個有名字的 function，有個像是 ruby 的寫法
```elixir
def build_grid(%Identicon.Image{hex: hex} = image) do
  hex
  |> Enum.chunk(3)
  |> Enum.map(&mirror_row/1) # <= 這裏
end
```

## type
### atom
像是 ruby 的 symbol
```
:some_atom
```
要注意 Elixir 裡面的 atom 不做垃圾回收，所以不要動態的產生 atom，會造成 memory leak

### string
```
"string"
```
字串只能用 double quote

```
> [97, 98, 99]
'abc'
```
如果一個 array 裡面的數字都是 ASCII 守備範圍，會把它變成字
```
> [83,84,85,86,87,88,89,90,91]
'STUVWXYZ['
```
### list
在 elixir 裡面沒有 array

我們看到的 array 其實只是把它變成我們容易理解的樣子
```elixir
[1, 2, 3]
# 這個 list 實際上會是像下面這樣
[1 | [2 | [3 | []]]]
```
因為巢狀結構的關係，所以塞東西到 list 裡面最好從前面塞，不然 performance 很慢

> The performance of getting nth element in a list is O(n)

可以用 ++ 把東西塞到 list 裡面

在 functional language 裡面，通常一個 array 存到記憶體裡面就不會再去改變
所以下面的範例會佔據三個記憶體空間
```
[1, 2, 3] ++ [4,5,6]
[1,2,3,4,5,6]
```
#### for loop of list
如果用 <- 這個符號，表示把 list 裡面每一個東西都做迭代

他會把原本的 list 的東西丟到 do block 裡面，最後產生新的 list
![for concept of list](https://i.imgur.com/I2ehoqP.png)
```elixir
def create_deck do
  values = ["Ace", "two", "three"]
  suits = ["Spades", "Clubs", "Diamonds", "Hearts"]

  for suit <- suits do
    suit
  end
end
```
comprehension of list 還可以同時進行兩個回圈
```elixir
def create_deck do
  values = ["Ace", "two", "three"]
  suits = ["Spades", "Clubs", "Diamonds", "Hearts"]

  for suit <- suits, value <- values do
    "#{value} of #{suit}"
  end
end
```
如果像是 ruby 那樣包成兩層，結果會是 nested 的 list，所以可能跟我們想要的不同

### tuple
在 elixir 裡面 tuple 長度需要是固定的，如果去做 insert 這些操作，都會產生全新的 tuple
```
tuple = { :a, :b, :c, :d}
```
那到底什麼時候要用 list，什麼時候用 tuple 呢？

[這篇文件](https://elixir-lang.org/getting-started/basic-types.html#lists-or-tuples) 有詳細的解說

簡單來說 list 就有前面說的，操作越後面的 element performance 會越差，這點在 tuple 身上就不會，但是如果要更新 tuple 的代價昂貴，因為他會產生一個新的 tuple 存起來

### map
就像是 ruby 的 hash
```
%{a:1, b:2, c:3}
```
key 可以是任何東西
```
%{"a" => 1, 2 => "b", [1,2,3] => [4,5,6]}
```

map 的 key 如果是 symbol 的話可以用 `.` 去拿到 value

但如果是字串當作 key 的話，要拿到 value 需要用 pattern matching

map 的 pattern matching:

左右邊不一定要相同，但左邊的 key 是一定要在這個 map 中存在的
```elixir
> m = %{:a => 1, "b" => 2}
> m.a
1
> m.b
** (KeyError) key :b not found in: %{:a => 1, "b" => 2}
> %{"b" => b_value} = m
> b_value
2
```

```elixir
iex(1)> colors = %{primary: "red", secondary: "blue"}
%{primary: "red", secondary: "blue"}
iex(2)> %{secondary: second_color} = colors
%{primary: "red", secondary: "blue"}
iex(3)> second_color
"blue"
```

如果是 map 或者 struct，他的 key 使用 symbol，則可以用 . 的方式（屬性）去拿到 nested 的值
```elixir
> mm = %{primary: %{a: 1, b: 2}, secondary: "blue"}
> mm.primary.a
1
```


更新 map

其實在 elixir 裡面不會去改變一個 data structure 的直，而是把原本的複製一份做一個新的出來
```elixir
iex(1)> colors = %{primary: "red", secondary: "blue"}
%{primary: "red", secondary: "blue"}
iex(2)> Map.put(colors, :primary, "blue")
%{primary: "blue", secondary: "blue"}
iex(3)> colors
%{primary: "red", secondary: "blue"}
```

或者可以用 pipe 來更新 map 的值
```elixir
iex(4)> %{colors | primary: "blue"}
%{primary: "blue", secondary: "blue"}
iex(5)> colors
%{primary: "red", secondary: "blue"}
```
但這只適用在 map 裡面有這個值的時候，如果 map 原本沒有這個 key, 就必須用 put 放到 map 裡面

### Keyword List
還有一個特殊的資料結構叫做 keyword list
```
[{:a, 1}, {:b, 2}, {:c, 3}]
=> [a:1, b:2, c:3]
```

他是一個 list + tuple 組合起來的資料結構
```elixir
iex(6)> colors = [{:primary, "red"},{:secondary, "blue"}]
[primary: "red", secondary: "blue"]
iex(7)> colors[:primary]
"red"
```
在 ecto 裡面常常用到這個結構
```elixir
query = User.find_where([where: user.age > 10, where: user.subscribed == true])
```
另外 elixir 還有一個特殊規則，如果傳到 function 裡面的最後一個參數是 keyword list，那他的中括號可以省略，所以又可以寫成這樣：

```elixir
query = User.find_where(where: user.age > 10, where: user.subscribed == true)
```

## Struct

struct 又是另一種資料結構，很像map，我們可以在 module 裡面定義，然後使用的時候前面加上 %
```elixir
defmodule Identicon.Image do
  defstruct hex: nil
end

%Identicon.Image{}
%Identicon.Image{hex: hex}
# hex 在這邊是已經有 assign 過的變數
```

struct 也可以做 pattern matching

很特別的是要把 Struct 前面的類似 namespace 也都寫上去
```elixir
defmodule Identicon do
  def main(input) do
    input
    |> hash_input
    |> pick_color
  end

  def pick_color(image) do
    %Identicon.Image{hex: hex_list} = image # 把 list assign 給 hex_list 變數
    [r, g, b | _tail] = hex_list

    [r, g, b]
  end

  def hash_input(input) do
    hex = :crypto.hash(:md5, input)
    |> :binary.bin_to_list

    %Identicon.Image{hex: hex}
  end
end
```
其中，我們也可以省略掉 assign 給 hex_list 這個步驟
```elixir
  def pick_color(image) do
    %Identicon.Image{hex: [r, g, b | _tail] } = image # 把 list assign 給 hex_list 變數

    [r, g, b]
  end
```

struct 比較特別的地方是要在他身上先定義好之後會有的 key，不能想加就加，否則會報錯

現在我們嘗試把 rgb 三個變數包在原本的 struct 裡面丟回去，首先要重新定義 struct，加上 color 這個 key
```elixir
defmodule Identicon.Image do
  defstruct hex: nil, color: nil
end
```
延續上面的範例，但這次我們要把回傳值改成 struct，然後 struct 跟 map 一樣可以用 pipe 去改變原本就有的 key 的值
```elixir
def pick_color(image) do
  %Identicon.Image{hex: [r, g, b | _tail] } = image

  %Identicon.Image{image | color: {r, g, b}} # 原本的 struct(image 這個變數)裡面的 color 改成 tuple 形式
end
```
而我們甚至可以再接收到參數當下就做 pattern matching
```elixir
def pick_color(%Identicon.Image{hex: [r, g, b | _tail] } = image) do
  %Identicon.Image{image | color: {r, g, b}} # 原本的 struct(image 這個變數)裡面的 color 改成 tuple 形式
end
```
改寫成這樣的話，還是接收一個參數，但它的意義在於除了接收參數，還想同時做 pattern matching




## Elixir 工具箱
### iex
iex 是 iteractive elixir shell

`iex -S mix` 就很像 rails 的 rails c 依樣

就是把這個 console 掛進去專案裡面

### Mix
mix 是 elixir 內建的 command line tool

mix 像是 ruby 的 bundler / Rspec / Rake 的集合體
```elixir
> mix new <project name>
> recompile # 可以重新 load code
```

### Mix file
有個檔案檔名是 `mix.exs`

小知識： exs 代表 compile 玩繼續留在記憶體，ex compile 完之後就變成 .beam 的副檔名

這裡面 deps 的地方專門拿來放第三方套件

如果要裝的話就在 command line 下 `mix deps.get`(像是 bundle install)
```elixir
defp deps do
  [
    {:ex_doc, "~> 0.12"}
  ]
end
```

### xdoc
xdoc 是專門做文件用的套件, 我們只要在想要加上文件的 module 裡面這樣寫：
```elixir
defmodule Cards do
  @moduledoc """
    Provides methods for creating and handling a deck of cards
  """
```
如果是要做 method 的文件，則改用 `@doc 關鍵字`，然後如果要加上 code 的話，格式需要非常注意
```elixir
  @doc """
    Divides a deck into a hand.
    The `hand_size` argument indicates how many cards should be in the hand

  ## Examples

      iex> deck = cards.create_deck
      iex> {hand, deck} = Cards.deal(deck, 1)
      iex> hand
      ["Ace of Spades"]

  """
  def deal(deck, hand_size) do
    Enum.split(deck, hand_size)
  end
```

接著在 terminal 下 `mix docs`
![mix doc](https://i.imgur.com/prnnSNx.png)

而 xdoc 還有一個很酷的地方是，他裡面寫的這些範例會自動被當作測試去測，所以文件永遠不會過期

如果要單獨執行測試，可以下 `mix test`

除了寫在檔案本身的 xdoc 內容之外，我們也可以寫在 test 目錄底下的檔案
```elixir
defmodule CardsTest do
  use ExUnit.Case
  doctest Cards

  test "create_deck makes 20 cards" do
    deck_length = length(Cards.create_deck)
    assert deck_length == 12
  end
end

```
其中，除了 assert 可以用之外，也可以用 refute 來做反向驗證

## 延伸資源
準備環境可以參考泰安老師的 [文章](https://taian.su/2019-06-13-elixir-env/)
[這次上的 udemy 課程](https://www.udemy.com/course/the-complete-elixir-and-phoenix-bootcamp-and-tutorial/)
[Elixir school](https://elixirschool.com/zh-hant/)
[官方文件](https://elixir-lang.org/docs.html)
[Thinking In Ecto](https://www.youtube.com/watch?v=YQxopjai0CU)
[OTP 介紹影片](https://www.youtube.com/watch?v=5SbWapbXhKo)
[可以線上試 elixir 語法的網站](https://ide.judge0.com/?7U55)
