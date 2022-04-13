---
title: "Synopsis of Refactoring Ruby Edition"
catalog: true
toc_nav_num: true
date: 2022-4-13 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1551122102-63cd339bfaab?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1771&q=80"
tags:
- Ruby
catagories:
- Ruby
updateDate: 2022-4-13 22:26:24
# top: 1
description: Synopsis of Refactoring Ruby Edition
---

## Intro
最近看了一本書叫做 Refactoring Ruby Edition，因為前一本書 99 bottles of OOP 有大力推薦這本書，所以算是被書推坑

看完之後的建議是初學者不建議看，比 99 bottles of OOP 硬滿多的，但這本書還算可以當工具書來看看遇到不同情境可以怎麼做，只是如果經驗不足，可能也一時不知道要用什麼 refactor 的方式比較好，這種情況可能也難以查找

對我來說就是可以看看大神怎麼去對不同情境 Refactor，收穫也是很豐富，以下就是把一些我覺得值得記錄的地方做個紀錄
![](https://i.imgur.com/6LuTAnA.png)

## Outline
- [Replace Temp with Query](#replace-temp-with-query)
- [Replace Temp with Chain](#replace-temp-with-chain)
- [Introduce Explaining Variable](#introduce-explaining-variable)
- [Split Temporary Variable](#split-temporary-variable)
- [Remove Assignments to Parameters](#remove-assignments-to-parameters)
- [Replace Loop with Collection Method](#replace-loop-with-collection-method)
- [Extract Surrounding Method](#extract-surrounding-method)
- [Introduce Class Annotation](#introduce-class-annotation)
- [Introduce Named Parameter](#introduce-named-parameter)
- [Removed Named Parameter](#removed-named-parameter)
- [Removed Unused Default Parameter](#removed-unused-default-parameter)
- [Define Methods by Extending a Dynamically Defined Module](#define-methods-by-extending-a-dynamically-defined-module)
- [Replace Dynamic Receptor with Dynamic Method Definition](#replace-dynamic-receptor-with-dynamic-method-definition)
- [Isolate Dynamic Receptor](#isolate-dynamic-receptor)
- [Move Method](#move-method)
- [Move field](#move-field)
- [Extract Class](#extract-class)
- [Hide Delegate](#hide-delegate)
- [Self encapsulate Field](#self-encapsulate-field)
- [Change Value to Reference](#change-value-to-reference)
- [Change Reference to Value](#change-reference-to-value)
- [Replace Array with Object](#replace-array-with-object)
- [Replace Hash with Object](#replace-hash-with-object)
- [Encapsulate Collection](#encapsulate-collection)
- [Replace Type Code with Polymorphism or Strategy](#replace-type-code-with-polymorphism-or-strategy)
- [Replace Type Code with Module Extension](#replace-type-code-with-module-extension)
- [Introduce Null Object](#introduce-null-object)
- [Introduce assertion](#introduce-assertion)
- [Parameterize Method](#parameterize-method)
- [Replace Parameter with Explicit Methods](#replace-parameter-with-explicit-methods)
- [Introduce Parameter Object](#introduce-parameter-object)
- [Introduce Gateway](#introduce-gateway)
- [Introduce Expression Builder](#introduce-expression-builder)
- [Form Template Method](#form-template-method)
- [Other](#other)

## Replace Temp with Query
temp variable 的問題在於他只存在這個 scope，把它抽成 method 的話在整個 class 裡面都可以用到
```ruby
base_price = @quantity * @item_price
if base_price > 1000
  base_price * 0.95
else
  base_price * 0.8
end

# After
if base_price > 1000
  base_price * 0.95
else
  base_price * 0.8
end

def base_price
  @quantity * @item_price
end
```

## Replace Temp with Chain
有另一個 refactoring method 是 Hide Delegate，兩者乍看衝突，但他們之間最大的差別在於 Replace Temp with Chain 回傳的東西都對同樣的 API 回應，而 Hide Delegation 回傳的東西每次可能都是不同的物件，也就是有沒有違反 Law of Demeter
```ruby
mock = Mock.new
expectation = mock.expects(:new_method)
expectation.with(arguments)

# after
mock = Mock.new
mock.expects(:new_method).with(arguments)
```
1. 確定中間回傳的東西都是 self，或者去改，讓他們對同樣的 API response
2. test
3. 去除 local variables，並把它們串起來
4. test

### Example
```ruby
class Select
  def options
    @options ||= []
  end

  def add_option(arg)
    @options << arg
  end
end

select = Select.new
select.add_option(1)
select.add_option(2)
select.add_option(3)
select

# 第一步，做一個 method 會回傳 select instance
class Select
  def self.with_option(option)
    select = self.new
    select.options << option
    select
  end
  # ...
end
select = Select.with_option(1).add_option(2).add_option(3)

# 第二步 把 method 改成回傳 self
class Select
  def self.with_option(option)
    select = self.new
    select.options << option
    select
  end
  def add_option(arg)
    @options << arg
    self
  end
  # ...
end

# 第三步把 method rename 讓他可以讀起來更順暢
class Select
  def self.with_option(option)
    select = self.new
    select.options << option
    select
  end
  def and(arg)
    @options << arg
    self
  end
  # ...
end
select = Select.with_option(1).and(2).and(3)
```

## Introduce Explaining Variable
有時候我們會需要 temp 來解釋這段 code 在做什麼，但這種情況又十之八九可以用 Extract Method 解決

常常如果在很多複雜的 conditional，又遇到問題不能 Extract method，可以試試看用 explaining variable

## Split Temporary Variable
有時候同樣名字的 variable 會有不同含意，這時候可以把他們拆成兩個

## Remove Assignments to Parameters
這個比較單獨適用在 Ruby 身上，不同語言特性可能不同

當你看到有 method 把值 assign 到參數身上，最好把它改掉，用一個 temp variable
```ruby
def discount(input)
  if input > 50
    input -= 2
  end
end

# after
def discount(input)
  result = input
  if input > 50
    result -= 2
  end
end
```

## Replace Loop with Collection Method
用 filter / map 等等方法，會比用原本的 loop 的方式容易理解，有時候會做兩件事情以上，這時候可以把它串連起來分開做

```ruby
manager_offices = []
employees.each do |e|
  manager_offices << e.office if e.manager?
end

## after
manager_offices = employees.select { |e| e.manager? }
                           .map { |e| e.office }
```

## Extract Surrounding Method
有時候重複的 code 卡在中間，這時候可以善用 block
1. 在重複的 code 的其中一端用 Extract Method，把這段重複的行為命名
2. 測試
3. 把原本的 method 改成送 block 進去，把不重複的邏輯搬到 block 裡面
4. 在抽出來的這個 method 裡面，不重複的邏輯改用 yield
5. block 裡面需要的東西當作參數
6. test
7. 把其他適用的方法也改成用這個抽出來的 method 改寫

範例：
```ruby
def number_of_living_descendants
  children.inject(0) do |count, child|
    count += 1 if child.alive?
    count + child.number_of_living_descendants # recursion
  end
end

def number_of_living_descendants_named(name)
  children.inject(0) do |count, child|
    count += 1 if child.name == name
    count + child.number_of_living_descendants_named(name) # recursion
  end
end

# step1 Extract Method 其中一個
def number_of_living_descendants_named(name)
  count_descendants_matching(name)
end

def count_descendants_matching(name) # 新 method
  children.inject(0) do |count, child|
    count += 1 if child.name == name
    count + child.number_of_living_descendants_named(name) # recursion
  end
end

# step2 不重複的邏輯放到 block
def number_of_living_descendants_named(name)
  count_descendants_matching { |descendant| descendant.name == name }
end

def count_descendants_matching(&block)
  children.inject(0) do |count, child|
    count += 1 if yield child
    count + child.count_descendants_matching(&block) # recursion
  end
end

# step3 改其他適用的 method
def number_of_living_descendants
  count_descendants_matching { |descendant| descendant.alive? }
end
```

## Introduce Class Annotation
我在 metaprogramming 裡面看到這招叫做 class macro

```ruby
class SearchCriteria
  def initialize(hash)
    @author_id = hash[:author_id]
    @publisher_id = hash[:publisher_id]
    @isbn = hash[:isbn]
  end
end

## After
class SearchCriteria
  hash_initializer :author_id, :publisher_id, :isbn
end

module Custominitializers
  def hash_initializer(*attr_names)
    define_method(:initialize) do |*args|
      data = args.first || {}
      attr_names.each do |attr_name|
        instance_variable_set "@{attr_name}", data[attr_name]
      end
    end
  end
end

Class.send :include, Custominitializers
```

## Introduce Named Parameter

這招尤其在 optional parameters 身上好用

```ruby
def self.find(selector, conditions = "", *joins)

  #...
end

# 第一步 可以把他們統一變成 hash
def self.find(selector, hash={})
  hash[:joins] ||= []
  hash[:conditions] ||= ""
  #...
end

# 這樣的壞處是，要看過整個 method 才知道有哪些 parameter 可以給，最好在一開始讓人明確知道可以給哪些參數
# 第三步 客製化條件的 hash
module AssertValidKeys
  def assert_valid_keys(*valid_keys)
    unknown_keys = keys - [valid_keys].flatten
    if unknown_keys.any?
      raise(ArgumentError, "unkown Key(s): #{unknown_keys.join(', ')}")
    end
  end
end
Hash.send(:include, AssertValidKeys)

class Book
  def self.find(selector, hash={})
    hash.assert_valid_keys(:conditions, :joins)
    hash[:joins] ||= []
    hash[:conditions] ||= ""
  end
end
```

## Removed Named Parameter
如果這個參數的意義已經很明顯，那就可以把它變成一般的參數來降低複雜度

## Removed Unused Default Parameter
有時候我們給一個參數 default value，但他從來沒被這樣用過，而沒有用的彈性是壞的，他應該被拿掉

## Define Methods by Extending a Dynamically Defined Module
```ruby
class PostData
  def initialize(post_data)
    @post_data = post_data
  end

  def params
    @post_data[:params]
  end

  def session
    @post_data[:session]
  end
end
```
這種情況我們可以用 method_missing 來做，但這樣很難 debug，所以可以避免就盡量避免，最好就把他動態做出來
```ruby
class PostData
  def initialize(post_data)
    (class << self; self; end).class_eval do
      post_data.each_pair do |key, value|
        define_method key.to_sym do
          value
        end
      end
    end
  end
end
```

這樣的 code 可以用，但不好看懂，Ruby 可以有匿名的 module，我們可以把 hash 變成匿名的 module

```ruby
class Hash
  def to_module
    hash = self
    Module.new do
      hash.each_pair do |key,value|
        define_method key do
          value
        end
      end
    end
  end
end

class PostData
  def initialize(post_data)
    self.extend post_data.to_module
  end
end
```

## Replace Dynamic Receptor with Dynamic Method Definition
就像前面講的，使用 method missing 會讓 debug 變得困難，最好是用動態建立 method 的方式

## Isolate Dynamic Receptor
如果真的非不得已要使用 method missing，最好把這一段放到一個 class，專門讓他處理 method_missing 的事情

## Move Method
根據責任歸屬來轉換不同 method 應放在哪一個 class 裡面，通常會在某個 class 跟太多人合作，或者太過耦合的時候會做這件事情

有時候這個決定很難，這時候就任憑感覺做事吧，有時候這表示他剛好在一個模糊不清的地方，所以放在哪裡可能也沒有真的很重要

## Move field
這裡的 field 也可以是 instance variable

如果看到某參數在另一個 class 用得比現在這 class 更多，就可以考慮 Move field

## Extract Class
要怎麼拆一個過大的 class 呢？你可以觀察不是是有一些 method 跟一些 data(fields) 都常常一起使用，或者有些 data 常常一起使用，然後彼此相依，這都是可以拿來拆 class 的依據

## Hide Delegate
當某個 class 有一個 open interface，很多 client code 可以透過他做動作，一但這個 interface 要改就要改很多 client code

所以可以把這些 interface 藏在一個更 public 的 interface 後面

## Self encapsulate Field
常常有人在爭論在拿 instance variable，像是 @name 的時候，應該直接使用 @name (direct access) 還是加上 attr_reader (indirect access)

你可以自由在兩者中間切換，indirect access(ex. 用 attr_reader)的好處是，之後你如果有 sub class，可以去覆蓋這些 method

至於 direct access 的好處在於，你看到 code 的時候不用去想他只是 attribute 還是一個真正的 method

## Change Value to Reference

其實物件可以分為許多種類型，其中一種分類就是 reference objects / value objects

reference object 在真實世界裡面就是代表某一個東西，就像某個人，不會有第二個這種物件

value object 就像日期 / 錢，你不會在意有多少個 100 元鈔票的物件

1. Use Replace Constructor with Factory Method
2. test
3. 決定哪些物件有權利 access 這個物件，可以不只是一個，可能是 hash 或者 registry object
4. 決定這些物件是一開始就存在還是動態產生，如果是一開始就存在，要確保準備拿他們的時候，在這之前他們就已經產生
5. 改變 factory method 來 return 這個 reference object
6. test

下面這個例子中，如果有多個 order 對到同一個 customer，我們想要他們是同一個物件
```ruby
class Customer
  attr_reader :name
  def initialize(name)
    @name = name
  end
end

class Order
  def initialize(customer_name)
    @customer = Customer.new(customer_name)
  end
end

# Step1 Replace Constructor with Factory Method
class Customer
  def self.create(name)
    Customer.new(name)
  end
  attr_reader :name
  def initialize(name)
    @name = name
  end
end

class Order
  def initialize(customer_name)
    @customer = Customer.create(customer_name)
  end
end

# Step2 決定用 hash 來存這些預先產生的 customer
class Customer
  Instances = {}
end

# Step3 會有預先產生的過程
class Customer
  Instances = {}

  def self.load_customers
    new('customer1').store
    ...
  end

  def store
    Instances[name] = self
  end
end

# Step4 為了貼近實作意義 改變 factory method
class Customer
  def self.with_name(name)
    Instances[name]
  end
end

class Order
  def initialize(customer_name)
    @customer = Customer.with_name(customer_name)
  end
end
```

## Change Reference to Value
Value Object 的一個重要特性是 immutable，不管你問任何一個同樣意義的 value object(像是百元鈔票)，得到的答案應該要是一致

1. 檢查現在要 refacotr 這個 object 可以是 immutable 或者可以變成 immutable
2. 做出 `==` 跟 `eql?` 兩個 method
3. 做出 hash method
4. test
5. 考慮事不是要把 factory method 拿掉

有的方法實作是靠 `hash` 這個 method，像是 Array 的 `uniq`，如果不去定義它，就可能會讓結果變得很怪

```ruby
class Currency
  attr_reader :code
  def initialize(code)
    @code = code
  end
end
# 做出 == 跟 eql? method

class Currency
  attr_reader :code
  def initialize(code)
    @code = code
  end

  def eql?(other)
    self == (other)
  end

  def ==(other)
    other.equal?(self) ||
      (other.instance_of?(self.class) && other.code == code)
  end
end
# 做出 hash method

def hash
  code.hash
end
```

## Replace Array with Object
Array 應該拿來存放一系列性質差不多的東西，而不是用來存放像是第一個是名字，第二個是身高，這種不適合放在一起的資訊

遇到這種情形就把他們變成 object

## Replace Hash with Object
就像 Array ，Hash 其實也應該存放一些性質差不多的東西(除了 named_parameters 的範疇)，當遇到這種情形可以考慮把他們變成 object

## Encapsulate Collection
class 裡面常常會有一系列 Hash 或者 Array 的資料，然後也很常 expose reader / writer，讓其他人可以增減這個組合

我們 reader expose 出去的不應該是這個物件本身，只讓 client 拿到必要的資料，而無法對原本的資料進行操作，對於 writer 也不讓 client 可以直接複寫全部的資料，而是 expose add / remove method 給他們使用

1. 加上 add/remove methods
2. 把欄位 initialize 為空的 collection
3. 把原本有用到 attribute writer 的地方改掉，看要改成都用 add / remove methods 或者做新的 method，可以一次取代多個 collection
4. 把原本的 reader 改成 return copy
```ruby
class Person
  attr_accessor :courses
end
# 原本要加 course 的流程：
# kent = Persion.new
# kent.courses(Course.new('refactoring'))

# 先加上 add / remove methods
class Person
  def initialize
    @courses = []
  end
  def add_course(course)
    @courses << course
  end
  def remove_course(course)
    @courses.delete(course)
  end
end

# 接著 reader 不應該直接回傳 reference 而應該是 value
class Person
  def courses
    @courses.dup
  end
end
```

## Replace Type Code with Polymorphism or Strategy
當有一段 code 用到很多 case..when 的時候就可以考慮把他用多型或者 strategy pattern 取代掉

## Replace Type Code with Module Extension
這也是在移除 conditional，要注意的是，一旦 module 被 include，他的行為就很難被移除，考慮到移除，可能需要用 Repalce Type Code with State/Strategy

現在如果我們的腳踏車行為是可以改變的：
```ruby
class MountainBike
  attr_writer :type_code
  def price
    case @type_code
    when :front_suspension
      ...
    when :full_suspension
      ...
    end
  end
end
# 用法： bike = MountainBike.new(type_code: :rigid)
# bike.type_code = :front_suspension

# 改成
class MountainBike
  attr_reader :type_code
  def type_code=(value)
    @type_code = value
    case type_code
      when :front_suspension: extend(FrontSuspensionMountainBike)
      when :full_suspension: extend(FullSuspensionMountainBike)
    end
  end
end

module FrontSuspensionMountainBike
  def price
    ...
  end
end

module FullSuspensionMountainBike
  def price
    ...
  end
end
```

## Introduce Null Object
使用 null object 是一個減少 conditional 的一個方式

1. 做一個 null object class 出來，然後在他身上還有原本的 source class 身上做出一個 `missing?` method
2. 把原本把 nil 丟出去的地方改成用 null object 取代
3. 找到所有原本用來測試事不是 nil 的地方，然後改成 call `missing?` 這個 method
4. test
5. 找到其他 client 原本在對於這個物件是 nil 的話會做些什麼事情
6. 把這些特殊行為定義在 null object 裡面
7. 把 conditional 拿掉，直接送 message 給 null object

```ruby
# 原本的程式碼很多在檢查是否為 nil
customer = site.customer
plan = customer ? customer.plan : BillingPlan.basic
...
customer_name = suctomer ? customer.name : 'occupant'
...
weeks_delinquent = customer.nil? ? 0 : customer.history.weeks.delinquent_in_last_year

# 先做出 class

class MissingCustomer
  def missing?
    true
  end
end

class Customer
  def missing?
    false
  end
end

# 原本丟出 nil 的地方改成丟出 null object
# 原本
class Site
  attr_reader :customer
end
# 改成
class Site
  def customer
    @customer || Customer.new_missing
  end
end
class Customer
  def self.new_missing
    MissingCustomer.new
  end
end

# 最難的部分是找出原本哪些地方去檢查 nil 然後改成 call missing?

plan = customer? customer.plan : BillingPlan.basic
# 改成
plan = customer.missing? ? customer.plan : BillingPlan.basic

customer_name = suctomer ? customer.name : 'occupant'
# 改成
customer_name = suctomer.missing? ? customer.name : 'occupant'

# 接著就可以把這些 conditional 一個一個拿掉
class MissingCustomer
  def name
    'occupant'
  end
end
plan = customer.missing? ? customer.plan : BillingPlan.basic
# 改成
plan = customer.plan
```

## Introduce assertion
有時候我們在定義 method 的時候，會自己給他一個假設，比方說參數要是正整數之類的，然後這些假設可能要仔細看過演算法才能得知，或者是他會寫一段註解，這種情況我們可以直接寫一個 assertion，如果不對就會直接丟出 error，這不僅可以讓 reader 更清楚了解，在 debug 的時候也可以更快地知道出錯的源頭在哪裡

```ruby
def expense_limit
  # should have wither expense limit ot a primary project
  (@expense_limit != NULL_EXPENSE) ? \
    @expense_limit : @primary_project.member_expense_limit
end
# 加上 assertion
def expense_limit
  assert { (@expense_limit != NULL_EXPENSE) || (!@primary_project.nil?) }
  (@expense_limit != NULL_EXPENSE) ? \
    @expense_limit : @primary_project.member_expense_limit
end

module Assertions
  class AssertionFailedError < StandardError; end
  def assert(&condition)
    raise AssertionFailedError.new('Assertion Failed') unless condition.call
  end
end
```

另外可以加上一些更 specific 的 assertion，像是 equal / should_never_reach_here 之類的

## Parameterize Method
如果有好幾個 method 做差不多的事情，只是 value 不同，可以考慮把它們放在同一個 method

```ruby
def ten_percent_raise
  @salary *= 1.1
end
def five_percent_raise
  @salary *= 1.05
end
# 變成
def raise(factor)
  @salary *= (1 + factor)
end
```

## Replace Parameter with Explicit Methods
能這樣改的原因是因為參數就固定那幾個，如果參數種類非常多種的話就不適合這樣子 refactor
```ruby
def set_value(name, value)
  if name == 'height'
    @height = value
  elsif name == 'width'
    @width = value
  else
    raise 'Should never reach here'
  end
end

# 變成
def height=(value)
  @height = value
end
def width=(value)
  @width = value
end
```

## Introduce Parameter Object
如果有 data clump 的行為，某些參數總是一起使用，那可以把牠們包裝成 parameter object

注意這個 parameter object 應該要是 immutable，其他地方應該不能去修改這個 parameter object 內容，一開始建立的時候就已經決定好他的一切

## Introduce Gateway
就像 Rails 用 Active Record 當作對關連式資料庫的 gateway，在使用外部服務的時候也可以善用這種技巧

```ruby
class Person
  attr_accessor :first_name, :last_name, :ssn
  def save
    url = URI.parse('http://www.example.com/person')
    request = Net::HTTP::Post.new(url.path)
    request.set_form_data(
      'first_name' => first_name,
      'last_name' => last_name,
      'ssn' => ssn
    )
    Net::HTTP.new(url.host, url.port).start { |http| http.request(request) }
  end
end

# 先做出 gateway
class Gateway
  attr_accessor :subject, :attributes, :to
  def self.save
    gateway = self.new
    yield gatewaty
    gateway.execute
  end

  def execute
    request = Het::HTTP::Post.new(url.path)
    attribute_hash = attributes.inject({}) do |result, attribute|
      result[attribute.to_s] = subject.send attribute
      result
    end
    request.set_form_data(attribute_hash)
    Net::HTTP.new(url.host, url.port).start { |http| http.request(request) }
  end

  def url
    URI.parse(to)
  end
end

# 把 person 改寫
class Person
  attr_accessor :first_name, :last_name, :ssn
  def save
    Gateway.save do |persist|
      persist.subject = self
      persist.attributes = [:first_name, :last_name, :ssn]
      persist.to = 'http://www.example.com/person'
    end
  end
end

# 還有另一個 class 需要整合
class Company
  attr_accessor :name, :tax_id

  def save
    url = URI.parse('http://www.example.com/companies')
    request = Net::HTTP::Get.new(url.path + "?name=#{name}&tax_id=#{tax_id}")
    Net::HTTP.new(url.host, url.port).start { |http| http.request(request) }
  end
end

# 因為分別是 get 跟 post 所以可以把他分成不同的 type
class Gateway
  def self.new
    gateway = self.new
    yield gateway
    gateway.execute
  end

  def execute
    Net::HTTP.new(url.host, url.port).start do |http|
      http.request(build_request)
    end
  end
end

class PostGateway
  def build_request
    request = Het::HTTP::Post.new(url.path)
    attribute_hash = attributes.inject({}) do |result, attribute|
      result[attribute.to_s] = subject.send attribute
      result
    end
    request.set_form_data(attribute_hash)
  end
end

class GetGateway
  def build_request
    parameters = attributes.collect do |attribute|
      "#{attribute}=#{subject.send(attribute)}"
    end
    Net::HTTP::Get.new("#{url.path}?#{parameters.join("&")}")
  end
end

class Company
  attr_accessor :name, :tax_id
  def save
    GetGateway.save do |persist|
      persist.subject = self
      persist.attributes = [:name, :tax_id]
      persist.to = 'http:ww.example.com/companies'
    end
  end
end
```

## Introduce Expression Builder
Expression Builder 的功能就是讓我們用一些 public API 用起來更上手，提供更便利的介面給使用者使用

以前面的例子來說明，雖然已經有 Gateway 的 class，但我們想要用起來更順手一點

```ruby
class Person
  attr_accessor :first_name, :last_name, :ssn
  def save
    PostGateway.save do |persist|
      persist.subject = self
      persist.attributes = [:first_name, :last_name, :ssn]
      persist.to = 'http://www.example.com/person'
    end
  end
end

class Company
  attr_accessor :name, :tax_id
  def save
    GetGateway.save do |persist|
      persist.subject = self
      persist.attributes = [:name, :tax_id]
      persist.to = 'http:ww.example.com/companies'
    end
  end
end
```
第一步就是想像怎樣用起來會最順手，先從 Person 開始
```ruby
class Person
  attr_accessor :first_name, :last_name, :ssn
  def save
    http.post(:first_name, :last_name, :ssn).to(
      'http://www.example.com/person'
    )
  end
end
```
要達成這個目的，也可以定義 `to` 跟 `post` method 在 Gateway 上面，但主要是 `to` 這個 method 算是在 Gateway 的 context 之外，這樣做會讓他對外的 interface 混亂，比較好的做法是做出一個 class 的職責就在讓 Gateway 的 interface 優化
```ruby
class Person
  attr_accessor :first_name, :last_name, :ssn
  def save
    http.post(:first_name, :last_name, :ssn).to(
      'http://www.example.com/person'
    )
  end

  private

  def http
    GatewayExpressionBuilder.new(self)
  end
end

class GatewayExpressionBuilder
  def initialize(subject)
    @subject = subject
  end

  def post(attributes)
    @attributes = attributes
  end

  def to(address)
    PostGateway.save do |persist|
      persist.subject = @subject
      persist.attributes = @attributes
      persist.to = address
    end
  end
end
```
接著讓這個 interface 符合 Company 使用

```ruby
class Company
  attr_accessor :name, :tax_id
  def save
    http.get(:name, :tax_id).to(
      'http://www.example.com/companies'
    )
  end

  private

  def http
    GatewayExpressionBuilder.new(self)
  end
end

class GatewayExpressionBuilder
  def initialize(subject)
    @subject = subject
  end

  def get(attributes)
    @attributes = attributes
    @gateway = GetGateway
  end

  def post(attributes)
    @attributes = attributes
    @gateway = PostGateway
  end

  def to(address)
    @gateway.save do |persist|
      persist.subject = @subject
      persist.attributes = @attributes
      persist.to = address
    end
  end
end
```

## Form Template Method
如果有兩個 method 做的事情很像，比方說步驟很像但每一步做的事情不同，我們可以用多型的方式，讓 subclass 去做這些細節的事情，讓 superclass 決定這些步驟的順序，這種 method 叫做 template method

在 Ruby 裡面除了繼承之外，也可以用 module 達到這樣的效果

我們統一以下面例子來實作
```ruby
class Customer
  def statement
    result = "Rental Record for #{name}\n"
    @rentals.each do |rental|
      # show figures for this rental
      result << "\t#{rental.movie.title}\t#{rental.charge}\n"
    end
    # add footer lines
    result << "Amount owed is #{total_charge}\n"
    result << "You earned #{total_frequent_renter_points} frequent renter points"
    result
  end

  def html_statement
    result = "<H1>Rentals for <EM>#{name}</EM></H1><P>\n"
    @rentals.each do |rental|
      # show figures for this rental
      result << "#{rental.movie.title}: \t#{rental.charge}<BR/>\n"
    end
    # add footer lines
    result << "<P>You owe <EM>#{total_charge}</EM></P>\n"
    result << "On this rental you earned <EM>#{total_frequent_renter_points}</\
    EM> frequent renter points</P>"
  end
end
```
### Inheritance
首先我們就把 class 拆開來
```ruby
class Statement
end

class TextStatement < Statement
  def value(customer)
    result = "Rental Record for #{customer.name}\n"
    customer.rentals.each do |rental|
      # show figures for this rental
      result << "\t#{rental.movie.title}\t#{rental.charge}\n"
    end
    # add footer lines
    result << "Amount owed is #{customer.total_charge}\n"
    result << "You earned #{customer.total_frequent_renter_points} frequent renter points"
    result
  end
end

class HtmlStatement < Statement
  def value(customer)
    result = "<H1>Rentals for <EM>#{customer.name}</EM></H1><P>\n"
    customer.rentals.each do |rental|
      # show figures for this rental
      result << "#{rental.movie.title}: \t#{rental.charge}<BR/>\n"
    end
    # add footer lines
    result << "<P>You owe <EM>#{customer.total_charge}</EM></P>\n"
    result << "On this rental you earned <EM>#{customer.total_frequent_renter_points}</\
    EM> frequent renter points</P>"
  end
end

class Customer
  def statement
    TextStatement.value(self)
  end

  def html_statement
    HtmlStatement.value(self)
  end
end
```
我們看得出來中間的過程都是 header / body / footer，所以把他們抽成一樣的外型放到 super class


```ruby
class Statement
  def value(customer)
    result = header_string(customer)
    customer.rentals.each do |rental|
      result << each_rental_string(rental)
    end
    result << footer_string(customer)
  end
end

class TextStatement < Statement
  def header_string(customer)
    "Rental Record for #{customer.name}\n"
  end

  def each_rental_string(rental)
    "\t#{rental.movie.title}\t#{rental.charge}\n"
  end

  def footer_string(customer)
    <<-EOS
      Amount owed is #{customer.total_charge}\n"
      You earned #{customer.total_frequent_renter_points} frequent renter points"
    EOS
  end
end

class HtmlStatement < Statement
  def header_string(customer)
    #...
  end

  def each_rental_string(rental)
    #...
  end

  def footer_string(customer)
    #...
  end
end
```

### Module
跟上面的 code 很像，只是 subclass 變成 module
```ruby
class Statement
  def value(customer)
    result = header_string(customer)
    customer.rentals.each do |rental|
      result << each_rental_string(rental)
    end
    result << footer_string(customer)
  end
end

module TextStatement
  def header_string(customer)
    "Rental Record for #{customer.name}\n"
  end

  def each_rental_string(rental)
    "\t#{rental.movie.title}\t#{rental.charge}\n"
  end

  def footer_string(customer)
    <<-EOS
      Amount owed is #{customer.total_charge}\n"
      You earned #{customer.total_frequent_renter_points} frequent renter points"
    EOS
  end
end

module HtmlStatement
  def header_string(customer)
    #...
  end

  def each_rental_string(rental)
    #...
  end

  def footer_string(customer)
    #...
  end
end
```

然後接口會長的比較特別，用 instance 去 extend module

```ruby
class Customer
  def statement
    Statement.new.extend(TextStatement).value(self)
  end
  def html_statement
    Statement.new.extend(HtmlStatement).value(self)
  end
end
```

這樣做有什麼好處呢？我們想像如果之後有另一個需求，但他的步驟跟正常的 Statement 不同，我們要做出另一個 class

```ruby
class MonthlyStatement
  def value(customer)
    result = header_string(customer)
    rentals = customer.rentals.select do |rental|
      rental.date > DateTime.now -30
    end
    rentals.each do |rental|
      result << each_rental_string(rental)
    end
    result << footer_string(customer)
  end
end
```

如果是繼承的狀況，因為沒辦法同時繼承兩個 class，所以要另外做出 HtmlMonthlyStatement / TextMonthlyStatement 兩個 class，但使用 module 的情況就簡單很多
```ruby
class Customer
  def statement
    Statement.new.extend(TextStatement).value(self)
  end
  def html_statement
    Statement.new.extend(HtmlStatement).value(self)
  end
  def monthly_statement
    MonthlyStatement.new.extend(TextStatement).value(self)
  end
  def monthly_  html_statement
    MonthlyStatement.new.extend(HtmlStatement).value(self)
  end
end
```

### Replace Inheritance with Delegation
常常我們看到繼承的 subclass ，但奇怪的是這個 subclass 只有用到少數 super class 的功能，這時候可以考慮改用 delegation

其中一個常見的情況是繼承 collection

```ruby
class Policy < Hash
  attr_reader :name
  def initialize(name)
    @name = name
  end

  def <<(rule)
    key = rule.attributes
    self[key] ||= []
    self[key] << rule
  end

  def apply(account)
    self.each do |attribute, rules|
      rules.each { |rule| rule.apply(account) }
    end
  end
end
```

觀察使用 Policy 的地方，真正用到 Hash 的 method 只有三個： `[]` / `size` / `empty?`

第一步先做出一個欄位(instance variable) 給要 delegate 的這個物件，把原本 call 自己的地方都改成這個欄位

```ruby
class Policy < Hash
  attr_reader :name
  def initialize(name)
    @name = name
    @rules = self
  end

  def <<(rule)
    key = rule.attributes
    @rules[key] ||= []
    @rules[key] << rule
  end

  def apply(account)
    @rules.each do |attribute, rules|
      rules.each { |rule| rule.apply(account) }
    end
  end
end
```

然後把繼承拔掉，由測試來告訴你他應該要 delegate 哪些 method
```ruby
# class Policy < Hash
class Policy
  extend Forwardable

  def_delegators :@rules, :size, :empty?, :[]

  attr_reader :name
  def initialize(name)
    @name = name
    # @rules = self
    @rules = {}
  end

  def <<(rule)
    key = rule.attributes
    @rules[key] ||= []
    @rules[key] << rule
  end

  def apply(account)
    @rules.each do |attribute, rules|
      rules.each { |rule| rule.apply(account) }
    end
  end
end
```
## Other
### Refactor with Deprecation
如果有 method 準備要移除，可以用 deprecate 來做 warning

```ruby
class Module
  def deprecate(method_name, &block)
    module_eval <<-END
      alias_method :deprecated_#{method_name}, :#{method_name}
      def #{method_name}(*args, &block)
        $stderr.puts "Warning: calling deprecated method\
        #{self}.#{method_name}. This method will be removed in a future release."
        deprecated_#{method_name}(*args, &block)
      end
    END
  end
end

class Foo
  def foo
    puts "in the foo method"
  end

  deprecate :foo
end
```

### Cache instance variable for nil / false
我們常常用 `||=` 來做 cache

```ruby
class Persion
  def mails
    @mails ||= []
  end
end
```

但如果要存的是 nil / false，就會沒辦法這樣做，這時候可以用 `instance_variable_defined?`
```ruby
class Employee
  def assistant
    unless instance_variable_defined? :@assistant
      @assistant = Employee.find_by_boss_id(id)
    end
    @assistant
  end
end
```


