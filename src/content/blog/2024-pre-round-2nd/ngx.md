---
title: "ICTSC2024 二次予選 問題解説: [NGX] にゃーん"
description: "ICTSC2024 二次予選 問題解説: にゃーん"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/ngx"
draft: false
renderer: "md"
sticky: false
---

# 問題文

弊社ぽくぽくにゃんこNetwork株式会社の社内では、さまざまなWebページやWebAPIを提供しています。最近、アカウンタビリティ関連のシステムを刷新したところ、いくつかのWebページやWebAPIが開けなくなってしまいました。弊社の社員が「にゃーん...」と困惑しているので、解決を手助けしてください。

## 前提条件

今回の問題では、社内のWebページやWebAPIをホストしている環境を再現した環境を提供しています。この環境において、通信を模倣するためのコマンドとして`client` が用意されています。また、WebページやAPIを提供するためのサーバーもセットアップされています。

この環境で通信が成功すれば、`OK!` という応答が返ります。これが最終目標です。

なお、設定に関しては以下の条件を満たしてください。

- Webサーバーが設置されているホスト名 `server` の環境のみを変更してください。ユーザーに変更を依頼することはコストが高いため、避けたいと考えています。
- WebAPIのリバースプロキシは維持してください。リバースプロキシは、ユーザーへのサービス提供における負荷分散や障害時の冗長性を確保するために不可欠です。リバースプロキシとして動作している既存サービスを永続的に停止したり削除したりせず、サービスの稼働を確保する必要があります。

## 初期状態

* clientからserverに対し、`client`コマンドを用いてアクセスすると、`400 Bad Request`が返ってくる。

```
user@client:~$ client -url http://192.168.255.71
Response Status: 400 Bad Request
```

## 終了状態

* clientからserverに対し、`client`コマンドを用いてアクセスできる。

```
user@client:~$ client -url http://192.168.255.71
Response Status: 200 OK
Response Body: OK!
```

# 解説

この環境としてはサーバーの環境としてnginxが起動しており、nginxがリバースプロキシとして8080ポートで動くサービスをサーブしています。クライアントはサーバーに対してリクエストする形式です。

一番初めにリクエストを行うと、`Response Status: 400 Bad Request` とエラーを起こしています。
この原因を探るにまずは状況確認する必要があります。
さて、その上でnginxのログを見ると何も出てはいません。なのでまずはログレベルをDebugに変えます。
```
error_log /var/log/nginx/error.log debug;
```

その後リクエストをすると以下のようなログを `sudo cat /var/log/nginx/error.log` で発見することができます。
```
2024/11/11 03:58:40 [debug] 1850#1850: *1 http alloc large header buffer
2024/11/11 03:58:40 [info] 1850#1850: *1 client sent too long header line: "X-User-Groups: ...（中略
```
このことからまずは `X-User-Groups` というヘッダーが大きいことに問題がありそうです。

ではどれくらい大きいのでしょうか？今回はhttpの通信なので、tcpdumpなどでpcapをキャプチャすることでパケットの中身を確認することができます。キャプチャをして観察すると大体 `16kbyte` 程度のリクエストをしていることが分かります。例えば`Reassembled TCP` を見るとTCP全体でも `16kbyte` 程度の値が入ってること具体的な数値で取得できるでしょう。

このから `X-User-Groups` のヘッダーが16kbyte程度の大きさでリクエストされていることが問題だと言えます。

ではどのように解決すれば良いのでしょうか？
nginxのコンフィグのドキュメントを見ると クライアント関連のドキュメントを見つけることができます。
以下のように、`nginx.conf`に対して16kよりも大きい値を与えてあげれば解決します。
```
client_header_buffer_size 17k;
```

では解決したのかを確認しましょう。
残念ながら解決しておりませんね。。。
```shell
$ client -url http://192.168.255.71
Response Status: 502 Bad Gateway
```

では再度nginxのログを見てみましょう。
このエラーが発生した場合は、nginxのコンフィグの値をレスポンスヘッダーのサイズより大きくする必要があります。
```
...[error] 1343#1343: *1 upstream sent too big header while reading response header from upstream, ...
```

実際にnginxのコンフィグに以下のデータを追加することで解決します。
```
proxy_buffers 8 17k;
proxy_buffer_size 17k;
```


追加したnginxのコンフィグ自体に関してはこちらを参照してください
cf. https://nginx.org/en/docs/http/ngx_http_core_module.html

以下おまけです。
通信の模倣をしてるコマンドのコード。今回は社内サービスっぽい環境を模倣する前提でした。なので動的にそれっぽいユーザーグループを生成してヘッダーに載せて送信しています。気がついた人がいるかわかりませんが、実は `G_HEADER_SIZE` というパラメーターでサイズを下げれたりします。なお問題の制約としてServerだけの変更しかダメなので遊びに使う程度のものです。
https://gist.github.com/takehaya/4d35775a6b4dbd16063c226452694540

稼働してるWebAPIのコード。受け取ったヘッダー情報をそのまま返しています。
https://gist.github.com/takehaya/35bf6593fc9cf54be68ed8ac686c66a1
