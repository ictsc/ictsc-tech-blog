---
title: "ICTSC2023 本戦 問題解説: [TGY] 経路がおかしい"
description: "ICTSC2023 本戦 問題解説: 経路がおかしい"
tags: [ICTSC2023, 問題解説, ネットワーク関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/tgy"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

あなたは、VyOS01の管理者です。  
VyOS02とVyOS03はBGPピアとして接続され、経路制御を行っています。
ある日、VyOS03のネットワーク(`172.16.3.1`)に(`172.16.1.1`)からtracerouteをしたところ、VyOS02を経由して到達していることが分かりました。  

VyOS02, VyOS03ともに迂回しない経路に変更してください。


また再起動しても、終了状態が維持されるようにしてください。

## ネットワーク図

三つのルータの関係は以下の通りである。
![](/images/2023-final-round/tgy01.png)


## 前提条件

- `vyos02`, `vyos03`の設定をいじることはできない
- `vyos01`で適切な設定を行うことで本トラブルは解決する
- 問題回答者は`vyos01`のみ操作可能

## 制約

- スタティックルートを新たに設定してはならない

## 初期状態

- すべてのアドレスにpingによる通信が可能
- vyos01から172.16.1.1を送信元アドレスとして`traceroute 172.16.3.1 source-address 172.16.1.1`を実行した場合、`vyos01 → vyos02 → vyos03`の経路が選択される
```
user@vyos:~$ traceroute 172.16.3.1 source-address 172.16.1.1
traceroute to 172.16.3.1 (172.16.3.1), 30 hops max, 60 byte packets
 1  10.1.48.2 (10.1.48.2)  0.469 ms  0.444 ms  0.443 ms
 2  172.16.3.1 (172.16.3.1)  0.972 ms  0.927 ms  0.885 ms
```

```
user@vyos:~$ traceroute 172.16.2.1 source-address 172.16.1.1
traceroute to 172.16.2.1 (172.16.2.1), 30 hops max, 60 byte packets
 1  172.16.2.1 (172.16.2.1)  0.439 ms  0.398 ms  0.402 ms
user@vyos:~$
```
## 終了状態

- `172.16.2.0/24`のネクストホップが`10.1.48.2`であること
- `172.16.3.0/24`のネクストホップが`10.1.49.3`であること
- よって、vyos02から`traceroute 172.16.3.1 source-address 172.16.1.1`を実行した場合、`vyos01 → vyos03`の経路が選択されるようになる
```
user@vyos:~$ traceroute 172.16.3.1 source-address 172.16.1.1
traceroute to 172.16.3.1 (172.16.3.1), 30 hops max, 60 byte packets
 1  172.16.3.1 (172.16.3.1)  0.457 ms  0.446 ms  0.440 ms
```
- 再起動しても、終了状態が維持される。

## vyos01の初期状態

```
user@vyos:~$ show configuration commands
set interfaces dummy dum0 address '172.16.1.1/24'
set interfaces ethernet eth0 address 'dhcp'
set interfaces ethernet eth0 address '192.168.17.1/24'
set interfaces ethernet eth1 address '10.1.49.1/24'
set interfaces ethernet eth2 address '10.1.48.1/24'
set interfaces loopback lo
set policy community-list COMMUNITY-ACCEPT rule 10 action 'permit'
set policy community-list COMMUNITY-ACCEPT rule 10 regex '65002:2023|65003:2023'
set policy prefix-list ADVERTISE-NETWORK rule 10 action 'permit'
set policy prefix-list ADVERTISE-NETWORK rule 10 prefix '172.16.1.0/24'
set policy route-map ADVERTISE-POLICY rule 10 action 'permit'
set policy route-map ADVERTISE-POLICY rule 10 match ip address prefix-list 'ADVERTISE-NETWORK'
set policy route-map IMPORT-POLICY rule 10 action 'permit'
set policy route-map IMPORT-POLICY rule 10 match community community-list 'COMMUNITY-ACCEPT'
set policy route-map IMPORT-POLICY rule 20 action 'deny'
set protocols bgp address-family ipv4-unicast network 172.16.1.0/24
set protocols bgp neighbor 10.1.48.2 address-family ipv4-unicast route-map export 'ADVERTISE-POLICY'
set protocols bgp neighbor 10.1.48.2 address-family ipv4-unicast route-map import 'IMPORT-POLICY'
set protocols bgp neighbor 10.1.48.2 remote-as '65002'
set protocols bgp neighbor 10.1.49.3 address-family ipv4-unicast route-map export 'ADVERTISE-POLICY'
set protocols bgp neighbor 10.1.49.3 address-family ipv4-unicast route-map import 'IMPORT-POLICY'
set protocols bgp neighbor 10.1.49.3 remote-as '65003'
set protocols bgp parameters router-id '192.168.17.1'
set protocols bgp system-as '65001'
set protocols static route 0.0.0.0/0 next-hop 192.168.17.254
```
```
user@vyos:~$ show ip route
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

S>* 0.0.0.0/0 [1/0] via 192.168.17.254, eth0, weight 1, 00:05:24
C>* 10.1.48.0/24 is directly connected, eth2, 00:05:27
C>* 10.1.49.0/24 is directly connected, eth1, 00:05:27
C>* 172.16.1.0/24 is directly connected, dum0, 00:05:28
B>* 172.16.2.0/24 [20/0] via 10.1.48.2, eth2, weight 1, 00:05:20
B>* 172.16.3.0/24 [20/0] via 10.1.48.2, eth2, weight 1, 00:05:20
C>* 192.168.17.0/24 is directly connected, eth0, 00:05:27
```

```
user@vyos:~$ show ip bgp summary

IPv4 Unicast Summary (VRF default):
BGP router identifier 192.168.17.1, local AS number 65001 vrf-id 0
BGP table version 3
RIB entries 5, using 480 bytes of memory
Peers 2, using 40 KiB of memory

Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
10.1.48.2       4      65002        12        11        3    0    0 00:06:06            2        1 N/A
10.1.49.3       4      65003        12        10        3    0    0 00:06:07            1        1 N/A

Total number of neighbors 2
```

---

## 解説

受信している経路を確認しようとためすと
```
user@vyos:~$ show bgp ipv4 neighbors 10.1.48.2 received-routes
% Inbound soft reconfiguration not enabled
```
soft reconf が enable である必要があるので，下記の通り vyos2，vyos3 両 nei に対して有効化する。

```

user@vyos# set protocols bgp neighbor 10.1.48.2 address-family ipv4-unicast soft-reconfiguration inbound
[edit]
user@vyos# set protocols bgp neighbor 10.1.49.3 address-family ipv4-unicast soft-reconfiguration inbound
[edit]
user@vyos# commi
```

再度受信経路を確認すると
```
user@vyos:~$ show ip bgp neighbors 10.1.48.2 received-routes
BGP table version is 3, local router ID is 192.168.17.1, vrf id 0
Default local pref 100, local AS 65001
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

    Network          Next Hop            Metric LocPrf Weight Path
 *> 172.16.1.0/24    10.1.48.2                              0 65002 65001 i
 *> 172.16.2.0/24    10.1.48.2                0             0 65002 i
 *> 172.16.3.0/24    10.1.48.2                              0 65002 65003 i

Total number of prefixes 3
```

```
user@vyos:~$ show ip bgp neighbors 10.1.49.3 received-routes
BGP table version is 3, local router ID is 192.168.17.1, vrf id 0
Default local pref 100, local AS 65001
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

    Network          Next Hop            Metric LocPrf Weight Path
 *> 172.16.1.0/24    10.1.49.3                              0 65003 65003 65003 65001 i
 *> 172.16.2.0/24    10.1.49.3                              0 65003 65003 65003 65002 i
 *> 172.16.3.0/24    10.1.49.3                0             0 65003 65003 65003 i

Total number of prefixes 3 (2 filtered)
```


172.16.3.0/24 宛の経路を vyos3 は広告しているが、コミュニティ値がvyos1でのCOMMUNITY-ACCEPTの設定
```
set policy community-list COMMUNITY-ACCEPT rule 10 regex '65002:2023|65003:2023'
```
と一致していないため、dropされていることがわかります。

全ての経路をそのまま受け取るように設定します。

解答例1
```
delete protocols bgp neighbor 10.1.49.3 address-family ipv4-unicast route-map import IMPORT-POLICY
```

解答例2
```
set policy route-map IMPORT-POLICY rule 20 action permit
```



この変更により経路を受け取ることができるようになります。
しかしvyos3 は全ての広告する経路について as-path-prepend を適用しているため，as-path に対するルールにより vyos2 からの経路が選択されています。
```
user@vyos:~$ show ip bgp
BGP table version is 3, local router ID is 192.168.17.1, vrf id 0
Default local pref 100, local AS 65001
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

    Network          Next Hop            Metric LocPrf Weight Path
 *> 172.16.1.0/24    0.0.0.0                  0         32768 i
 *  172.16.2.0/24    10.1.49.3                              0 65003 65003 65003 65002 i
 *>                  10.1.48.2                0             0 65002 i
 *  172.16.3.0/24    10.1.49.3                0             0 65003 65003 65003 i
 *>                  10.1.48.2                              0 65002 65003 i
```

これを解消するために、vyos1でlocal-preferenceを設定して、172.16.3.0/24の経路については10.1.49.3を選択するようにします。
vyosのLOCAL_PREFのデフォルト値は100であり値が大きい方が優先されます。


最後に設定を適用させセーブします。
```
commit
save
```

## 採点基準

終了条件を満たしている +100点
報告書の内容が不十分　-10点

## 講評

[ICTSC2023 予選 問題解説: 経路がおかしい](https://ictsc2023pr.ictsc-tech-blog.pages.dev/2023/12/22/ictsc2023pr/dif/)
と後半の解き方が全く一緒なので経路がdropされているということに気付き直せることができれば簡単だったのではないでしょうか？

2日目の回答が少なかったため、BGP知っている人にはとても簡単な問題だが、ネットワーク問を解けない人は早々に諦めてしまう問題だったように感じました。
