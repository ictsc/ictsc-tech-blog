---
title: "ICTSC2023 本戦 問題解説: [MRG] 私のWebサイトは何処へ…"
description: "ICTSC2023 本戦 問題解説: 私のWebサイトは何処へ…"
tags: [ICTSC2023,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/mrg"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

〜あなたはDNSサーバを管理しています〜


あたい) DNSできたで(訳: DNSできたよ)<br>
相手) あざすまる(訳: ありがとう)<br><br>
\~数分後~<br><br>
相手) 俺のWebどこ？(訳: WebのIPアドレス何？)<br>
あたい) ？？？(訳: ？？？)<br>
相手) nslookupしても来ないんだが(訳: nslookupしても名前解決できない)<br>
あたい) あ、なんかエラー吐いてる(訳: エラー出てる)<br>

## 前提条件

- host, DNS, wwwのドメインは提示する<br>
- IPアドレスの提示はhost, DNSのみで、wwwのIPアドレスはconfigから推測せよ<br>
- 正引き、逆引きは`nslookup`のみで、`dig`は禁止する<br>
- 使用するファイルの場所は/etc/bind/である

## 初期状態

DNSの設定等にエラーが起きており、hostから`nslookup`を実行して名前解決ができない。

## 終了状態

エラー等の解消を行い、PC(ホスト名: host)から正引き、逆引きが正しくできる<br>
例)
```
user@host:~$ nslookup ***
Server:        127.0.0.53
Address:    127.0.0.53#53

Non-authoritative answer:
Name:    ***
Address: **.**.**.**

user@host:~$ nslookup **.**.**.**
**.**.**.**.in-addr.arpa    name = ***

Authoritative answers can be found from:
```
PC(ホスト名: host)```curl ＄wwwのドメインもしくはIPaddr```をするとページ内容が返ってくる

## 端末情報

|  ホスト名  |  IPアドレス OR ドメイン  |  ユーザ  |  パスワード  |
|  --------  |  -------------------  |  ------  |  ----------  |
|  host1  |  10.10.2.1/`host1.xn--bdkg5i0a.lan`  |  -  |  -  |
|  host2  |  10.10.4.1/`host2.xn--bdkg5i0a.lan`  |  -  |  -  |
|  dns  |  10.10.2.2/`dns.xn--bdkg5i0a.lan`  |  -  |  -  |
|  www  |  `www.xn--bdkg5i0a.lan`  |  -  |  -  |

---

## 解説&想定解法

この問題はただただtypoを修正するだけの作業問題。

まず、`named.conf.prob`のZoneが`.lan`ではなく`.com`に<br>
また、zoneの`xn--dbkg5i0a.com`ではなく`xn--bdkg5i0a.com`である
```
zone "xn--dbkg5i0a.com" IN { \\ bd
        type master;
        file "/etc/bind/xn--bdkg5i0a.lan";
};

zone "2.10.10.in-addr.arpa" IN {
        type master;
        file "/etc/bind/db.2.10.10";
};


zone "4.10.10.in-addr.arpa" IN {
        type master;
        file "/etc/bind/db.4.10.10";
};
```

`xn--bdkg5i0a.lan`も`.com`に、また`)`ない
```
$TTL 86400
@       IN      SOA     dns.xn--bdkg5i0a.com. root.xn--bdkg5i0a.com. (
        2024030301      ;Serial
        3600            ;Refresh
        1800            ;Retry
        604800          ;Expire
        865400          ;Minimum TTL
\\ )なし

        IN      NS      dns.xn--bdkg5i0a.com.
        IN      A       10.10.2.2

dns     IN      A       10.10.2.2
www     IN      A       10.10.4.132
host1   IN      A       10.10.2.1
host2   IN      A       10.10.4.1
```

`db.2.10.10`の下から二段目が`.com` に
```
$TTL 86400
@       IN      SOA     dns.xn--bdkg5i0a.lan. root.xn--bdkg5i0a.lan. (
        2024030301      ;Serial
        3600            ;Refresh
        1800            ;Retry
        604800          ;Expire
        86400           ;Minimum TTL
)

        IN      NS      dns.xn--bdkg5i0a.lan.

2       IN      PTR     dns.xn--bdkg5i0a.com. \\.lan
1       IN      PTR     host1.xn--bdkg5i0a.lan.
```

`db.4.10.10`の`132`が`123`に
```
$TTL 86400
@       IN      SOA     dns.xn--bdkg5i0a.lan. root.xn--bdkg5i0a.lan. (
        2024030301      ;Serial
        3600            ;Refresh
        1800            ;Retry
        604800          ;Expire
        86400           ;Minimum TTL
)

        IN      NS      dns.xn--bdkg5i0a.lan.

123     IN      PTR     www.xn--bdkg5i0a.lan. \\132
1       IN      PTR     host2.xn--bdkg5i0a.lan.
```

`/etc/hosts`に`10.10.2.2 dns.xn--bdkg5i0a.lan`がない
```
127.0.0.1 localhost

# The following lines are desirable for IPv6 capable hosts
::1 ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
ff02::3 ip6-allhosts
```

ここまで設定して、最後に`curl www.xn--bdkg5i0a.lan`or`curl 10.10.4.132`をすると以下が見れると思います。
```
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tsundere</title>
</head>
<body>
    <h1>べ、べつにあなたのためじゃないんだからね！</h1>
</body>
</html>
```

ちなみに、お気づきの人もいるかもしれませんが、`xn--bdkg5i0a`は日本語ドメインで`ツンデレ`になります。<br>
この子(web)はツンデレなのです。<br>

かわいいですね

## 採点基準

全てのtypoを修正して100点、1ミスで-20点、2ミスで-20点、それ以外は0点
合ってはいるが、報告書不備 1個: -5、2個以上で-20点

### 具体的な採点の流れ

まず`named.conf.prob`を修正する部分だが、かなりのチームが`named.conf.default-zones`を修正していた。
これについては`named.conf`を見た旨を報告書に記載していない場合は1ミスとして-20点している。
`named.conf`を見た上で`named.conf.default-zones`修正していた場合、報告書になぜ`named.conf.prob`ではなく`named.conf.default-zones`を修正したかを書いていなければ-5点にした。

その後は採点基準に沿って点数を付けた。

なお、終了条件に合致する報告書の記載がない場合、終了条件1個につき1ミスとした。

## 講評

typo問題を作るときに一番怖いのが、問題環境を作る際に意図しないtypoをしたとき。
