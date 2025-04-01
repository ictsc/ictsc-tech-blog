---
title: "ICTSC2024 本戦 問題解説: [IKM] このサイトにアクセスできません"
description: "ICTSC2024 本戦 問題解説: このサイトにアクセスできません"
tags: [ICTSC2024,問題解説,ネットワーク関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/ikm"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

あなたは、自宅で Web サーバと DNS サーバ (権威サーバ・フルリゾルバ) を運用している。
HTTPS レコードを登録し、client から nginx に立てた Web サイト にアクセスできる環境を作りたいと考えていたがうまくいかない。
この問題を解決し快適な自宅サーバ環境を手に入れよう。

## 前提条件

- それぞれのサーバに Knot DNS, Knot Resolver, Nginx は構築済み
- nginx は HTTPS でアクセスが可能
- client には nginx にアクセスする Python プログラムがある
  - 3 分毎に `/home/user/src/firefox.py` が実行される
  - ログファイルが同一階層に保存される
  - 手動実行は以下のコマンドでできる
    - `/home/user/src/.venv/bin/python /home/user/src/firefox.py`

### 制約

- client は問題ネットワーク上で構築したフルリゾルバ以外の手段で名前解決をしてはいけない
- 追加でソフトウェアをインストールしてはいけない
- 既存ファイルの編集でのみファイル操作を許可する
  - ファイルを編集する際は最低限の修正で問題を解決する必要がある
  - 今後の運用を見据えた修正など、本問題の解決に直接関係しない変更は減点対象となる
- Knot Resolver の設定を変更してはいけない
- nginx には SSH ログインできない
- client の Python プログラムを変更してはいけない

## 初期状態

- client の `/home/user/src/firefox.py` を実行すると nginx にアクセスできない

## 終了状態

- client の `/home/user/src/firefox.py` を実行すると 5 秒以内に 200 OK で Web ページのソースが取得できる
  - ログファイルの抜粋を報告書に添付すること
- 本トラブルの再発防止のために、原因を詳細に記述すること

## ネットワーク図

![](/images/2024-final-round/ikm.png)

---

## 解説

この問題は、以下の 2 つのトラブルを解決することで正解となります。

- 権威 DNS サーバのゾーンファイルに設定不備がある
- ネガティブキャッシュ TTL が長すぎることによってフルリゾルバがキャッシュを更新しない

### 解決方法

#### (knotdns) HTTPS レコードの修正

初期状態のゾーンファイルは以下の通りです。

```txt
$ORIGIN ikm.internal.
$TTL 345600

@       IN      SOA     ns1.ikm.internal. admin.ikm.internal. (
                2025031623
                28800
                7200
                864000
                345600
                )

        IN      NS      ns1.ikm.internal.

ns1     IN      A       192.168.32.1

www     IN      HTTPS   10      . (
                ipv4hint=192.168.32.3
                alpn=h3
                )
```

このうち、`www.ikm.internal`の HTTPS RRset は以下のように設定されています。

- SvcPriority：10 (サービスモード)
- TargetName："." (`www.ikm.internal.`)
- SvcParams：
  - alpn：h3 (HTTP/3)
  - ipv4hint：192.158.32.3

しかし、nginx で動作している Web サーバは HTTP/3 に対応していません。これを確認するために curl や nmap を使用します。
`alpn`が`h3`である場合、Firefox はまず HTTP/3 で接続を試み、失敗すると HTTP/1.1 へフォールバックします。これに時間がかかるため、終了状態で示した「5 秒以内」にアクセスできることを満たせません。

```shell-session
$ curl -skI https://192.168.32.3/ | head -n 1
HTTP/1.1 200 OK
```

```shell-session
$ sudo nmap -sSU -p 443 192.168.32.3
Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-03-20 14:59 JST
Nmap scan report for 192.168.32.3
Host is up (0.00036s latency).

PORT    STATE  SERVICE
443/tcp open   https
443/udp closed https
MAC Address: BC:24:11:FC:A5:A1 (Unknown)

Nmap done: 1 IP address (1 host up) scanned in 0.14 seconds
```

そのため`alpn`を`h2`もしくは`http/1.1`に変更する必要があります。
ただし、本問題では「ファイルを編集する際は最低限の修正で問題を解決する必要がある」という制約があるため、`h2`にすることで正解となります。

また、[RFC9460 Section 7.3](https://www.rfc-editor.org/rfc/rfc9460.html#name-ipv4hint-and-ipv6hint)によると、`ipv4hint`の使用は MAY であり、`TargetName`の A レコード問い合わせは SHOULD とされています。
Firefox は`ipv4hint`に基づく名前解決を行わないため、明示的に A レコードを追加する必要があります。
最低限の修正で解決する必要があるため、ゾーンファイル (`/var/lib/knot/internal.ikm.zone`) の修正は以下のものが正解となります。

- `alpn=h3` → `alpn=h2` に変更
  - 5 秒以内にレスポンスを取得するために必要
- `www.ikm.internal`の A レコードを追加
  - 名前解決で必要
- TTL の修正やその他の変更は最低限の修正ではないため減点

```diff
  $ORIGIN ikm.internal.
  $TTL 345600

  @       IN      SOA     ns1.ikm.internal.     admin.ikm.internal. (
                          2025031623
                          28800
                          7200
                          864000
                          345600
                          )

          IN      NS      ns1.ikm.internal.

  ns1     IN      A       192.168.32.1

  www     IN      HTTPS   10      . (
-                         alpn=h3
+                         alpn=h2
                          ipv4hint=192.168.32.3
                          )
+                 A       192.168.32.3
```

ゾーンファイルの変更を適用させます。

```shell-session
sudo systemctl restart knot.service
```

#### (knotres) フルリゾルバのネガティブキャッシュのデータをクリアする

client で実行される Python プログラムは、Firefox ヘッドレスモードで`www.ikm.internal`にアクセスします。以下のコマンドで、どのような名前解決を行われているかを確認できます (一部抜粋)。

```shell-session
$ sudo resolvectl monitor
→ Q: www.ikm.internal IN HTTPS
← S: success
← A: www.ikm.internal IN HTTPS \# 18 000a000001000302683300040004c0a82003

→ Q: www.ikm.internal IN A
← S: success
← A: ikm.internal IN SOA ns1.ikm.internal admin.ikm.internal 2025031623 28800 7200 864000 345600

→ Q: www.ikm.internal IN AAAA
← S: success
← A: ikm.internal IN SOA ns1.ikm.internal admin.ikm.internal 2025031623 28800 7200 864000 345600
```

このログから、HTTPS レコードだけでなく A レコードも問い合わせていることが分かります。
しかし、初期状態では`www.ikm.internal`の A レコードが存在しなかったため、フルリゾルバはネガティブキャッシュ TTL (345600 秒=4 日間)に基づき、権威サーバに再度 A レコードの問い合わせを行いません。
そのためゾーンファイルを修正しても、フルリゾルバのキャッシュをクリアしない限り、client は名前解決に成功しません。

以下のコマンドでフルリゾルバのキャッシュをクリアします。

```shell-session
$ sudo nc -U /run/knot-resolver/control/1
> cache.clear()
```

もしくは

```shell-session
$ sudo kresc /run/knot-resolver/control/1
kresc> cache.clear()
```

よって、client から knotres での名前解決・Python プログラムによる終了状態を満たしていることがログファイルから分かります。

```shell-session
$ dig www.ikm.internal a +short
192.168.32.3

$ dig www.ikm.internal https +short
10 . alpn="h2" ipv4hint=192.168.32.3
```

```shell-session
$ tail -n 1 ~/src/firefox.log
2025-03-14 10:28:43 INFO:Accessed ICTSC{Welcome_to_IKM!} - https://www.ikm.internal/ in 0.10s
```

## 採点基準

- knotdns での解決：100 点 (40%)
  - alpn, A レコード追加以外の変更：-100 点
    - ゾーンファイルの追加添削は行わない
  - HTTP/3 でアクセスしてしまう問題を解決：50 点 (20%)
    - 最低限の編集でない場合：減点
  - A レコードの追加：50 点 (20%)
    - 最低限の編集でない場合：減点
- knotres での解決：100 点 (40%)
  - キャッシュのクリア：100 点
- **ネガティブ**キャッシュに触れられている：50 点

## 講評

この問題では、Firefox における HTTPS レコードの扱いや、ネガティブキャッシュの TTL に関する知識が求められました。
[Cloudflare Radar](https://radar.cloudflare.com/dns#dns-query-type)によると、1.1.1.1 への問い合わせでは、A や AAAA に次いで HTTPS レコードの問い合わせが多いそうです。
是非この機会に、HTTPS レコードを活用してみてはいかがでしょうか。

回答したチームは全体的に意図した通りの解法を取っていましたが、「ネガティブキャッシュ」という用語を使用したチームはいませんでした。
また、ゾーンファイルの修正に関する正解の基準を厳密にしすぎたため満点回答が出ず、難易度が高すぎる結果となりました。
