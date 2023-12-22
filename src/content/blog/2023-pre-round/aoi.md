---
title: "ICTSC2023 予選 問題解説: [AOI] BGPがEstablishedにならない"
description: "ICTSC2023 予選 問題解説: BGPがEstablishedにならない"
tags: [ICTSC2023,ネットワーク関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ictsc2023pr/aoi"
draft: false
renderer: "md"
sticky: false
---

ICTSC2023 予選 問題解説: BGPがEstablishedにならない

# 問題文

## 概要

あなたはとある会社で勤務している社会人です。

あなたはあなたのチーム内のとある社員に対して、下記の課題を出していました。

- 「vyos00内に存在する既存のeBGPの設定をdefaultからVRF EBGP-AS65001に移行してほしい」

後日、課題を出していた社員から「BGPの設定変更は完了しているはずなのにeBGPが確立できない」と相談されました。

この問題を解決してあげてください。

vyos00のeBGPに使用する情報は以下となっています
| local as | remote as | local interface | local address | remote address |
| -------- | --------- | --------------- | ------------- | -------------- |
| 65000    | 65001     | dum0            | 1.1.1.1       | 2.2.2.2 |

## ネットワーク図

![](/images/2023-pre-round/aoi01.jpeg)

## 前提条件

- 特になし

## 制約

- vyos01の設定変更禁止
  - 設定確認等の目的でvyos01にログインしていただくのは問題ありません

## 初期状態

- vyos00の下記コマンド出力にて「Active」と表示されること
  - `show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state`

- 表示例

  ```
  user@vyos00:~$ show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state
    BGP state = Active
  ```

## 終了状態

- vyos00の下記コマンド出力にて「Established」と表示されること
  - `show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state`

- 表示例 ※xには0~9の数字が入ります。

  ```
  user@vyos00:~$ show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state
    BGP state = Established, up for xx:xx:xx
  ```

# 解説

## トラブルの原因

本問題では vyos00 の設定ミスにより、以下ふたつの理由からBGPの確立条件のひとつである BGP Peer 間で IP 到達性がないため、eBGPの確立が失敗しています。

- VRF（EBGP-AS65001） に Remote Peer 宛ての経路が存在しないこと
- VRF（EBGP-AS65001） に eBGP で使用する interface を所属させていないこと

本問題のネットワーク図は以下となります。
![vrf_network.jpg](/images/2023-pre-round/aoi01.jpeg)
初期設定だと以下のように vyos00 で VRF の経路情報に何も表示されていない状態になります。

```
user@vyos00:~$ show ip route vrf EBGP-AS65001
user@vyos00:~$
```

経路情報に何も登録がされていないので Local Peer のアドレス（1.1.1.1）からRemote Peer のアドレス（2.2.2.2）に対して疎通確認を行っても、以下のエラーメッセージが表示されます。

```
user@vyos00:~$ ping 2.2.2.2 vrf EBGP-AS65001 source-address 1.1.1.1
/bin/ping: bind: Cannot assign requested address
user@vyos00:~$
```

vyos00 および vyos01 それぞれの初期設定（抜粋）は以下となっていました。

vyos00の初期設定（抜粋）

```
user@vyos00:~$ show | commands
set interfaces dummy dum0 address '1.1.1.1/32'
set interfaces ethernet eth0 address '192.168.255.90/24'
set interfaces ethernet eth1 address '10.0.0.1/30'
set interfaces loopback lo
set protocols static route 2.2.2.2/32 next-hop 10.0.0.2 interface 'eth1'
set protocols static route 192.168.100.0/24 next-hop 192.168.255.254 interface 'eth0'
set service ssh
set system console device ttyS0 speed '115200'
set system host-name 'vyos00'
set system time-zone 'Asia/Tokyo'
set vrf name EBGP-AS65001 protocols bgp neighbor 2.2.2.2 address-family ipv4-unicast
set vrf name EBGP-AS65001 protocols bgp neighbor 2.2.2.2 ebgp-multihop '2'
set vrf name EBGP-AS65001 protocols bgp neighbor 2.2.2.2 remote-as '65001'
set vrf name EBGP-AS65001 protocols bgp neighbor 2.2.2.2 update-source '1.1.1.1'
set vrf name EBGP-AS65001 protocols bgp parameters router-id '1.1.1.1'
set vrf name EBGP-AS65001 protocols bgp system-as '65000'
set vrf name EBGP-AS65001 table '100'
[edit]
user@vyos00:~$
```

vyos01の初期設定（抜粋）

```
user@vyos01:~$ show | commands
set interfaces dummy dum0 address '2.2.2.2/32'
set interfaces ethernet eth0 address '192.168.255.91/24'
set interfaces ethernet eth1 address '10.0.0.2/30'
set interfaces loopback lo
set protocols bgp neighbor 1.1.1.1 address-family ipv4-unicast
set protocols bgp neighbor 1.1.1.1 ebgp-multihop '2'
set protocols bgp neighbor 1.1.1.1 remote-as '65000'
set protocols bgp neighbor 1.1.1.1 update-source '2.2.2.2'
set protocols bgp parameters router-id '2.2.2.2'
set protocols bgp system-as '65001'
set protocols static route 1.1.1.1/32 next-hop 10.0.0.1 interface 'eth1'
set protocols static route 192.168.100.0/24 next-hop 192.168.255.254 interface 'eth0'
set service ssh
set system console device ttyS0 speed '115200'
set system host-name 'vyos01'
set system time-zone 'Asia/Tokyo'
[edit]
user@vyos01:~$
```

## 原因の解決策

VRF に2つの IP 到達性を持たせる設定をすることでトラブルの解決となります。

- VRF（EBGP-AS65001）に対して Remote Peer 宛ての経路設定
- VRF（EBGP-AS65001）に対して interface を所属させる設定

以下は vyos00 に設定する回答例のひとつになります。
下記設定でInterface のアドレスおよび Remote Peer 宛ての経路が VRF に登録され、BGP Peer 間で IP 到達性を持てるため BGP の確立が成功します。

```
configure
delete protocol static route 2.2.2.2/32
set vrf name EBGP-AS65001 protocol static route 2.2.2.2/32 next-hop 10.0.0.2 interface eth1
set interface dummy dum0 vrf EBGP-AS65001
set interface ethernet eth1 vrf EBGP-AS65001
commit
save
exit
```

以下のeth1をVRFに所属させる設定が不足している回答が数件見られました。

その場合 Remote Peer 宛ての経路の nexthop 解決ができないため、

Remote Peer 宛ての経路が VRF に登録されず BGP の確立は失敗したままとなります。

```
set interface ethernet eth1 vrf EBGP-AS65001
```

## 解決後の状態確認コマンド・結果

解答例設定後の経路情報

```
user@vyos00:~$ show ip route vrf EBGP-AS65001
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

VRF EBGP-AS65001:
C>* 1.1.1.1/32 is directly connected, dum0, 00:00:33
S>* 2.2.2.2/32 [1/0] via 10.0.0.2, eth1, weight 1, 00:00:32
C>* 10.0.0.0/30 is directly connected, eth1, 00:00:33
user@vyos00:~$
```

解答例設定後の疎通確認

```
user@vyos00:~$ ping 2.2.2.2 vrf EBGP-AS65001 source-address 1.1.1.1
PING 2.2.2.2 (2.2.2.2) from 1.1.1.1 : 56(84) bytes of data.
64 bytes from 2.2.2.2: icmp_seq=1 ttl=64 time=0.281 ms
64 bytes from 2.2.2.2: icmp_seq=2 ttl=64 time=0.211 ms
64 bytes from 2.2.2.2: icmp_seq=3 ttl=64 time=0.216 ms
^C
--- 2.2.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2028ms
rtt min/avg/max/mdev = 0.211/0.236/0.281/0.031 ms
user@vyos00:~$
```

BGPの状態確認

```
user@vyos00:~$ show ip bgp vrf EBGP-AS65001 summary established

IPv4 Unicast Summary (VRF EBGP-AS65001):
BGP router identifier 1.1.1.1, local AS number 65000 vrf-id 5
BGP table version 0
RIB entries 0, using 0 bytes of memory
Peers 1, using 20 KiB of memory

Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
2.2.2.2         4      65001         3         3        0    0    0 00:00:17            0        0 N/A

Displayed neighbors 1
Total number of neighbors 1
user@vyos00:~$
```

## 採点基準
* 終了状態と同一の状態になっていること：50点
