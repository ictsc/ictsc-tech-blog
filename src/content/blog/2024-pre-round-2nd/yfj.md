---
title: "ICTSC2024 二次予選 問題解説: [YFJ] どちらのプロトコルも30年選手"
description: "ICTSC2024 二次予選 問題解説: どちらのプロトコルも30年選手"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/yfj"
draft: false
renderer: "md"
sticky: false
---

# 問題文

![](/images/2024-pre-round-2nd/yfj.png)

あなたは、職場の同僚のエンジニアから構築中のシステムでヘルプを依頼をされました。
ヘルプ内容は、新たにフルサービスリゾルバー（キャッシュDNSサーバー）と権威DNSサーバーを構築し、
また、それらのサーバーを接続するルーターも構築しましたが、うまく動作しないとのこと。
以下のトラブルに対応してください。

### トラブル1
Router01をRouter02とeBGP接続して、経路交換をしようとしています。
しかしBGPのstatusはEstablished状態ですが、経路の交換ができず、Server01からServer02へpingなど接続性がない状態です。
Router01へログインし設定を見直してServer01からServer02へpingを飛ぶ状態にしてください。

なお、Router01およびRouter02ではBGP接続にFrroutingを利用しており、以下のコマンドでcliに入りconfigが確認ができます。

```
$ sudo vtysh

Hello, this is FRRouting (version 10.1.1).
Copyright 1996-2005 Kunihiro Ishiguro, et al.

Router01# show running-config
....
```

問題点を修正し経路交換できるようになったら、Server01からServer02へpingが通ることを確認しましょう。
```
# Server01
$ ping -c 3 192.168.60.18
```

### トラブル2
トラブル1にてServer01からServer02へpingが通るようになりましたが、
今度はServer01のフルサービスリゾルバーからictsc2024-2.internalのドメイン名の名前解決できないと問い合わせが入りました。
名前解決が可能なictsc2024-1.internalと比較しながらサーバーの問題を見つけて修正し、名前解決ができるようにしましょう。

名前解決はServer01から以下のコマンドで確認できます。
```
# Server01(名前解決不可ドメイン名)
$ dig @127.0.0.1 ictsc2024-2.internal
```
```
# Server01(名前解決可能ドメイン名)
$ dig @127.0.0.1 ictsc2024-1.internal
```

また、Serve01のフルサービスリゾルバー（キャッシュDNSサーバー）はunboundで構築されており、
Server02の権威DNSサーバーはNSDで構築されています。

以下にそれぞれのconfigファイルがあります。
※制限事項にあるように、以下のconfigファイルやzoneファイルは参照のみで設定変更してはいけません。
```
# Serve01
/etc/unbound/unbound.conf.d/unbound.conf
```
```
# Server02
/etc/nsd/nsd.conf.d/nsd.conf
```


## 前提条件

* 各Server/RouterのIPアドレス変更をしてはいけない。
* Router01でStatic Routeの設定はしてはいけない。
* Router02の設定変更をしてはいけない。
* Server01/Server02のDNS設定(unbound.conf, nsd.conf, zone設定)を変更してはいけない。

## 初期状態

### トラブル1
Server01からServer02へpingが届かない状態。
```
$ ping -c 3 192.168.60.18
PING 192.168.60.18 (192.168.60.18) 56(84) bytes of data.

--- 192.168.60.18 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2057ms
```

また、Router01とRourter02は、BGPステータスはEstablishedで確率しているのに、経路が広報できないし経路は受信していない状態。
```
$ sudo vtysh

Hello, this is FRRouting (version 10.1.1).
Copyright 1996-2005 Kunihiro Ishiguro, et al.

Router01# show bgp summary

IPv4 Unicast Summary:
BGP router identifier 1.1.1.1, local AS number 65001 VRF default vrf-id 0
BGP table version 1
RIB entries 3, using 384 bytes of memory
Peers 1, using 24 KiB of memory
Peer groups 1, using 64 bytes of memory

Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
192.168.60.10   4      65002      9918      9917        1    0    0 6d21h14m     (Policy) (Policy) Router02

Total number of neighbors 1
```

### トラブル2
ictsc2024-2.internalのドメイン名にて、digコマンドでDNSの名前解決ができない状態。
```
dig @127.0.0.1 ictsc2024-2.internal

; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> +dnssec @127.0.0.1 ictsc2024-2.internal
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: XXXX
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags: do; udp: 1232
;; QUESTION SECTION:
;ictsc2024-2.internal.		IN	A

;; Query time: XX msec
;; SERVER: 127.0.0.1#53(127.0.0.1) (UDP)
;; WHEN: XXX XXX XX XX:XX:XX JST 2024
;; MSG SIZE  rcvd: 49
```

## 終了状態

### トラブル1
Server01からServer02へpingが通る。
またBGPでRouter01にてRouter02から経路をうけとれている。

```
$ ping -c 3 192.168.60.18
PING 192.168.60.18 (192.168.60.18) 56(84) bytes of data.
From 192.168.60.1: icmp_seq=1 Redirect Host(New nexthop: 192.168.60.10)
64 bytes from 192.168.60.18: icmp_seq=1 ttl=62 time=0.749 ms
\From 192.168.60.1: icmp_seq=2 Redirect Host(New nexthop: 192.168.60.10)
64 bytes from 192.168.60.18: icmp_seq=2 ttl=62 time=0.870 ms
From 192.168.60.1: icmp_seq=3 Redirect Host(New nexthop: 192.168.60.10)
64 bytes from 192.168.60.18: icmp_seq=3 ttl=62 time=0.719 ms

--- 192.168.60.18 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time XXms
rtt min/avg/max/mdev = 0.719/0.779/0.870/0.065 ms
```

```
Router01# show bgp summary

IPv4 Unicast Summary:
BGP router identifier 1.1.1.1, local AS number 65001 VRF default vrf-id 0
BGP table version 2
RIB entries 3, using 384 bytes of memory
Peers 1, using 24 KiB of memory
Peer groups 1, using 64 bytes of memory

Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
192.168.60.10   4      65002         4         4        2    0    0 00:00:05            1        1 Router02

Total number of neighbors 1
```

### トラブル2
Server01にてlocalhostへ向けてdigコマンドでictsc2024-2.internalのDNSの名前解決ができる。
```
dig @127.0.0.1 ictsc2024-2.internal

; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> @127.0.0.1 ictsc2024-2.internal
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: XXXXX
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;ictsc2024-2.internal.		IN	A

;; ANSWER SECTION:
ictsc2024-2.internal.	30	IN	A	192.168.2.1

;; Query time: XX msec
;; SERVER: 127.0.0.1#53(127.0.0.1) (UDP)
;; WHEN: XXX XXX XX XX:XX:XX JST 2024
;; MSG SIZE  rcvd: 65
```

### 解説

## トラブル1
### 解決法
Router02のFRRoutingの設定に、route-mapを入れるか、`no bgp ebgp-requires-policy`を入れる。

### 詳細解説
FRRoutingではRFC8212(Default External BGP (EBGP) Route Propagation Behavior without Policies)がデフォルトで有効であり([公式のFRRouting Docsリンク](https://docs.frrouting.org/en/latest/bgp.html#clicmd-bgp-ebgp-requires-policy))、In/Outのpolicyを設定してあげないとeBGPでの経路を広報/受信しません。
Router02では、きちんとroute-mapの設定が入っているので、それを参考にRouter01でも設定する。もしくはRFC8212を無効にする```no bgp ebgp-requires-policy```の設定を入れることで、経路の送受信が可能になります。
VyOSなど他のOSに慣れていると一瞬困惑する部分ですので作問してみました。

### 回答例
Rrouter02を参考にRouter01に設定を入れます。
```
# Router01
$ sudo vtysh
Router01# configure
ip prefix-list A65001-PREFIX seq 1 permit 192.168.60.0/29
ip prefix-list A65002-PREFIX seq 1 permit 192.168.60.16/29
route-map RMAP-IN permit 1
 match ip address prefix-list A65002-PREFIX
exit
route-map RMAP-OUT permit 1
 match ip address prefix-list A65001-PREFIX
exit
router bgp 65001
 address-family ipv4 unicast
  neighbor Router02 route-map RMAP-IN in
  neighbor Router02 route-map RMAP-OUT out
end

copy run start
```

`no bgp ebgp-requires-policy`を設定する場合
```
# Router01
$ sudo vtysh
Router01# configure
router bgp 65001
no bgp ebgp-requires-policy
end

copy run start
```

## トラブル2
### 解決法
Server01のサーバーの時刻を修正する。

### 詳細解説
Server01の時刻がずれており、DNSSEC検証でNGとなり名前解決ができなくなっています。
問題を見つけるには、DNSのデバックコマンドであるdigに+dnssecと+cdオプションをつけると、RRSIGレコードの証明の有効期間が`2024/11/24 - 2024/12/24`であることが確認できます。
さらにdateコマンドなのでサーバーの日付を確認すると2024/11/07とずれた日時となっており署名の有効期限外であることに気づくことができます。(RRISGのフォーマットについては、[こちらのJPRSさんのサイトにてわかりやすく解説されています](https://jprs.jp/glossary/index.php?ID=0224))

```
# Server01
$ dig +dnssec +cd @127.0.0.1 ictsc2024-2.internal
...(snip)...
;; ANSWER SECTION:
ictsc2024-2.internal.	30	IN	A	192.168.2.1
ictsc2024-2.internal.	30	IN	RRSIG	A 8 2 30 20241224000000 20241124000000 17958 ictsc2024-2.internal. RLZ8q8fDWKzGOwcBCqR+NLjtfa6gGdfPi/i8fMheTVSukDegey/V8v+y P4qbVWa88rCzKVgKemq64FCu04UTxb8ADh1Dnxe4ahAachjoYZHOJFI+ I/U0IJi7OkAKFY8rvsbPJ0rmaHxQ3R78iMSS4mpt40wSejCrqbEepeKw sU+0TAs0DxDPmGl8bvznMIzJAxRR3DMW/IOlGGYjWKF2bZPf7J0hlTKi rUTp0sq9BwO+oNjjy24IAzwb9RDAMBFvu3Cjv/SrozsmoGDQC1Rfjn+x t2yzm1gu6tJNnJ6VRk5vk6TkxwfCKPUGo6OxrDz1lgqFSWqpWT+kppSk /oQNHw==
...(snip)...

$ date
Sat Dec  7 12:MM:SS PM JST 2024
```

また、問題内で名前解決の比較に用意している`ictsc2024-1.internal`のドメイン名のRRSIGレコードの証明の有効期間は、`2024/11/01 - 2024/12/24`なので初期状態でも名前解決は可能でした。
ですので、Server01の日時を修正すれば、`ictsc2024-２.internal`のドメイン名の名前解決が可能になります。
作問の意図としては、時刻のズレというものクリティカルなトラブルを起こし得るというものでした。

### 回答例
Server01のNTPを有効にし、NTPのデーモンであるchronydを起動し時刻を修正する。
```
# Server01
$ sudo timedatectl set-ntp yes
$ sudo systemctl start chronyd
```
もしくはdate,timedatectlコマンドで日時を直接設定し時刻を設定する。
```
# Server01
$ timedatectl set-time "2024-12-07 13:10:00"
$ date --set "2024-12-07 13:10:00"
```
