---
title: "ICTSC2026 一次予選 問題解説: 問15"
description: "ICTSC2026 一次予選 問題解説: 問15"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/uca"
draft: false
renderer: "md"
sticky: false
---

## 問15

### 状況
社内向けの在庫管理 Web アプリケーション（Django 製）を、1台の Linux サーバ `web01` で運用している。3か月前に、営業所から利用できるようインターネットへ公開する設定に変更しました。
本日、外部のセキュリティ研究者から「アプリケーションの設定ファイル `.env` が誰でも取得できる状態になっている」という指摘を受けた。調査したところ、`.env` の内容が第三者に渡っていることが判明しました。

### 前提条件
- OS は Ubuntu 24.04 LTS、nginx のバージョンは 1.24.0 です。
- アプリケーションは Django 5.0.6 + gunicorn 22.0.0 で動作しており、gunicorn は UNIX ドメインソケット `/run/gunicorn/inventory.sock` で待ち受けています。
- nginx のワーカープロセスは `www-data` ユーザで動作しており、`/var/www` 配下のファイルはすべて `www-data` から読み取り可能です。
- WAF、IPS、リバースプロキシ、CDN は導入されていません。
- **nginx の設定は資料1に示したものがすべてであり、これ以外に読み込まれている設定ファイルはない**。
- アプリケーションおよび Django の設定に、ファイルを配信する独自の実装は存在しません。
- 送信元 IP `198.51.100.77` は、社内で管理しているいずれの機器の IP アドレスとも一致しません。
- ログのタイムゾーンは JST です。

### 資料1: `/etc/nginx/sites-enabled/inventory.conf`（全文）
```nginx
server {
    listen 80;
    server_name inventory.example.co.jp;

    access_log /var/log/nginx/inventory_access.log;

    client_max_body_size 20m;

    location /static {
        alias /var/www/inventory/static/;
        expires 30d;
    }

    location /media/ {
        alias /var/www/inventory/media/;
    }

    location / {
        proxy_pass http://unix:/run/gunicorn/inventory.sock;
        proxy_set_header Host            $host;
        proxy_set_header X-Real-IP       $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 資料2: ファイルの配置状況

```
web01:~$ ls -la /var/www/inventory/
total 36
drwxr-xr-x 5 inventory inventory 4096 May 12  2026 .
drwxr-xr-x 3 root      root      4096 Feb  3  2026 ..
-rw-r--r-- 1 inventory inventory  343 May 12  2026 .env
-rw-r--r-- 1 inventory inventory   57 Feb  3  2026 .gitignore
drwxr-xr-x 2 inventory inventory 4096 May 12  2026 inventory
-rwxr-xr-x 1 inventory inventory  665 Feb  3  2026 manage.py
drwxr-xr-x 3 inventory inventory 4096 Feb  3  2026 media
-rw-r--r-- 1 inventory inventory   99 Apr  2  2026 requirements.txt
drwxr-xr-x 5 inventory inventory 4096 Aug 12  2026 static

web01:~$ ls /var/www/inventory/static/
admin  css  img  js
```

### 資料3: `/var/log/nginx/inventory_access.log` 抜粋
```
198.51.100.77 - - [12/Aug/2026:03:11:55 +0900] "GET /accounts/login/ HTTP/1.1" 200 5124 "-" "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
198.51.100.77 - - [12/Aug/2026:03:11:55 +0900] "GET /static/css/main.css HTTP/1.1" 200 18422 "http://inventory.example.co.jp/accounts/login/" "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
198.51.100.77 - - [12/Aug/2026:03:14:31 +0900] "GET /static/../.env HTTP/1.1" 404 179 "-" "curl/8.5.0"
198.51.100.77 - - [12/Aug/2026:03:15:48 +0900] "GET /static../manage.py HTTP/1.1" 200 665 "-" "curl/8.5.0"
198.51.100.77 - - [12/Aug/2026:03:16:10 +0900] "GET /static../.env HTTP/1.1" 200 343 "-" "curl/8.5.0"
```

`03:16:10` のリクエストによって `.env` の内容が返された原因を記述せよ。
記述にあたっては、以下の3点をすべて含めること。  
1. **資料1の設定のどこに問題があるのか**を指摘したうえで、なぜそのような結果になるのかを説明すること
2. **nginx が実際に読み出したファイルの絶対パス**を示すこと
3. `03:14:31` のリクエストが `404` を返しているのに対し、`03:16:10` のリクエストが `200` を返した**理由の違い**を説明すること

### 正解（想定解答）

資料1の `location /static` に末尾のスラッシュが無く、`alias` の値 `/var/www/inventory/static/` にはある点が問題である。`alias` は `location` にマッチした文字列を置換するため、`/static../.env` では `/static` が `/var/www/inventory/static/` に置換され、残りの `../.env` が連結されて `/var/www/inventory/.env` が読み出された。一方 `03:14:31` の `/static/../.env` は `..` が独立したパスセグメントであるため、`nginx` が `location` のマッチング前に `URI` を `/.env` へ正規化し、`location /` 経由で `Django` が 404 を返した。`/static../.env` は `static..` が一つのセグメントであり正規化されないため、`location /static` にマッチしたまま処理された。

### 解説

本問題の原因は、**資料1の `location /static` に末尾のスラッシュが無く、`alias` の値 `/var/www/inventory/static/` にはあったという不整合です。** この一文字の食い違いだけで、静的ファイルの公開ディレクトリより一つ上の階層にあるファイルが、認証なしで誰にでも読める状態になっていました。nginx の設定ミスとしては "off-by-slash" として知られる典型的なもので、本問はこの一点だけを問う問題でした。

nginx でファイルの置き場所を指定するディレクティブには `root` と `alias` があり、動作が異なります。

| ディレクティブ | 動作 |
| --- | --- |
| `root` | リクエスト URI を `root` の値に**連結**する |
| `alias` | URI のうち `location` にマッチした部分を `alias` の値で**置換**する |

[公式ドキュメント](https://nginx.org/en/docs/http/ngx_http_core_module.html#alias)の `alias` の説明は "Defines a replacement for the specified location."（指定した location に対する置換を定義する）の一文から始まります。この「置換」が本問の答えそのものです。

もう一つ、nginx の prefix location は**単なる前方一致**です。「ディレクトリ名として一致するか」ではなく「文字列として `/static` で始まるか」しか見ません。

この2つを重ねると、資料1の設定で何が起きるかが分かります。

```
location /static {                      ← 末尾に / が無い
    alias /var/www/inventory/static/;   ← 末尾に / がある
}

GET /static../.env
    /static../.env は "/static" で始まる → マッチしてしまう
    ~~~~~~~                                置換されるのはこの7文字だけ

  /var/www/inventory/static/  +  ../.env
= /var/www/inventory/static/../.env
= /var/www/inventory/.env               ← OS がパスを解決した先
```

`.env` は `www-data` から読める権限だったため、そのまま返されました。ログの `200 343` の `343` は資料2の `ls -la` にある `.env` のサイズと一致します（`03:15:48` の `665` も `manage.py` と一致）。

`location /static/` と書いてあれば、`/static..` は `/static/` で始まらないのでマッチせず、`location /` に落ちて Django が 404 を返していました。
