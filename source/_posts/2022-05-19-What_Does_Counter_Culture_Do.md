---
title: "What Does Counter Culture Do"
catalog: true
toc_nav_num: true
date: 2022-5-19 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1652944234451-7ac52e1fe6ce?crop=entropy&cs=tinysrgb&fm=jpg&ixlib=rb-1.2.1&q=80&raw_url=true&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1770"
tags:
- Rails
catagories:
- Ruby
- Rails
updateDate: 2022-5-19 22:26:24
# top: 0
description: What does counter culture do
---

## Outline
- [Intro](#intro)
- [Usage](#usage)
- [Analyzing](#analyzing)
- [Conclusion](#conclusion)

## Intro
在 ActiveRecord 模組裡面已經有原生的 counter cache 機制，但如果要用到比較複雜的 cache 機制可以使用 [counter_culture 這個 gem](https://github.com/magnusvk/counter_culture)

剛好最近有個 bug 跟他有關，因此去了解消化一下 source code 內容

## Usage
如果 A has_many B，使用 counter_culture 要寫在 B 身上
```ruby
class A < ActiveRecord::Base
  has_many :bs
end

class B < ActiveRecord::Base
  belongs_to :a
  counter_culture :a, column_name: "bs_count"
end
```
厲害的地方在於，如果 has_many 這一邊還有 parent 身上也有 count cache 要更新， counter_culture 也支援這種情況
```ruby
class A < ActiveRecord::Base
	has_many :children, class_name: 'A', foreign_key: 'parent_id', optional: true
	belongs_to :parent, class_name: 'A', foreign_key: 'parent_id'
  has_many :bs
end

class B < ActiveRecord::Base
  belongs_to :a
  counter_culture :a, column_name: "bs_count", foreign_key_values: proc { |a_id| [a_id, A.find_by_id(a_id).try(:parent).try(:id)] }
end
```
其他更詳細的使用方式就看看 counter_culture 的 [文件](https://github.com/magnusvk/counter_culture) 吧！

## Analyzing
### Entrypoint
首先要先找到這個 gem 的入口在哪裡，通常會寫在跟 gem 名字很像的檔案上面

果然在 lib 的第一層就找到他了
```ruby
# lib/counter_culture.rb
ActiveSupport.on_load(:active_record) do
  include CounterCulture::Extensions
end
```
他這邊利用了 Active Support 的 lazy load hooks，讓 ActiveRecord 完整 load 完之後 include CounterCulture::Extensions 這個 module

這個 `on_load` 的用法可以參考這篇 [文章](https://simonecarletti.com/blog/2011/04/understanding-ruby-and-rails-lazy-load-hooks/)，同時來看看 ActiveSupport 這邊的原始碼：
```ruby
module ActiveSupport
  module LazyLoadHooks
	# ...
    def on_load(name, options = {}, &block)
      @loaded[name].each do |base|
        execute_hook(name, base, options, block)
      end

      @load_hooks[name] << [block, options]
    end

    def run_load_hooks(name, base = Object)
      @loaded[name] << base
      @load_hooks[name].each do |hook, options|
        execute_hook(name, base, options, hook)
      end
    end
	#...
end
```

在 `on_load` 的時候會先把前面已經註冊的 hook 都先執行過，然後把這次新註冊的再加到 `@load_hooks` 這個 instance_variable 裏面，但要使用這個方法的前提是用 `on_load` 註冊的 class 需要在 code 的最後用 `run_load_hooks` 去執行所有還沒執行的 hook，他們是需要搭配使用的

這個 gem 可以這樣在 ActiveRecord 身上裝 hook 是因為 ActiveRecord 最後就有這行：
```ruby
ActiveSupport.run_load_hooks(:active_record, ActiveRecord::Base)
```

### counter_culture instance method
接著就來看看 counter_culture 這個 gem 最重要的 instance method `counter_culture` 從哪裡來的，前面利用 hook 讓 ActiveRecord include `CounterCulture::Extensions` 這個模組，所以一定是放在裡面的

我把一些相容其他 gem 跟 error check 的部分拿掉比較好看

```ruby
# counter_culture/extentions.rb

def counter_culture(relation, options = {})
	unless @after_commit_counter_cache
		# initialize callbacks only once
		after_create :_update_counts_after_create

		before_destroy :_update_counts_after_destroy, unless: :destroyed_for_counter_culture?

		after_update :_update_counts_after_update, unless: :destroyed_for_counter_culture?

		# we keep a list of all counter caches we must maintain
		@after_commit_counter_cache = []
	end
	column_names_valid = (
		!options[:column_names] ||
		options[:column_names].is_a?(Hash) ||
		(
			options[:column_names].is_a?(Proc) &&
			options[:column_names].call.is_a?(Hash)
		)
	)

	# add the counter to our collection
	@after_commit_counter_cache << Counter.new(self, relation, options)
end
```
從上面的原始碼看到，他還是利用了 ActiveRecord 的 after_create / before_destroy / after_update 這些 callback，因為他想要指註冊一次 callback，所以會先去檢查 `@after_commit_counter_cache` 這個 instance_variable 是不是空值，否則如果某個 model 使用了兩次 counter_culture 就會執行兩次

而綁定在這些 callback 身上的 method 長得很簡單：
```ruby
def _update_counts_after_create
	self.class.after_commit_counter_cache.each do |counter|
		# increment counter cache
		counter.change_counter_cache(self, :increment => true)
	end
end
```

只是把 instance_variable 裡面的東西拿出來讓 counter 去改他們的 counter_cache，可以知道實作的細節是靠 `Counter` 這個 class 去實現的

所以就來看看 Counter 主要的進入點 `change_counter_cache` 怎麼寫，這部分有點多，我直接把自己的註解放進去

```ruby
def change_counter_cache(obj, options)
	# counter cache 記錄在哪個欄位
	change_counter_column = options.fetch(:counter_column) { counter_cache_name_for(obj) }

	# 要改的資料有哪些，如果 parent 也需要更新，這邊會一起撈到
	id_to_change = foreign_key_value(obj, relation, options[:was])
	id_to_change = foreign_key_values.call(id_to_change) if foreign_key_values

	if id_to_change && change_counter_column
		# delta_magnitude 是 counter 要增減的數量
		delta_magnitude = if delta_column
												(options[:was] ? attribute_was(obj, delta_column) : obj.public_send(delta_column)) || 0
											else
												counter_delta_magnitude_for(obj)
											end
		# 如果 destroy 是 - create 就是 +
		operator = options[:increment] ? '+' : '-'
		# 拿到需要調整的 class
		klass = relation_klass(relation, source: obj, was: options[:was])

		quoted_column = "#{model.connection.quote_column_name(change_counter_column)}"

		column_type = klass.type_for_attribute(change_counter_column).type

		# updates 最後長相：["\"bs_count\" = COALESCE(\"bs_count\", 0) + 1"]
		updates = []
		updates << "#{quoted_column} = COALESCE(#{quoted_column}, 0) #{operator} #{delta_magnitude}"

		primary_key = relation_primary_key(relation, source: obj, was: options[:was]primary_key = relation_primary_key(relation, source: obj, was: options[:was]))

		# 最重要的一行，在這行執行
		execute_now_or_after_commit(obj) do
			klass.where(primary_key => id_to_change).update_all updates.join(', ')
		end
	end
end
```

其中最重要的在最後一行

```ruby
klass.where(primary_key => id_to_change).update_all updates.join(', ')
```
他會把所有需要改變的紀錄用 where 一次撈出來，然後直接去更新這些紀錄的 counter 欄位，要注意 update_all 是不會 trigger callback 的一個 method，所以如果要更新紀錄的時間，在這個 gem 裡面有另外實作

## Conclusion
counter_culture 這個 gem 的原始碼不多，但也是一個有 1000 多個星星的專案，所以真的實用的 gem 真的不用太多行，打到大家的痛處就好

因為最近常常遇到不知道怎麼寫比較好的情況，覺得除了平常 review PR 之外，多看看 source code 也是個學習快速的方式，所以最近應該會嘗試多看看各種 gem 是怎麼寫的，來加強自己功力！