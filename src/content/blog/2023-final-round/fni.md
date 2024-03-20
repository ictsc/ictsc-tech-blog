---
title: "ICTSC2023 本戦 問題解説: [FNI] IPv6先輩からの挑戦状"
description: "ICTSC2023 本戦 問題解説: IPv6先輩からの挑戦状"
tags: [ICTSC2023,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/fni"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

この学校にはIPv6先輩という学生がいる。
あろうことか、その先輩は事あるごとにIPv4アドレスをIPv6アドレスに変換して皆を困らせている。<br>
「IPv6の普及率をもっと高めるのだ！！！」(byIPv6先輩)<br>

今宵もあなたの元にIPv6先輩がやってくる…<br><br>

〜IPv6先輩からの挑戦状〜<br><br>

突然だが、お前の設定したDNSサーバの内、1個のアドレスをIPv6にした！
見事IPv6からIPv4に変換できたなら点数をやろう！<br>


## 前提条件

- hostの設定書き換え禁止(指示された箇所を除く)
- IPv6にされたアドレスがwebに繋がるアドレスである<br>
- dnsのconfigは/etc/bind/にある<br>
- hostからの通信は`10.10.3.1`のアドレスを使うこと

## 初期状態

DNSのconfig(Aレコード)にIPv6が設定されている

## 終了状態

- config内のIPv6アドレスがIPv4アドレスに変換されている
- hostから各ドメインの正引き、逆引きができる
- hostから`curl www.xn--edkxcza0a.lan`を使用し、Webサイトの内容を見れる

## 端末情報

| ホスト名 | ドメイン名 |
| --------- | ----------- |
|  host  |  `host.xn--edkxcza0a.lan`   |
|  dns  |  `dns.xn--edkxcza0a.lan`  |
|  www  |  `www.xn--edkxcza0a.lan`  |

---

## 解説

IPv6からIPv4に変換する方法<br>
このIPv6アドレスはIPv4-mapped notationであり、最後の32ビット(4オクテット)がIPv4アドレスを表している。<br>
そのため、まずIPv4アドレス部分を16進数から10進数に変換する。(ffff以外)<br>

   ffff<br>
   0a -> 10<br>
   0a -> 10<br>
   04 -> 4<br>
   84 -> 132<br>

そしてffffはIPv4-mapped notationにおいて、IPv6アドレスの低位32ビットがIPv4アドレスを表すことを示している。<br>
よって、このIPv6アドレスは10.10.4.132と変換でき、前提条件からこのアドレスがwwwのアドレスであることが分かる。<br>

## 想定解法
先ほど導出したアドレスを用いてDNSの設定を行う。
`xn--edkxcza0a.lan`
```
$TTL 86400
@       IN      SOA     dns.xn--edkxcza0a.lan. root.xn--edkxcza0a.lan. (
        2024030301      ;Serial
        3600            ;Refresh
        1800            ;Retry
        604800          ;Expire
        865400          ;Minimum TTL
)

        IN      NS      dns.xn--edkxcza0a.lan.
        IN      A       10.10.2.1

dns     IN      A       10.10.2.1
www   　IN      A       10.10.4.132 \\ 0000:0000:0000:0000:0000:ffff:0a0a:0484
host    IN      A       10.10.3.1

```
`sudo nano db.4.10.10`
```
$TTL 86400
@       IN      SOA     dns.xn--edkxcza0a.lan. root.xn--edkxcza0a.lan. (
        2024030301      ;Serial
        3600            ;Refresh
        1800            ;Retry
        604800          ;Expire
        86400           ;Minimum TTL
)

        IN      NS      dns.xn--edkxcza0a.lan.

132 \\  IN      PTR     www.xn--edkxcza0a.lan.

```

`curl www.xn--edkxcza0a.lan`or`curl 10.10.4.132`をして以下が見れればOK
```
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yandere</title>
</head>
<body>
    <h1>ねぇ、なんで私を見てくれないの？</h1>
</body>
</html>
```
ちなみにお気づきの人もいるかもしれませんが、`xn--edkxcza0a`は日本語ドメインで```ヤンデレ```になります。

## 採点基準

- config内のIPv6アドレスがIPv4アドレスに変換されている→60点
- hostから各ドメインの正引き、逆引きができる→20点
- hostからcurl www.xn--edkxcza0a.lanを使用し、Webサイトの内容を見れる→20点

### 具体的な採点の流れ

- アドレスを正しく変換した時点で60点

- hostから各ドメインの正引き、逆引きをした旨が書いていれば20点(報告書に書かれていなければ0点)

- hostからcurl www.xn--edkxcza0a.lanを使用し、Webサイトの内容を見た旨を書いていれば20点(報告書に書かれていなければ0点)

## 講評

競技時間中に来た選手からの質問によって問題不備が発覚しました。
この不備に関しては本戦前に確認すれば防げたはずであり、問題担当として自責の念に堪えません。
この件について深くお詫び申し上げるとともに、問題不備を指摘してくださったチームCの皆様にお礼申し上げます。
