---
title: "Rails initialization process"
catalog: true
toc_nav_num: true
date: 2021-11-16 22:26:24
subtitle: ""
header-img: "https://images.unsplash.com/photo-1515185738552-8916b6859d72?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1770&q=80"
tags:
- Ruby
- Rails
catagories:
- Rails
updateDate: 2021-11-16 22:26:24
# top: 1
description: Rails initialization process
---

# Intro
其實整篇文章，差不多就是 Rails Guide 的翻譯，但要跟著看過一次其實也不是件容易的事，但因為滿想知道啟動過程的，所以就跟著介紹走了一次流程

先說聲抱歉，寫的滿亂的，真的有興趣的還是建議直接看 Rails Guide 可能比較有條理，這篇偏向給自己看的

其中如果有些沒有在 Rails guide 看到，就是我自己爬到或者去看其他文章的

## Files order
這裡大致列上啟動過程中 load 檔案的順序

- bin/rails
- config/boot.rb
- rails/commands.rb
- rails/command.rb(source code)
- actionpack/lib/action_dispatch.rb
- rails/commands/server/server_command.rb
- config/application.rb
- Rails::Server#start
- config.ru
- config/environment.rb
- config/application.rb
- railties/lib/rails/application.rb
- lib/rack/server.rb

## Process
首先我們通常都用 rails 這指令開始，所以從 `bin/rails` 這個檔案開始

```ruby
# bin/rails
#!/usr/bin/env ruby
APP_PATH = File.expand_path('../config/application', __dir__)
require_relative "../config/boot"
require "rails/commands"
```
其中 `APP_PATH` 等等在 rails/command 會用到

接著是 require `config/boot` 這檔案

---

```ruby
#config/boot.rb
ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

require "bundler/setup" # Set up gems listed in the Gemfile.
```

Bundler 負責確保你可以找到 Gemfile 裡面的所有 gems

下面那一行讓所有你寫在 Gemfile 裡面的 gem 可以在 ruby code 裡面使用

---

接著要回來看 `rails/commands.rb` 這檔案
```ruby
# rails/commands.rb
require "rails/command"

aliases = {
  "g"  => "generate",
  "d"  => "destroy",
  "c"  => "console",
  "s"  => "server",
  "db" => "dbconsole",
  "r"  => "runner",
  "t"  => "test"
}

command = ARGV.shift
command = aliases[command] || command

Rails::Command.invoke command, ARGV
```

---

最後是用 `Rails::Command` invoke，來看看這裡的 code(有精簡過)

如果找不到這個 command 會試圖丟給 rake 執行
```ruby
module Rails
  module Command
    class << self
                 # full_namespace = 'server'
      def invoke(full_namespace, args = [], **config)
        namespace = full_namespace = full_namespace.to_s

        if char = namespace =~ /:(\w+)$/
          command_name, namespace = $1, namespace.slice(0, char)
        else
          command_name = namespace
        end

        command_name, namespace = "help", "help" if command_name.blank? || HELP_MAPPINGS.include?(command_name)
        command_name, namespace = "version", "version" if %w( -v --version ).include?(command_name)

        command = find_by_namespace(namespace, command_name)
        if command && command.all_commands[command_name]
          command.perform(command_name, args, config) # => 有找到會在這邊執行 
        else
          find_by_namespace("rake").perform(full_namespace, args, config) # => 找不到 command 會丟給 rake 執行
        end
      end
    end
  end
end
```

如果 run 的是 rails server 會跑下面的 code

這段 code 還有 load action_dispatch，在這裡會把 Routing / Session 等等 modules 跟一些 middleware 讀進來

```ruby
# railties/lib/rails/commands/server/server_command.rb
module Rails
  module Command
    class ServerCommand < Base # :nodoc:
      def perform
        extract_environment_option_from_argument  # <= 把丟進來的參數抽成 env var
        set_application_directory!                # 如果沒有 config.ru 這個檔案，就去 APP_PATH 的上上層啟動 server，讓我們不管在哪個路徑都可以啟動 server
        prepare_restart                           # <= 這步只是把 pid file 移除

        Rails::Server.new(server_options).tap do |server|
          # Require application after server sets environment to propagate
          # the --environment option.
          require APP_PATH                        # default 是 config/application
          Dir.chdir(Rails.application.root)

          if server.serveable?
            print_boot_information(server.server, server.served_url)
            after_stop_callback = -> { say "Exiting" unless options[:daemon] }
            server.start(after_stop_callback)     # <= 啟動 server
          else
            say rack_server_suggestion(using)
          end
        end
      end
    end
  end
end
```
這裡的 server_options 裡面包括 port / host /config / environment 等等常見的 variable

Rails::Server 寫在同一個地方，這裡有去 call `::Rack::Server` 的 initialize，但那裡面也只是設定其他的一些 variable

`::Rack::Server` 主要負責提供一個 common interface 給所有的 Rack-based application 使用
```ruby
# railties/lib/rails/commands/server/server_command.rb
module Rails
  class Server < ::Rack::Server
    def initialize(options = nil)
      @default_options = options || {}
      super(@default_options)
      set_environment # ENV["RAILS_ENV"] ||= options[:environment]
    end
    ...
```

---

回到前面的內容 
```ruby
Rails::Server.new(server_options).tap do |server|
  # Require application after server sets environment to propagate
  # the --environment option.
  require APP_PATH                        # default 是 config/application
  Dir.chdir(Rails.application.root)

  if server.serveable?
    print_boot_information(server.server, server.served_url)
    after_stop_callback = -> { say "Exiting" unless options[:daemon] }
    server.start(after_stop_callback)     # <= 啟動 server
  else
    say rack_server_suggestion(using)
  end
end
```
在 new 完之後會去 require `APP_PATH`，預設是 `config/application.rb`

---

在這之後會 call server.start
```ruby
module Rails
  class Server < ::Rack::Server
    def start(after_stop_callback = nil)
      trap(:INT) { exit } # 如果 ctrl - C 就會 exit process
      create_tmp_directories # 做出 tmp 底下的 cache / pids / sockets 三個 folder
      setup_dev_caching # --dev-caching => 這參數會 trigger development 環境 cache
      log_to_stdout if options[:log_stdout] # 這步 wrapped_app 會先 create rack app

      super()
      # ...
    end

    private
      def setup_dev_caching
        if options[:environment] == "development"
          Rails::DevCaching.enable_by_argument(options[:caching])
        end
      end

      def create_tmp_directories
        %w(cache pids sockets).each do |dir_to_make|
          FileUtils.mkdir_p(File.join(Rails.root, "tmp", dir_to_make))
        end
      end

      def log_to_stdout
        wrapped_app # touch the app so the logger is set up

        console = ActiveSupport::Logger.new(STDOUT)
        console.formatter = Rails.logger.formatter
        console.level = Rails.logger.level

        unless ActiveSupport::Logger.logger_outputs_to?(Rails.logger, STDOUT)
          Rails.logger.extend(ActiveSupport::Logger.broadcast(console))
        end
      end
  end
end
```

在進 super 之前如果執行 log_to_stdout 會先做出 rack app
```ruby
module Rack
  class Server
    def wrapped_app
      @wrapped_app ||= build_app app
    end
  end
end
```
首先來看 `app` 會做什麼事

在 Rack 裡面這段 code 大致上是下面這樣
```ruby
module Rack
  class Server
    def app
      @app ||= options[:builder] ? build_app_from_string : build_app_and_options_from_config
    end

    # ...

    private
      def build_app_and_options_from_config
        if !::File.exist? options[:config] # options[:config] 的 default 就是 config.ru 這檔案
          abort "configuration #{options[:config]} not found"
        end

        app, options = Rack::Builder.parse_file(self.options[:config], opt_parser)
        @options.merge!(options) { |key, old, new| old }
        app
      end

      def build_app_from_string
        Rack::Builder.new_from_string(self.options[:builder])
      end
  end
end
```
其中的 options[:config] 的 default 就是 `config.ru` 這檔案

下面又可以知道 `Rack::Builder.parse_file(self.options[:config], opt_parser)` 第一個回傳值是一個 app instance

所以就是透過 config.ru 這個檔案為主要起點來 initialize Rails app

---

config.ru 裡面 deafult 長這樣：
```ruby
require_relative "config/environment"

run Rails.application
Rails.application.load_server
```

第一行就是 `require_relative "config/environment"`

---

如果是用別的 app server 的話，像是 Passenger 也會 require `config/environment` 這檔案，所以前面實作可能不同，但從這裡開始會是一樣的

```ruby
# config/environment.rb

# Load the Rails application.
require_relative "application"

# Initialize the Rails application.
Rails.application.initialize!
```

---

一開始是 require application

```ruby
#config/application.rb
require_relative "boot"

require "rails/all"
Bundler.require(*Rails.groups)

Dotenv::Railtie.load

module Homework
  class Application < Rails::Application
    config.load_defaults 6.1
  end
end
```

`require_relative "boot"` 這一行如果是直接 run `rails s` 不會有用，因為一開始已經 require 過了，但像是 passenger 這種 app server 沒有 require 過，就會去把 gem require 進來

`require "rails/all"` 這行會把 rails 的一些 framework 都載進來，也就是真的開始 load Rails 的 code 了

---

Rails 真正的核心是 railties
```ruby
require "rails"

%w(
  active_record/railtie
  active_storage/engine
  action_controller/railtie
  action_view/railtie
  action_mailer/railtie
  active_job/railtie
  action_cable/engine
  action_mailbox/engine
  action_text/engine
  rails/test_unit/railtie
  sprockets/railtie
).each do |railtie|
  begin
    require railtie
  rescue LoadError
  end
end
```
Rails engines, I18n and Rails configuration 這些設定都在上面這裡面定義

```ruby
# config/application.rb
module MyApp
  class Application < Rails::Application
    config.load_defaults 6.1
  end
end
```
剩下的這部分就是看自己有沒有客製定義 Rails::Application 的 configuration ，這部分算是把 Rails load 完跟 application namespace 定義完了

---

接著回到 config/environement.rb

```ruby
# config/environment.rb

# Load the Rails application.
require_relative "application"

# Initialize the Rails application.
Rails.application.initialize!
```

Rails.application.initialize! 這句做了什麼？

---

```ruby
# railties/lib/rails/application.rb
def initialize!(group = :default) #:nodoc:
  raise "Application has been already initialized." if @initialized
  run_initializers(group, self)
  @initialized = true
  self
end
```

```ruby
# railties/lib/rails/initializable.rb
def run_initializers(group = :default, *args)
  return if instance_variable_defined?(:@ran)
  initializers.tsort_each do |initializer|
    initializer.run(*args) if initializer.belongs_to?(group)
  end
  @ran = true
end
```
run_initializers 裡面，會找到所有可以 responsd `initializers` 這個 method 的 class 的祖先(在 tsort_each 裡面做)

會把這些祖先按照 name 的順序排列，每個送 `run` 的 message 給他去執行

像是 Rails Engine 就會讓所有的 engine 有 initializers 這個 method，所以這些 engine 都會在這時候啟動

Rails application 有定義 bootstrap, railtie, and finisher initializers:
```ruby
# railties/lib/rails/application.rb

def initializers # :nodoc:
  Bootstrap.initializers_for(self) +
  railties_initializers(super) +
  Finisher.initializers_for(self)
end
```
Bootstrap 這邊是 prepare 用的，像是準備 logger

finisher 可能會做一些像是 build middeleware stack 的事情，我們在 initializer 裡面有時候會用到 `to_prepare` 的 block，這也是在這一部執行

```ruby
# railties/lib/rails/application/finisher.rb
initializer :add_to_prepare_blocks do |app|
  config.to_prepare_blocks.each do |block|
    app.reloader.to_prepare(&block)
  end
end
```

要特別注意這裡的 initailizer 並不是我們寫在 `config/initiailizers` 裡面的那些！

剛剛都在 server.start 裡面的步驟，終於把寫的 config parse 結束，回到 start 剩下的步驟

--- 

```ruby
module Rails
  class Server < ::Rack::Server
    def start(after_stop_callback = nil)
      trap(:INT) { exit }
      create_tmp_directories
      setup_dev_caching
      log_to_stdout if options[:log_stdout] # <= 剛剛都在這其中有一步是 parse file

      super() # <= 現在要來這
      # ...
    end
```
Rack Server start 最後一步
`server.run wrapped_app, options, &blk`

`wrapped_app` 會 call `build_app`

```ruby
module Rack
  class Server
    private
      def build_app(app)
        middleware[options[:environment]].reverse_each do |middleware|
          middleware = middleware.call(self) if middleware.respond_to?(:call)
          next unless middleware
          klass, *args = middleware
          app = klass.new(app, *args)
        end
        app
      end
  end
end
```
在這一步 Rack call 所有的 middlewares

接著 server 怎麼 run 就要根據不同 server 的實作，像是 puma / passenger 會做得不一樣


## References 
[Rails guide](https://guides.rubyonrails.org/initialization.html)
[Bundler docs](https://bundler.io/v1.12/bundler_setup.html)
[鐵人賽文章](https://ithelp.ithome.com.tw/articles/10238693)