---
title: "ICTSC2024 二次予選 問題解説: [MYS] DNSって難しい。"
description: "ICTSC2024 二次予選 問題解説: DNSって難しい。"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/mys"
draft: false
renderer: "md"
sticky: false
---

# 問題文

あなたは、若手社員にキャッシュDNSサーバの更改を依頼し、検証環境でテストするよう指示しました。

* 要件
  * ミドルウェアは unbound で構築すること。
  * DNSSECを実装すること。
  * Public DNSへ再帰問い合わせができること。
  * 上記テストのため、server1はInternetに接続すること。しっかりパケットフィルタすること。
  * 検証リソースが限られているため、最小限の構成で組むこと。

* 構成図
![](/images/2024-pre-round-2nd/mys.png)

無事、検証環境の構築が終わったようなのですが、若手社員が困っているようです。
話を聞いてみると、テストを実施したようですが、上手く動かないところがあるそうです。

* テスト内容・結果
  * 試しにインターネット（yahoo.co.jp、google.co.jp）へpingしてみたが、応答が返ってこない。
  * 上記のFQDNを、構築したDNSサーバに問い合わせしてみたが、応答がすごく遅く、大体がエラーとなる。

先輩として、サクッと問題解消してカッコイイところを見せてあげましょう。


## 前提条件

* PC1の設定を変更してはいけない。
* server1の/etc/hosts, unboundの設定を変更してはいけない。
* server1のパケットフィルターに対し、必要以上の設定変更を行ってはいけない。

## 初期状態

* PCから `yahoo.co.jp` 宛てへpingしたが応答がない

```
user@PC1:~$ ping yahoo.co.jp
ping: yahoo.co.jp: Name or service not known
```

## 終了状態

* PCから `yahoo.co.jp` をDNS問い合わせすることができる

```
user@PC1:~$ dig yahoo.co.jp

; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> yahoo.co.jp
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 4121
;; flags: qr rd ra; QUERY: 1, ANSWER: 14, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 65494
;; QUESTION SECTION:
;yahoo.co.jp.                   IN      A

;; ANSWER SECTION:
yahoo.co.jp.            299     IN      A       182.22.25.124
yahoo.co.jp.            299     IN      A       183.79.249.124
yahoo.co.jp.            299     IN      A       182.22.31.124
～（中略）～

;; Query time: 3343 msec
;; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)
;; WHEN: Sun Nov 03 22:35:22 JST 2024
;; MSG SIZE  rcvd: 264

```

* PCから `yahoo.co.jp` 宛てへのping疎通が確認できる。

```
user@PC1:~$ ping yahoo.co.jp
PING yahoo.co.jp (182.22.25.252) 56(84) bytes of data.
64 bytes from 182.22.25.252: icmp_seq=1 ttl=56 time=1.50 ms
64 bytes from 182.22.25.252: icmp_seq=2 ttl=56 time=0.937 ms
64 bytes from 182.22.25.252: icmp_seq=3 ttl=56 time=1.01 ms
64 bytes from 182.22.25.252: icmp_seq=4 ttl=56 time=1.27 ms
64 bytes from 182.22.25.252: icmp_seq=5 ttl=56 time=1.08 ms
^C
--- yahoo.co.jp ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 10496ms
rtt min/avg/max/mdev = 0.937/1.159/1.495/0.201 ms
```

# 解説

DNSSEC実装によりDNSメッセージサイズが増加する傾向にあります。
メッセージサイズ増加により、「512の壁」と呼ばれる問題が顕著化し、その対処方法として以下２つがあります。

- TCPフォールバック
- EDNS0

本問題では意図的にEDNS上限サイズを512byteに制限してあり、TCPフォールバックを引き起こすよう構築されております。
TCPフォールバックでは TCP:53 で通信できる必要がありますが、通信要件として拾いきれずiptablesの許可しなかった、というシチュエーションです。
大きいサイズのメッセージがやりとりできないため、問い合わせに時間がかかったり、問い合わせ先によっては問い合わせ不可に陥るケースとなりました。

## 模範解答

iptables で TCPフォールバックに利用する、宛先ポートTCP 53 を開放する。

```
ictsc@server1:~$ sudo iptables -I OUTPUT 7 -p tcp --dport 53 -j ACCEPT
ictsc@server1:~$
ictsc@server1:~$ sudo iptables -L -v --line-numbers
sudo iptables -L -v --line-numbers

Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1      186 32599 ACCEPT     icmp --  any    any     anywhere             anywhere
2    37474 3125K ACCEPT     all  --  any    any     192.168.255.52       anywhere
3    20758 1584K ACCEPT     all  --  lo     any     anywhere             anywhere
4    23899 1976K ACCEPT     all  --  any    any     anywhere             anywhere             state RELATED,ESTABLISHED
5        0     0 ACCEPT     udp  --  any    any     anywhere             anywhere             udp dpt:domain
6        3   180 ACCEPT     tcp  --  any    any     anywhere             anywhere             tcp dpt:ssh
7    18968 6222K DROP       all  --  any    any     anywhere             anywhere

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
num   pkts bytes target     prot opt in     out     source               destination
1      704  122K ACCEPT     icmp --  any    any     anywhere             anywhere
2    35689 3083K ACCEPT     all  --  any    any     anywhere             192.168.255.52
3    20758 1584K ACCEPT     all  --  any    lo      anywhere             anywhere
4        0     0 ACCEPT     tcp  --  any    any     anywhere             anywhere             tcp dpt:ssh
5        0     0 ACCEPT     udp  --  any    any     anywhere             anywhere             udp spt:domain
6    11023  709K ACCEPT     udp  --  any    any     anywhere             anywhere             udp dpt:domain
7       88  5859 ACCEPT     tcp  --  any    any     anywhere             anywhere             tcp dpt:domain　★
8     2141  163K ACCEPT     udp  --  any    any     anywhere             anywhere             udp dpt:ntp
9    11399 1036K ACCEPT     all  --  any    any     anywhere             anywhere             state RELATED,ESTABLISHED
10   15109  927K DROP       all  --  any    any     anywhere             anywhere
ictsc@server1:~$
```
