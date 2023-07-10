#!ruby

# usage: ./outline_generator.rb source/_posts/2021-08-25-Ssh_tunnel.md

require 'cgi'

file_path = ARGV.first

File.readlines("./#{file_path}").each do |line|
  next unless line =~ /^###? /

  if line =~ /^## (.*)/
    title = line.match(/^## (.*)/)[1]
    puts "- [#{title}](##{link_title(title)})"
  elsif line =~ /^### (.*)/
    title = line.match(/^### (.*)/)[1]
    puts "  - [#{title}](##{link_title(title)})"
  end
end

def link_title(title)
  title.split.map(&:downcase).map { |str| CGI.escape(str) }.join('-')
end
