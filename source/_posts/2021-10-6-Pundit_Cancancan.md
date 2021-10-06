---
title: "實作利用 Pundit 跟 Cancancan 做動態權限管理"
catalog: true
toc_nav_num: true
date: 2021-10-6 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1632213702844-1e0615781374?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=2664&q=80"
tags:
- Ruby
- Rails
catagories:
- Rails
updateDate: 2021-10-6 22:26:24
# top: 1
description: pundit cancancan for dynamic permission control
---

# 用 Pundit / Cancancan 做動態權限管理
Rails 有兩個 gem 在處理權限管理，分別是 Pundit 跟 Cancancan，自己的公司是使用 Cancancan，朋友的公司是使用 pundit，都剛好是用 DB 的資料來做權限控管，想要自己試看看用起來手感如何

如果想要看 code 的話可以參考我的 [repo](https://github.com/qoosuperman/permission_test)

其中又把兩種不同的方式分成兩個 branch 來做

`feature/pundit-permission-system` 是使用 pundit 做的， `feature/cancan-permission-system` 是使用 cancancan 做的

## Outline
- [Pundit](#pundit)
- [Cancancan](#cancancan)
- [Conclusion](#conclusion)
- [References](#references)

## Pundit

Pundit 的基本使用方式參考 [官方repo](https://github.com/varvet/pundit)

### DB 設計

![pundit er diagram](https://i.imgur.com/34VlqyS.png)

在這個設計裡面，一個 User 歸屬於一個 UserGroup

UserGroup 裡面的 admin 為 boolean，決定在這個 group 裡面的使用者有沒有 admin 權限

PermissionResource 對應到每個不同的要做權限控管的資源，如果是對於 Book model 的權限控管，在這裡的 name 就是 `Book`

default priority 則是紀錄這個資源預設對大家是可讀還是可寫還是 disable

UserGroup 跟 PermissionResource 之間則是多對多關聯，中間的 group_permission 紀錄了某 UserGroup 對於某 resource 的存取權，紀錄在 priority 欄位裡面

### code 說明

#### model
在 create permission resource 時，default_priority 只有 disable / read / write 三種

然後每增加一個 resource 就會 trigger 自動幫所有 user_group 都加上 default priority
```ruby
# app/models/permission_resource.rb
class PermissionResource < ApplicationRecord
  has_many :group_permissions, dependent: :destroy
  enum default_priority: GroupPermission::PRIORITY_OPTIONS

  after_create :setup_group_sermissions

  private

  # 每增加一個 permission resource 自動幫所有的 user group 加上這個 permission
  def setup_group_sermissions
    UserGroup.all.each do |user_group|
      user_group.permission_resources += [self]
    end
  end
end
```

GroupPermission 這邊加了一個 scope，要撈 enable 的 permission 會撈 priority > 0 的，也就是非 diable 的

這裡有做一個 before create 的 hook，要搭配前面的機制，在 create 的時候 priority 自動加上 permission_reosurce 自己設定的 default priority
```ruby
# app/models/group_permission.rb
class GroupPermission < ApplicationRecord
  PRIORITY_OPTIONS = {
    disable: 0,
    readable: 1,
    writable: 2
  }
  belongs_to :user_group
  belongs_to :permission_resource
  scope :enable, -> { where('group_permissions.priority > 0') }
  enum priority: PRIORITY_OPTIONS

  before_create :setup_priority

  private

  def setup_priority
    self.priority = permission_resource.default_priority if priority.nil?
  end
end
```

#### policy
原本的使用方式是，根據每個不同的 model 做出對應的 policy 做權限管理 ex `PostPolicy` 對應到 `Post` model

但現在如果要動態產生，就會把所有 policy 做的事情集中到 `ApplicationPolicy` 來做

其中的重點在 `permissions` 這個 method，他會撈這個 user 所有的 enabled_permissions，也就是他歸屬的 user_group 所有的非 diable 的 group_permission

再透過 group_permission 撈出，permission_reosurce 的 name，看對這個 resource 有沒有 read 或者 write 權限，這邊的一個假設是只要不是 disable 都有 read 權限

另外因為 pundit 不像 cancancan 有一些 mapping，這邊的 mapping 就是自己寫: ex `writable => [:create, :new, :update, :edit, :destroy]`
```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
    @record_model = @record.model_name.to_s
  end

  def index?
    readable?
  end

  def show?
    readable?
  end

  def create?
    writable?
  end

  def new?
    create?
  end

  def update?
    writable?
  end

  def edit?
    update?
  end

  def destroy?
    writable?
  end

  def admin?
    @admin ||= @user.user_group.admin?
  end

  def readable?
    admin? || permissions.where(permission_resources: { name: @record_model }).any?
  end

  def writable?
    admin? || permissions.writable.where(permission_resources: { name: @record_model }).any?
  end

  def permissions
    @permissions ||= @user.enabled_permissions.includes(:permission_resource)
  end
end
```

有點討厭的是如果要對 Book 這個 resource 管控，還是要把這個 policy 寫出來，不然可能要考慮 metaprogramming 的方式
```ruby
# app/policies/book_policy.rb
class BookPolicy < ApplicationPolicy
end
```

#### controller
在目前比較簡單的示範中，我們假設 controller 的命名也都符合 model 的命名，所以在每個 controller 的 action 都先進行權限確認

```ruby
class AuthedController < ApplicationController
  before_action :authenticate_user!
  before_action :setup_authorize

  private

  def setup_authorize
    # 預設 model 名為 controller 名的單數
    authorize self.class.name.demodulize.to_s.gsub('Controller', '').singularize.constantize
  end
end 
```

如果權限不符合，預設 pundit 會 raise `Pundit::NotAuthorizedError` 這個 error，所以可以把他抓起來

```ruby
class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  include Pundit
  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  private

  def user_not_authorized
    flash[:alert] = "You are not authorized to perform this action."
    redirect_back(fallback_location: root_path)
  end
end
```

#### view
決定按鈕要不要出現可以搭配 policy helper 使用
```
<% if policy(@books).writable? %>
  <button><%= link_to 'Add', new_book_path, class: 'btn btn-success'%></button>
<% end %>
```

## Cancancan

Cancancan 的基本使用方式參考 [官方repo](https://github.com/CanCanCommunity/cancancan)

### DB 設計
![cancancan er diagram](https://i.imgur.com/Xy2oB6Z.png)
在這個設計裡面，User 跟 Team 是多對多，Team 跟 PermissionGroup 是多對多，PermissionGroup 跟 Permission 是多對多，然後一個 ApplicationResource has_many permissions

ApplicationResource 代表一個資源，他的 actions 裡面代表可以對這個資源做哪些操作，通常對應到 controller 裡面的 action, ex. `[:index, :new]`

而因為 cancancan 這個 gem 又已經對 controller 的 action 做了下面這樣的 mapping:

```ruby
read: [:index, :show]
create: [:new, :create]
update: [:edit, :update]
destroy: [:destroy]
```

所以 application resource 紀錄的 action 也通常是這四種

Permission 則代表對這個 resource 可以操作的一種權限，比方說對 Book 這個 resource read 跟 read + write 可以分成兩種不同的權限

比較特別的是 permission 裡面的 allowed_actions 用 bitmask 做紀錄，而他對應到的屬性是根據 belongs_to 的 application resource 的 actions 決定，所以 如果 permission A 跟 permission B 對應到的 application ressource 不同，就算他們的 allowed_actions 都是 1，那他們代表的意義也可能不同

最後 team 跟 permission_group 的多對多，其實是可以只留下 team 或者只留下 permission_group，他們之間的區隔有點模糊，可能根據實際應用的例子可以考慮留下其中一個 model 即可，但這樣做有個彈性是，之後每個 user 也可以自己擁有 permission_group，而不屬於 team 底下

### code 說明
#### model
我們需要以 User 為起點，拿到這個用戶的權限，他背後串連著多個 model

首先 `ApplicationResource` 裡面實作 `fetch_all_resources` 這個 class method

```ruby
# app/models/application_resource.rb
...
def self.fetch_all_resources
  Rails.cache.fetch(APPLICATION_RESOURCE_CACHE) do
    ApplicationResource.all.decorate.each_with_object({}) do |resource, hash|
      hash[resource.id] = { name: resource.name, actions: resource.actions }
    end
  end
end
...
```

上面的結果會拿到像這樣子的資料結構，說明每個 resource 有哪些權限可以使用：
```ruby
{
  # hash[resource.id] = { name: resource.name, actions: resource.actions }
  1: { name: 'User', actions: ['read']},
  2: { name: 'Book', actions: ['read','create']}
}
```

`Permission` 則有一個 class_method `fetch_all_permissions`，利用上面的資料結構，要把所有的 permission 代表的權限表示出來，中間有一些處理 Bitmask 的操作不是很重要：

```ruby
# app/models/permission.rb
class Permission < ApplicationRecord
  ...
  def self.fetch_all_permissions
    all_resources = ApplicationResource.fetch_all_resources
    Permission.all.each_with_object({}) do |permission, hash|
      all_actions = all_resources[permission.application_resource_id][:actions]
      hash[permission.id] = {
        application_resource_name: all_resources[permission.application_resource_id][:name],
        allowed_actions: Admin::Permission::Bitmask.new(all_actions, permission.allowed_actions)
      }
    end
  end
  ...
end
```

上面的結果會拿到像這樣子的資料結構
```ruby
# hash[permission.id] = {
#   application_resource_name: all_resources[permission.application_resource_id][:name],
#   allowed_actions: Admin::Permission::Bitmask.new(all_actions, permission.allowed_actions)
# }
# Note: 這裡的 allowed_actions 是 permission 限制過的 action 而不是 application resource 的
{ 
  1: { application_resource_name: 'User', allowed_actions: ['read'] },
  2: { application_resource_name: 'Book', allowed_actions: ['read'] },
  3: { application_resource_name: 'Book', allowed_actions: ['read','write'] } 
}
```

最後在 User 這個 model 就可以利用上面的產物，還有這個 user 屬於哪個 team，這個 team 有哪些 permission_group 去拿到屬於這個 user 的 permission
```ruby
# app/models/user.rb
...
  def all_abilities
    all_permissions = ::Permission.fetch_all_permissions

    team_permissions = teams.flat_map do |team|
      permissions_of(team, all_permissions)
    end

    team_permissions.inject do |all, permissions_of_group|
      all.merge(permissions_of_group) { |_, previous_group, next_group| (previous_group + next_group).uniq }
    end
  end

  private

  def permissions_of(user_or_team, all_permissions)
    user_or_team.permission_groups.includes(:permissions).where(enabled: true).map do |permission_group|
      permission_group.permissions.pluck(:id).each_with_object({}) do |id, hash|
        hash[all_permissions[id][:application_resource_name]] ||= []
        (hash[all_permissions[id][:application_resource_name]] += all_permissions[id][:allowed_actions]).uniq!
      end
    end
  end
...
```

最後的產物會是像這樣：
```ruby
[
  { 'User' => ['read'] },
  { 'Tool' => ['read', 'write'] }
]
```

#### ability
跟 pundit 不同於需要定義不同的 policy class 去定義權限，原本 cancancan 就是把權限集中在 Ability 這個 class 上面

因此就可以在這個 class 上面定義對某一 user 的權限，我們透過 user 的 `all_abilities` method 去拿到這個 user 的所有權限
```ruby
class Ability
  include CanCan::Ability

  def initialize(user)
    return unless user

    return unless user.all_abilities.present?

    user.all_abilities.each do |application_resource_name, actions|
      can(actions, ApplicationResource.to_resource_names(application_resource_name))
    end
  end
end
```

#### controller

cancancan 在 controller 有個很好用的 helper method `authorize_resource`，在做每個 action 之前就會幫你做權限的檢查
```ruby
# app/controllers/books_controller.rb
class BooksController < ApplicationController
  authorize_resource

  def index
    @books = Book.all
  end
...
```

#### view

相對於 pundit 在 view 裡面呼叫 policy 確認權限， cancancan 則是用 `can?` 這個 helper method
```ruby
# app/views/books/index.html.erb
<% if can?(:create, Book) %>
  <button><%= link_to 'Add', new_book_path, class: 'btn btn-success'%></button>
<% end %>
```

## Conclusion
因為 DB 設計的部分兩邊是可以共用的，所以不對這方面多做評論

在 gem 的使用限制方面，Pundit 需要對不同的 Resource 都做出相對應的 policy，但 Cancancan 不用，如果要做像這樣動態的定義，Cancancan 比較方便

另外 Cancancan 預設就有對一些 Restful 的 action 做一些 簡單的 mapping，讓 code 顯得不那麼囉唆，而且對於 Cancancan 的定義 permission 的方式使用正面表列(ex. `can(['read','write'], 'Book')`)，我會覺得比較單純一些

## References
- 讀書會的朋友劭方的分享，感謝他
- 公司專案的 code
