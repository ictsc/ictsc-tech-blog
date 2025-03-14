---
title: "ICTSC2024 二次予選 問題解説: [NAO] ユーザが作成できない"
description: "ICTSC2024 二次予選 問題解説: ユーザが作成できない"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/nao"
draft: false
renderer: "md"
sticky: false
---

# 問題文

あなたはイベント登録サイトの管理者です。
ユーザーはイベントページを作成し、参加者はそのイベントに登録することができます。

サイトのリニューアルを行うため、データの移行作業を行いました。

古いイベント情報は不要なためユーザ情報のみデータを移行しました。
リリースしようと動作確認を行ったところユーザ登録に失敗することが判明しました。

調査を行い、ユーザ登録ができるように修正してください。

なお、リニューアル前のサーバやデータベースのバックアップについては、動作確認が完了する前にリリース担当者が早まって削除してしまいました。

* トラブルの原因の説明を含めて回答してください。
* アプリケーションのソースコードは修正しても構いませんが、ソースコードの修正によってユーザ作成ができるようになるような回答は無効とします。

## 問題に関する情報

* API サーバのソースコードは `/opt/ictsc` で管理されています。
* API サーバは docker compose で動作しています。

サービスへのログインとユーザ一覧取得方法

```sh
$ TOKEN=$(curl -sSL 192.168.255.10/api/v1/login -X POST -d'username=admin' -d'password=password' | jq -r .token)
$ curl -sSL 192.168.255.10/api/v1/users -H "Authorization: Bearer $TOKEN" | jq
```

ユーザの登録方法

```sh
$ curl -H 'content-type: application/json' http://192.168.255.10/api/v1/public/users -X POST -d '{"username": "test", "password": "test"}'
```

作業者によるとユーザデータは以下の方法でユーザをインポートしたと供述しています。

```
ほんとすみません :pray:
サーバに保存してある /opt/ictsc/data/users.sql を以下のコマンドで流し込みました。

$ docker compose exec -i -t db psql -U ictsc -p ictsc -d ictsc --host 127.0.0.1 --port 5432

このファイル自体は pg_dump で取得したバックアップファイルからユーザの COPY 部分だけを抜き取ったものです。
それ以外を削除しただけでこの SQL 自体には特に変更を加えてないです。

なんで壊れちゃったんだろ...
```

## 前提条件

* 特になし

## 初期状態

* ユーザを作成しようとすると失敗する

## 終了状態

* ユーザを登録できる

# 解説

## トラブルの原因

ユーザテーブルのリストアを行った際に id を明示的に指定してインポートしたため、PostgreSQLのシーケンスが更新されず、新規ユーザー登録時に一意性制約違反が発生してしまったという問題でした。

具体的には以下のような流れでエラーが発生していました：

* データ移行時、pg_dump で取得したバックアップデータから COPY文を使ってユーザーデータをインポート。
* この際、テーブルの主キー（id）が明示的に指定されていたため、PostgreSQLの シーケンス（auto increment機能） が更新されず、そのまま古い状態のまま残ってしまった。
* 結果として、新規ユーザー登録時にシーケンスが初期値（1）のままであり、移行されたデータと重複する ID が生成されてしまい、一意性制約違反エラーが発生した。

## 解決方法

この問題を解決するためには、シーケンスを現在のテーブル内の最大IDに同期させる必要があります。

以下の手順で修正できます：

1. 現在のテーブル内で使用されている最大のIDを取得します。

```sql
SELECT MAX(id) FROM users;
```

2. シーケンスをこの最大IDに更新します。
2. PostgreSQLでは setval 関数を使用してシーケンス値を設定できます。

```
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
```

これにより、次回新しいユーザーを登録する際には、既存データと重複しないIDが自動的に生成されるようになります。

## 補足

このトラブルが起きたそもそもの原因はデータ移行時に PostgreSQLシーケンス（auto increment機能）の値をリストアしなかったことが原因です。

pg_dump は通常、データベースのバックアップ時にシーケンスの現在値を含めてダンプします。
この情報は、リストア時に正しいシーケンス値を再設定するために必要になります。
しかし、今回のケースでは pg_dump で生成されたバックアップファイルからユーザーデータ部分（COPY文）だけを抜き出して使用したため、シーケンス情報がリストアされませんでした。

本来であれば作業者は pg_dump が出力した以下の sql を実行する必要がありました。

```
SELECT pg_catalog.setval('public.users_id_seq', 1001, true);
```
