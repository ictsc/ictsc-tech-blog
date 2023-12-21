---
title: "ICTSC2023 予選 問題解説: [DIF] 経路がおかしい"
description: "ICTSC2023 予選 問題解説: 経路がおかしい"
tags: [ICTSC2023,ネットワーク関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ictsc2023pr/dif"
draft: false
renderer: "md"
sticky: false
---

ICTSC2023 予選 問題解説: 経路がおかしい

# 問題文

## 概要

あなたは、VyOS02の管理者です。  
VyOS01とVyOS03はBGPピアとして接続され、経路制御を行っています。
ある日、VyOS01のネットワーク(`172.16.1.1`)にtracerouteをしたところ、VyOS03を経由して到達していることが分かりました。  

そのため、VyOS01, VyOS03ともに迂回しない経路に変更してください。

## ネットワーク図

![](/images/2023-pre-round/dif01.jpeg)

## 前提条件

- `vyos01`, `vyos03`の設定は正しく行われている
- `vyos02`で適切な設定を行うことで本トラブルは解決する
- 問題回答者は`vyos02`のみ操作可能

## 制約

- 以下の情報は既存の設定に従う
  - BGPで広報する経路
  - BGPで受信する経路
- スタティックルートを新たに設定してはならない
- ネットワークを制御するプロトコルの一部または全ての機能を無効化してはいけない
- 再起動しても、終了状態が維持される

## 初期状態

- すべてのアドレスにpingによる通信が可能
- vyos02から`ping 172.16.1.1`を実行した場合、`vyos02 → vyos03 → vyos01`の経路が選択される

## 終了状態

- `172.16.1.0/24`のネクストホップが`10.10.1.1`であること
- `172.16.3.0/24`のネクストホップが`10.10.3.3`であること
- よって、vyos02から`ping 172.16.1.1`を実行した場合、`vyos02 → vyos01`の経路が選択されるようになる

# 解説

## 原因

この問題は、以下２点の原因により問題が発生しています。

- BFDによるBGPセッションのクローズ
- vyos01から流れてくるAS_PATHが長いため意図した経路が選択されない

これらの原因は以下に記すコマンド結果により確認することができます。

#### BFDによるBGPセッションのクローズ

BFDピア（10.10.1.1）のステータスを確認すると、`Status: down`または`Status: init`となっていることが分かります。

```
user@vyos02:~$ show bfd peer 10.10.1.1 
        peer 10.10.1.1 vrf default
                ID: 2741573152
                Remote ID: 314746771
                Active mode
                Status: down
                Downtime: 0 second(s)
                Diagnostics: neighbor signaled session down
                Remote diagnostics: ok
                Peer Type: configured
                RTT min/avg/max: 0/0/0 usec
                Local timers:
                        Detect-multiplier: 2
                        Receive interval: 10ms
                        Transmission interval: 10ms
                        Echo receive interval: 10ms
                        Echo transmission interval: 10ms
                Remote timers:
                        Detect-multiplier: 2
                        Receive interval: 10ms
                        Transmission interval: 10ms
                        Echo receive interval: 10ms
```

### vyos01から流れてくるAS_PATHが長いため意図した経路が選択されない

「BFDによるBGPセッションのクローズ」を解消したのちルーティングテーブルを確認するとBGPによって`172.16.1.1`のネクストホップが`10.10.3.3`となっていることが分かります。

```
user@vyos02:~$ show ip route
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

C>* 10.10.1.0/24 is directly connected, eth1, 00:18:44
C>* 10.10.3.0/24 is directly connected, eth2, 00:18:45
B>* 172.16.1.0/24 [20/0] via 10.10.3.3, eth2, weight 1, 00:08:39
C>* 172.16.2.0/24 is directly connected, dum0, 00:18:45
B>* 172.16.3.0/24 [20/0] via 10.10.3.3, eth2, weight 1, 00:08:39
S>* 192.168.100.0/24 [1/0] via 192.168.255.254, eth0, weight 1, 00:18:42
C>* 192.168.255.0/24 is directly connected, eth0, 00:18:45
```

## 解決方法

### BFDによるBGPセッションクローズの解決

`vyos01 ~ vyos02`間で`45ms ~ 65ms`の遅延が発生しています。  
この遅延により対向のBFDピアからのBFDパケットを一定期間以内に受信することができず、その結果として`vyos01 ~ vyos02`間でBGPセッションがクローズしています。  
BFDパケットの送信間隔は「自身の最小送信間隔」と「対向の最小受信間隔」と比較して値の大きい方が適用されます。  
そのため、最低限BFDパケットの「受信間隔」と「エコー送信間隔」の数値を大きくすることでBGPセッションが開始されます。

```diff
- set protocols bfd peer 10.10.1.1 interval echo-interval 10
set protocols bfd peer 10.10.1.1 interval multiplier 2
- set protocols bfd peer 10.10.1.1 interval receive 10
set protocols bfd peer 10.10.1.1 interval transmit 10
+ set protocols bfd peer 10.10.1.1 interval echo-interval 100
+ set protocols bfd peer 10.10.1.1 interval receive 100
```

その後、設定を適用させます。

```
commit
```

### BGPベストパスの変更

BFDの課題を解決したとしてもネクストホップは変わりません。  
以下のコマンド結果から`172.16.1.0/24`へのネクストホップは`10.10.3.3`になることが分かります。

```
user@vyos02:~$ show ip bgp 
BGP table version is 17, local router ID is 192.168.255.62, vrf id 0
Default local pref 100, local AS 65002
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

    Network          Next Hop            Metric LocPrf Weight Path
 *  172.16.1.0/24    10.10.1.1                0             0 65001 65001 65001 i
 *>                  10.10.3.3                              0 65003 65001 i
 *> 172.16.2.0/24    0.0.0.0                  0         32768 i
 *  172.16.3.0/24    10.10.1.1                              0 65001 65001 65001 65003 i
 *>                  10.10.3.3                0             0 65003 i

Displayed  3 routes and 5 total paths
```

これはvyos02よりvyos01から貰っている経路の方がAS_PATHが長いためです。  
vyos01から貰っている経路をベストパスにする方法はいくつかありますがここではLOCAL_PREFを変更する方法を解説します。
  
vyosのLOCAL_PREFのデフォルト値は100であり値が大きい方が優先されます。  
なので以下のコマンドで200に設定します。

```
set policy prefix-list 172-16-1 rule 1 action permit
set policy prefix-list 172-16-1 rule 1 prefix 172.16.1.0/24
set policy route-map vyos01-localpref rule 1 action permit 
set policy route-map vyos01-localpref rule 1 set local-preference 200
set policy route-map vyos01-localpref rule 1 match ip address prefix-list 172-16-1
set protocols bgp neighbor 10.10.1.1 address-family ipv4-unicast route-map import vyos01-localpref
```

その後、設定を適用させセーブします。

```
commit
save
```

これらの設定を行うことによりネクストホップが`10.10.1.1`となります。

## 結果

以下のコマンドを実行することにより問題が解消されることが分かります。

BFDピア（10.10.1.1）のステータスを確認すると、`Status: up`となっていることが分かります。

```
user@vyos02:~$ show bfd peer 10.10.1.1 
        peer 10.10.1.1 vrf default
                ID: 2741573152
                Remote ID: 314746771
                Active mode
                Status: up
                Uptime: 17 second(s)
                Diagnostics: ok
                Remote diagnostics: ok
                Peer Type: configured
                RTT min/avg/max: 1000/49512/66092 usec
                Local timers:
                        Detect-multiplier: 2
                        Receive interval: 100ms
                        Transmission interval: 10ms
                        Echo receive interval: 100ms
                        Echo transmission interval: 100ms
                Remote timers:
                        Detect-multiplier: 2
                        Receive interval: 10ms
                        Transmission interval: 10ms
                        Echo receive interval: 10ms
```

ルーティングテーブルを確認すると、`172.16.1.0/24`ネットワークへのネクストホップが`10.10.1.1`に変更されていることが分かります。

```
user@vyos02:~$ show ip route
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

C>* 10.10.1.0/24 is directly connected, eth1, 00:28:01
C>* 10.10.3.0/24 is directly connected, eth2, 00:28:02
B>* 172.16.1.0/24 [20/0] via 10.10.1.1, eth1, weight 1, 00:00:56
C>* 172.16.2.0/24 is directly connected, dum0, 00:28:02
B>* 172.16.3.0/24 [20/0] via 10.10.1.1, eth1, weight 1, 00:00:56
S>* 192.168.100.0/24 [1/0] via 192.168.255.254, eth0, weight 1, 00:27:59
C>* 192.168.255.0/24 is directly connected, eth0, 00:28:02
```

## 採点基準

- BGPを用いない経路制御 or BFDの無効化：０点
- BFDによるBGPセッションクローズの解決：+10
- `172.16.1.0/24`のネクストホップが`10.10.1.1`である：+15
- `172.16.3.0/24`のネクストホップが`10.10.3.3`である：+20
- `save`を実行した旨の記述がある場合：+5
