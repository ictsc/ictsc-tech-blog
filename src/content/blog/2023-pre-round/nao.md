---
title: "ICTSC2023 予選 問題解説: [NAO] 絵文字が入力できない！😭"
description: "ICTSC2023 予選 問題解説: 絵文字が入力できない！😭"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ictsc2023pr/nao"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

「我が社では古の時代から redmine を運用してきたが、最近入社した新卒から絵文字が書き込めないという問い合わせが寄せられるようになった。(;´･ω･｀)  
私はこの通り書き込めているのだが...( -᷄ω-᷅ )  
君にはこの問題を解決してほしい<(￣＾￣)>」

「上司、それは絵文字では無く顔文字です😓」

redmine に絵文字を書き込むことが出来ない事象を解決してください。

## ネットワーク図

* 特になし

## 前提条件

* 特になし

## 制約

* この redmine は社内で利用されている想定となっています。
* そのため redmine に登録されているチケット情報や wiki の内容が消えてしまう方法で解答した場合減点対象となります。

## 初期状態

wiki に絵文字🍣が書き込めない

## 終了状態

wiki に絵文字🍣を書き込んで保存することが出来る。

## 参考情報

redmine を手元のPCで見る方法

* redmine ログイン情報
  * ユーザ名: admin
  * パスワード: `J6vs0N2H21Y07oV5qUn57w`

```bash
# localhost:80 で見る場合
ssh -L 80:192.168.255.21:80 user@<踏み台サーバー> -N
open http://localhost:80

# localhost:8000 で見る場合
ssh -L 8000:192.168.255.21:80 user@<踏み台サーバー> -N
open http://localhost:8000
```

この状態で以下のＵＲＬにアクセスすることで wiki を開くことが出来ます

```http://localhost:<指定したポート>/projects/ictsc/wiki```

# 解説

## トラブルの原因

大昔に開催された ICTSC の過去問からの出題でした。

mysql の文字コードが utf8 で初期化されているため、絵文字を書き込むことが出来ない状態になっていたことがトラブルの原因です。  
絵文字を書き込もうとすると redmine のログに以下のようなエラーが出力されます。

```log
I, [2023-10-22T08:55:32.824882 #1]  INFO -- :   Parameters: {"utf8"=>"✓", "authenticity_token"=>"", "content"=>{"version"=>"1", "text"=>"h1. Wiki\r\n\r\n🍺", "comments"=>""}, "commit"=>"保存", "project_id"=>"ictsc", "id"=>"Wiki"}
I, [2023-10-22T08:55:32.836063 #1]  INFO -- :   Current user: admin (id=1)
I, [2023-10-22T08:55:32.892700 #1]  INFO -- : Completed 500 Internal Server Error in 68ms (ActiveRecord: 48.4ms | Allocations: 3658)
F, [2023-10-22T08:55:32.894727 #1] FATAL -- :
ActiveRecord::StatementInvalid (Mysql2::Error: Incorrect string value: '\xF0\x9F\x8D\xBA' for column 'text' at row 1):
```

## トラブルの解決方法

絵文字を書き込めるようにするために文字コードを utf8mb4 に変更します。　　

まずは以下のようなスクリプトファイルを作成します。  
mysql のパスワードは `/opt/redmine/database.yml` か `/opt/redmine/docker-compose.yaml` から拾ってくることが出来ます。

```shell
user@redmine:~$ cat sh.sh
export MYSQL_DB=redmine
export MYSQL_USER=redmine
export MYSQL_PASS=mhzaxx-qbl45GunhyzkHxg
export CONVERT_SCRIPT_FILE=$HOME/convert_script

cd /opt/redmine

(echo 'alter database `'"$MYSQL_DB"'` default character set utf8mb4;'; sudo docker compose exec db mysql -u$MYSQL_USER -p$MYSQL_PASS $MYSQL_DB -e "show tables" --batch --skip-column-names | xargs -I{} echo -e 'alter table `'{}'` ROW_FORMAT=DYNAMIC;\nalter table `'{}'` convert to character set utf8mb4;') > $CONVERT_SCRIPT_FILE
```

実行すると convert_script というファイルが作成されます

<details><summary>convert_scriptの中身</summary>

```
user@redmine:~$ cat convert_script
alter database `redmine` default character set utf8mb4;
alter table `ar_internal_metadata` ROW_FORMAT=DYNAMIC;
alter table `ar_internal_metadata` convert to character set utf8mb4;
alter table `attachments` ROW_FORMAT=DYNAMIC;
alter table `attachments` convert to character set utf8mb4;
alter table `auth_sources` ROW_FORMAT=DYNAMIC;
alter table `auth_sources` convert to character set utf8mb4;
alter table `boards` ROW_FORMAT=DYNAMIC;
alter table `boards` convert to character set utf8mb4;
alter table `changes` ROW_FORMAT=DYNAMIC;
alter table `changes` convert to character set utf8mb4;
alter table `changeset_parents` ROW_FORMAT=DYNAMIC;
alter table `changeset_parents` convert to character set utf8mb4;
alter table `changesets` ROW_FORMAT=DYNAMIC;
alter table `changesets` convert to character set utf8mb4;
alter table `changesets_issues` ROW_FORMAT=DYNAMIC;
alter table `changesets_issues` convert to character set utf8mb4;
alter table `comments` ROW_FORMAT=DYNAMIC;
alter table `comments` convert to character set utf8mb4;
alter table `custom_field_enumerations` ROW_FORMAT=DYNAMIC;
alter table `custom_field_enumerations` convert to character set utf8mb4;
alter table `custom_fields` ROW_FORMAT=DYNAMIC;
alter table `custom_fields` convert to character set utf8mb4;
alter table `custom_fields_projects` ROW_FORMAT=DYNAMIC;
alter table `custom_fields_projects` convert to character set utf8mb4;
alter table `custom_fields_roles` ROW_FORMAT=DYNAMIC;
alter table `custom_fields_roles` convert to character set utf8mb4;
alter table `custom_fields_trackers` ROW_FORMAT=DYNAMIC;
alter table `custom_fields_trackers` convert to character set utf8mb4;
alter table `custom_values` ROW_FORMAT=DYNAMIC;
alter table `custom_values` convert to character set utf8mb4;
alter table `documents` ROW_FORMAT=DYNAMIC;
alter table `documents` convert to character set utf8mb4;
alter table `email_addresses` ROW_FORMAT=DYNAMIC;
alter table `email_addresses` convert to character set utf8mb4;
alter table `enabled_modules` ROW_FORMAT=DYNAMIC;
alter table `enabled_modules` convert to character set utf8mb4;
alter table `enumerations` ROW_FORMAT=DYNAMIC;
alter table `enumerations` convert to character set utf8mb4;
alter table `groups_users` ROW_FORMAT=DYNAMIC;
alter table `groups_users` convert to character set utf8mb4;
alter table `import_items` ROW_FORMAT=DYNAMIC;
alter table `import_items` convert to character set utf8mb4;
alter table `imports` ROW_FORMAT=DYNAMIC;
alter table `imports` convert to character set utf8mb4;
alter table `issue_categories` ROW_FORMAT=DYNAMIC;
alter table `issue_categories` convert to character set utf8mb4;
alter table `issue_relations` ROW_FORMAT=DYNAMIC;
alter table `issue_relations` convert to character set utf8mb4;
alter table `issue_statuses` ROW_FORMAT=DYNAMIC;
alter table `issue_statuses` convert to character set utf8mb4;
alter table `issues` ROW_FORMAT=DYNAMIC;
alter table `issues` convert to character set utf8mb4;
alter table `journal_details` ROW_FORMAT=DYNAMIC;
alter table `journal_details` convert to character set utf8mb4;
alter table `journals` ROW_FORMAT=DYNAMIC;
alter table `journals` convert to character set utf8mb4;
alter table `member_roles` ROW_FORMAT=DYNAMIC;
alter table `member_roles` convert to character set utf8mb4;
alter table `members` ROW_FORMAT=DYNAMIC;
alter table `members` convert to character set utf8mb4;
alter table `messages` ROW_FORMAT=DYNAMIC;
alter table `messages` convert to character set utf8mb4;
alter table `news` ROW_FORMAT=DYNAMIC;
alter table `news` convert to character set utf8mb4;
alter table `projects` ROW_FORMAT=DYNAMIC;
alter table `projects` convert to character set utf8mb4;
alter table `projects_trackers` ROW_FORMAT=DYNAMIC;
alter table `projects_trackers` convert to character set utf8mb4;
alter table `queries` ROW_FORMAT=DYNAMIC;
alter table `queries` convert to character set utf8mb4;
alter table `queries_roles` ROW_FORMAT=DYNAMIC;
alter table `queries_roles` convert to character set utf8mb4;
alter table `repositories` ROW_FORMAT=DYNAMIC;
alter table `repositories` convert to character set utf8mb4;
alter table `roles` ROW_FORMAT=DYNAMIC;
alter table `roles` convert to character set utf8mb4;
alter table `roles_managed_roles` ROW_FORMAT=DYNAMIC;
alter table `roles_managed_roles` convert to character set utf8mb4;
alter table `schema_migrations` ROW_FORMAT=DYNAMIC;
alter table `schema_migrations` convert to character set utf8mb4;
alter table `settings` ROW_FORMAT=DYNAMIC;
alter table `settings` convert to character set utf8mb4;
alter table `time_entries` ROW_FORMAT=DYNAMIC;
alter table `time_entries` convert to character set utf8mb4;
alter table `tokens` ROW_FORMAT=DYNAMIC;
alter table `tokens` convert to character set utf8mb4;
alter table `trackers` ROW_FORMAT=DYNAMIC;
alter table `trackers` convert to character set utf8mb4;
alter table `user_preferences` ROW_FORMAT=DYNAMIC;
alter table `user_preferences` convert to character set utf8mb4;
alter table `users` ROW_FORMAT=DYNAMIC;
alter table `users` convert to character set utf8mb4;
alter table `versions` ROW_FORMAT=DYNAMIC;
alter table `versions` convert to character set utf8mb4;
alter table `watchers` ROW_FORMAT=DYNAMIC;
alter table `watchers` convert to character set utf8mb4;
alter table `wiki_content_versions` ROW_FORMAT=DYNAMIC;
alter table `wiki_content_versions` convert to character set utf8mb4;
alter table `wiki_contents` ROW_FORMAT=DYNAMIC;
alter table `wiki_contents` convert to character set utf8mb4;
alter table `wiki_pages` ROW_FORMAT=DYNAMIC;
alter table `wiki_pages` convert to character set utf8mb4;
alter table `wiki_redirects` ROW_FORMAT=DYNAMIC;
alter table `wiki_redirects` convert to character set utf8mb4;
alter table `wikis` ROW_FORMAT=DYNAMIC;
alter table `wikis` convert to character set utf8mb4;
alter table `workflows` ROW_FORMAT=DYNAMIC;
alter table `workflows` convert to character set utf8mb4;
```

</details>

このスクリプトをmysqlに反映するので、
さっきのスクリプトの最後に追加しておきます。

```shell
user@redmine:~$ cat sh.sh
export MYSQL_DB=redmine
export MYSQL_USER=redmine
export MYSQL_PASS=mhzaxx-qbl45GunhyzkHxg
export CONVERT_SCRIPT_FILE=$HOME/convert_script

cd /opt/redmine

(echo 'alter database `'"$MYSQL_DB"'` default character set utf8mb4;'; sudo docker compose exec db mysql -u$MYSQL_USER -p$MYSQL_PASS $MYSQL_DB -e "show tables" --batch --skip-column-names | xargs -I{} echo -e 'alter table `'{}'` ROW_FORMAT=DYNAMIC;\nalter table `'{}'` convert to character set utf8mb4;') > $CONVERT_SCRIPT_FILE

sudo docker compose exec -T db mysql -u$MYSQL_USER -p$MYSQL_PASS $MYSQL_DB < $CONVERT_SCRIPT_FILE
```

これで文字コードを utf8 から utf8mb4 に変更することが出来ました。

ただし、これだけだとまだ絵文字を書き込むことが出来ません。  
redmine 側の設定を変更し、アプリケーション側からも utf8mb4 を利用するように変更してあげてください。

```shell
user@redmine:~$ sudo vim /opt/redmine/database.yml
encoding: utf8
↓
encoding: utf8mb4
```

最後に再起動してあげれば絵文字が書き込めるようになるはずです

```shell
user@redmine:~$ sudo systemctl restart redmine.service
```

## 参考サイト

<https://zappy.hatenablog.jp/entry/2015/05/19/015044>
