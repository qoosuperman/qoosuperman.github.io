---
title: "Ruby & Rails Coding style(只記錄部分)"
catalog: true
toc_nav_num: true
date: 2019-12-09 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1570928688583-976174742576?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1650&q=80"
tags:
- Ruby
catagories:
- Ruby
updateDate: 2019-12-09 22:26:24
# top: 1

---
# Ruby & Rails Coding style

這邊文章主要在記錄自己比較有可能踩到的地雷

我參考的只有最下面三篇文章，如果想看完整版可以去下面三個網址看，話說 Ruby coding style 在 rubocop 跟 shopify 的版本其實有些地方衝突，所以有的地方還是必須根據自己公司的習慣來

# Ruby



1. 每個檔案最後留一行空白

2. 運算子前後有空格，冒號 / 逗號 / 分號後面有空格，`{` 前後有空格， `}` 前面有空格

3. Case 跟 when 齊頭

```ruby
kind = case year
       when 1850..1889 then "Blues"
       when 1890..1909 then "Ragtime"
       when 1910..1929 then "New Orleans Jazz"
       when 1930..1939 then "Swing"
       when 1940..1950 then "Bebop"
       else "Jazz"
       end
```

4. 要使用字串陣列的時候，偏好使用 `%w`

```ruby
STATES = %w(draft open closed)
```

5. 如果方法要使用預設值的話，盡量使用有名字的變數

```ruby
def remove_member(user, skip_membership_check: false)
  # ...
end

# Elsewhere, now with more clarity:
remove_member user, skip_membership_check: true
```

6. `%()` 適用在單行，而且需要 interpolation ，並且有雙引號的情況下使用如果多行最好使用 heredoc

   [HereDoc](https://mgleon08.github.io/blog/2019/02/04/ruby-heredoc/)

7. 千萬不要使用 `for`，因為幾乎都可以用迭代解決， for 裡面的變數可以在外面被抓到

# Rails

1. 盡量保持 Controller skinny，可能的話只保留一個方法(除了 find 或者 new)
2. Render文字的時候偏好使用 `render plain:` 而非 `render text:`
3. Render 狀態的時候偏好 render 對應的符號，而非 404 / 403 等數字

```ruby
# bad
...
render status: 403
...

# good
...
render status: :forbidden
...
```

4. 如果有個 model 不需要資料庫的資料，但需要使用一些 active record 的方法，就使用 ActiveAttr 這個 gem
5. Enum 偏好使用 Hash 表示而不是陣列
6. Model 內放置的順序：

```ruby
class User < ActiveRecord::Base
  # keep the default scope first (if any)
  default_scope { where(active: true) }

  # constants come up next
  COLORS = %w(red green blue)

  # afterwards we put attr related macros
  attr_accessor :formatted_date_of_birth

  attr_accessible :login, :first_name, :last_name, :email, :password

  # Rails 4+ enums after attr macros
  enum role: { user: 0, moderator: 1, admin: 2 }

  # followed by association macros
  belongs_to :country

  has_many :authentications, dependent: :destroy

  # and validation macros
  validates :email, presence: true
  validates :username, presence: true
  validates :username, uniqueness: { case_sensitive: false }
  validates :username, format: { with: /\A[A-Za-z][A-Za-z0-9._-]{2,19}\z/ }
  validates :password, format: { with: /\A\S{8,128}\z/, allow_nil: true }

  # next we have callbacks
  before_save :cook
  before_save :update_username_lower

  # other macros (like devise's) should be placed after the callbacks

  ...
end
```

7. 寫 callback 的時候按照 callback 的執行順序寫
8. 搜尋資料庫時避免使用 interpolation ，容易有 SQL injection

```ruby
# bad - param will be interpolated unescaped
Client.where("orders_count = #{params[:orders]}")

# good - param will be properly escaped
Client.where('orders_count = ?', params[:orders])
```

9. 搜尋超過一個參數時，可以考慮使用 named placeholder

```ruby
# okish
Client.where(
  'created_at >= ? AND created_at <= ?',
  params[:start_date], params[:end_date]
)

# good
Client.where(
  'created_at >= :start_date AND created_at <= :end_date',
  start_date: params[:start_date], end_date: params[:end_date]
)
```

10. 別以 id 排序，id 順序並不代表特殊意義，如果要以建立順序排序可以用時間排序
11. 盡量以有意義的名字來命名 foreign key，不要過度仰賴 Rails 的預設命名
12. 做出 reversible 的 migration
13. 不要使用 `time.parse`

```ruby
# bad
Time.parse('2015-03-02 19:05:37') # => Will assume time string given is in the system's time zone.

# good
Time.zone.parse('2015-03-02 19:05:37') # => Mon, 02 Mar 2015 19:05:37 EET +02:00
```

14. prefer `size` over `length`



[rubocop-github](https://github.com/github/rubocop-github/blob/master/STYLEGUIDE.md)
[The Rails Style Guide](https://rails.rubystyle.guide/)
[Shopify/Ruby Style Guide](https://shopify.github.io/ruby-style-guide/)