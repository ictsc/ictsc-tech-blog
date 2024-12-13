---
title: "ICTSC2024 二次予選 問題解説: [KOB] VyOS初めてです。"
description: "ICTSC2024 二次予選 問題解説: VyOS初めてです。"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/kob"
draft: false
renderer: "md"
sticky: false
---

# 問題文

たかし君ははじめてVyOSを触ります。

先輩に「図のようにVyOSを繋いで、このコンフィグを入れれば、vyos2とvyos3がvyos1を経由して通信できるよ」と言われコンフィグを渡されました。

![](/images/2024-pre-round-2nd/kob.jpeg)

@vyos1
```
set interfaces ethernet eth1 address '10.10.2.1/24'
set interfaces ethernet eth2 address '10.10.3.1/24'
set protocols ospf area 0 network '10.10.2.0/24'
set protocols ospf area 0 network '10.10.3.0/24'
set protocols ospf parameters router-id '192.168.255.31'
```

@vyos2
```
set interfaces ethernet eth1 address '10.10.2.2/24'
set protocols ospf area 0 network '10.10.2.0/24'
set protocols ospf parameters router-id '192.168.255.32'
```


@vyos3
```
set interfaces ethernet eth1 address '10.10.3.3/24'
set protocols ospf area 0 network '10.10.3.0/24'
set protocols ospf parameters router-id '192.168.255.33'
```

とコンフィグを教えてもらいました。

たかし君は言われた通り図のようにVyOSを繋げコンフィグを投入しましたが、vyos2からvyos3へpingが届きません。

VyOSを初めて触るたかし君を助けてください。

## 前提条件

vyos1, vyos2, vyos3 どれでも設定を変えて良い。



## 初期状態

vyos2 <------> vyos3
でpingが繋がらない。

## 終了状態
vyos2 <------> vyos3
でpingが繋がる。

```
ictsc@vyos02:~$ traceroute 10.10.3.3
traceroute to 10.10.3.3 (10.10.3.3), 30 hops max, 60 byte packets
 1  10.10.2.1 (10.10.2.1)  0.352 ms  0.335 ms  0.344 ms
 2  10.10.3.3 (10.10.3.3)  0.710 ms * *
```


```
ictsc@vyos03:~$ traceroute 10.10.2.2
traceroute to 10.10.2.2 (10.10.2.2), 30 hops max, 60 byte packets
 1  10.10.3.1 (10.10.3.1)  0.796 ms  0.796 ms  0.766 ms
 2  10.10.2.2 (10.10.2.2)  1.254 ms * *
```

VyOS2から10.10.3.0/24宛の経路をOSPFで受け取っている

```
user@vyos02:~$ show ip route 10.10.3.0/24
Routing entry for 10.10.3.0/24
  Known via "ospf", distance 110, metric 2, best
  Last update 00:00:38 ago
  * 10.10.2.1, via eth1, weight 1
```

# 解説

## 概要
IPアドレスが間違ってついていることにtcpdump, ARPで気づく問題。

## トラブルの原因
A-> B,CにPing打ちたいが、BのA側とC側のIPアドレスがインターフェイス逆に付いている。

## 模範解答・解説

vyos1のアドレスが逆になっている。
10.10.2.1. 10.10.3.1 を逆にすれば良い。

```
[edit]
user@vyos01:~$ set interfaces ethernet eth1 address 10.10.3.1/24
[edit]
user@vyos01:~$ set interfaces ethernet eth2 address 10.10.2.1/24
[edit]
user@vyos01:~$ delete interfaces ethernet eth1 address 10.10.2.1/24
[edit]
user@vyos01:~$ delete interfaces ethernet eth2 address 10.10.3.1/24
[edit]
user@vyos01:~$ commit
```


vyos2 --- vyos3 へ pingが成功すれば　得点。


vyos2でOSPFで10.10.3.0/24への経路を所得できていることを確認。
```
user@vyos02:~$ show ip ospf route
============ OSPF network routing table ============
N    10.10.2.0/24          [1] area: 0.0.0.0
                           directly attached to eth1
N    10.10.3.0/24          [2] area: 0.0.0.0
                           via 10.10.2.1, eth1

============ OSPF router routing table =============

============ OSPF external routing table ===========
```


## 解答例

この問題ではvyos1のインターフェイス設定が入れ違って登録されていた為トラブルが発生したと考えられました。
そのため、以下のように設定を変更し、vyos2とvyos3のpingが正しく疎通することを確認いたしました。


原因究明

この問題では各機器でshow arpを実行したところ、vyos1では無出力、vyos2とvyos3ではFAILEDでした。ただし、show interfaceやip a sコマンド等で物理ケーブルが破損しているとは考えられませんでした。
そのため、間違ったipアドレスが設定されていたことが原因だと考えました。

解決

vyos1のeth1,eth2のアドレス設定を入れ替えました。
```
delete interfaces ethernet eth1 address '10.10.2.1/24'
delete interfaces ethernet eth2 address '10.10.3.1/24'
set interfaces ethernet eth1 address '10.10.3.1/24'
set interfaces ethernet eth2 address '10.10.2.1/24'
```
