---
title: "Dealing ActiveRecord Polymorphic Relation With Namespace"
catalog: true
toc_nav_num: true
date: 2022-4-06 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1649239085201-5a6d724fd6af?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80"
tags:
- Jenkins
catagories:
- Devops
updateDate: 2022-4-06 22:26:24
# top: 1
description: Dealing ActiveRecord Polymorphic Relation With Namespace
---

## Intro
工作上碰到了一個要處理 ActiveRecord 多型關聯的相關工作，覺得有點難記得，所以就來記錄一下

## Outline
- [Intro](#intro)
- [Outline](#outline)
- [Customize Polymorphic Relation](#customize-polymorphic-relation)
- [How to further customize polymorphic relation](#how-to-further-customize-polymorphic-relation)
- [References](#references)

## Customize Polymorphic Relation
在 ActiveRecord 裡面使用 active record 的多型會把 model name 存在資料庫裡面，因此如果加上 namespace 就會有問題

接下來簡單描述一下什麼情況會遇到

多型的定義通常是這樣，在 has_one 或者 has_many 那邊是沒有標註多型的，但在資料庫搜尋的時候就會自動轉換
```ruby
class A
  has_one :key, as: :target
end

class B
  has_one :key, as: :target
end

class Key
  belongs_to :target, polymorphic: true
  # target_type
  # target_id
end

A.first.key
# SELECT  `keys`.* FROM `keys` WHERE `keys`.`target_id` = 1 AND `keys`.`target_type` = 'A' LIMIT 1
```

如果想要幫 A 加上 namespace 就會破壞原本的多型關聯
```ruby
module Test
  class A
    has_one :key, as: :target
  end
end

Test::A.first.key
# SELECT  `keys`.* FROM `keys` WHERE `keys`.`target_id` = 1 AND `keys`.`target_type` = 'Test::A' LIMIT 1
=> nil
```
如果要讓 has_one 這邊沒問題，要去調整 `polymorphic_name` 這個 method，才會去調整 query

```ruby
module Test
  class A
    has_one :key, as: :target

    def self.polymorphic_name
      'A'
    end
  end
end

Test::A.first.key
# SELECT  `keys`.* FROM `keys` WHERE `keys`.`target_id` = 1 AND `keys`.`target_type` = 'A' LIMIT 1
```

但目前還沒有解決 belongs_to 那一邊的問題

```ruby
Test::Key.first.target
# uninitialized constant A
```

在 ActiveRecord 6 之後提供了一個接口 `polymorphic_class_for` 可以讓我們像這樣子客製化

```ruby
module Test
  class Key
    belongs_to :target, polymorphic: true

    def self.polymorphic_class_for(name)
      "Test::#{name}".constantize
    end
  end
end

Test::A Load (2.0ms)  SELECT  `as`.* FROM `as` WHERE `as`.`id` = 1 LIMIT 1
```

至於為什麼是這樣改呢？

去翻了一下 source code，發現其他的關聯的 klass 都是指定自己，只有 polymorphic 的關聯的 klass 是會變動的，用繼承的關係去蓋掉 parent 的 method

```ruby
# 其他關聯
def klass
  reflection.klass
end

# 多型關聯
module ActiveRecord
  module Associations
    # = Active Record Belongs To Polymorphic Association
    class BelongsToPolymorphicAssociation < BelongsToAssociation #:nodoc:
      def klass
        type = owner[reflection.foreign_type]
        type.presence && owner.class.polymorphic_class_for(type)
      end
# ...
```

另外前面有提到 ActiveRecord6 以前還沒有這個方式可以修改
```ruby
# version 6.1
def klass
  type = owner[reflection.foreign_type]
  type.presence && owner.class.polymorphic_class_for(type)
end
# version 5.2.3
def klass
  type = owner[reflection.foreign_type]
  type.presence && type.constantize
end
```

所以如果還沒升 Rails 版本可以考慮去 patch 原本的 klass method

```ruby
module ActiveRecord
  module Associations
    class BelongsToPolymorphicAssociation < BelongsToAssociation
      def klass
        type = owner[reflection.foreign_type]
        return nil unless type.presence

        if owner.class.respond_to?(:polymorphic_class_for)
          owner.class.polymorphic_class_for(type)
        else
          type.constantize
        end
      end
    end
  end
end
```

## How to further customize polymorphic relation

找資料的時候看到 [這篇文章](https://shopify.engineering/changing-polymorphic-type-rails)，想要進一步直接把 target_type 改成自訂的 string ，像是 `car` 或者 `boat`

下面是 `polymorphic_name` 跟 `polymorphic_class_for` 的 source code
```ruby
# Returns the value to be stored in the polymorphic type column for Polymorphic Associations.
def polymorphic_name
  store_full_class_name ? base_class.name : base_class.name.demodulize
end

# Returns the class for the provided +name+.
#
# It is used to find the class correspondent to the value stored in the polymorphic type column.
def polymorphic_class_for(name)
  if store_full_class_name
    name.constantize
  else
    compute_type(name)
  end
end
```

其實跟前面的做法很像，只是要改的方向不同而已

以上面的例子來說，現在我的需求變成在資料庫的 target_type 要存的資料從 `A` / `B` 變成 `a` / `b`

像是下面這樣修改就可以達到目的

```ruby
module Test
  module Polymorphicable
    extend ActiveSupport::Concern
    # module with common methods between all vehicles

    CLASS_MAPPING = {
      "a" => Test::A,
      "b" => Test::B
    }

    module ClassMethods
      def polymorphic_name
        CLASS_MAPPING.invert.fetch(self)
      end
    end

    # 這裡的 name 會是 db 裡面 target_type 的值
    def self.polymorphic_class_for(name)
      if CLASS_MAPPING.key?(name)
        CLASS_MAPPING[name]
      end
    end
  end

  class A
    include Test::Polymorphicable
    has_one :key, as: :target
  end

  class B
    include Test::Polymorphicable
    has_one :key, as: :target
  end

  class Key
    belongs_to :target, polymorphic: true
    # target_type
    # target_id

    def self.polymorphic_class_for(name)
      Test::Polymorphicable.polymorphic_class_for(name) || super(name)
    end
  end
end
```


## References
[Shopify Tech Blog](https://shopify.engineering/changing-polymorphic-type-rails)