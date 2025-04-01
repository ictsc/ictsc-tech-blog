---
title: "ICTSC2024 本戦 問題解説: [MUS] なんかところどころ壊れている"
description: "ICTSC2024 本戦 問題解説: なんかところどころ壊れている"
tags: [ICTSC2024,問題解説,ネットワーク関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/mus"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要
今年からゼミに所属することになったあなたとA君。<br>
そのゼミではグローバルASを運用しており、今まで管理していた先輩から引き続いたのですが、<br>
A君がオペレーションミスを起こしてしまい、ところどころネットワークが壊れてしました。<br>
自宅で逸脱の誤家庭なネットワークを構築しているあなたにトラブルシューティングを任されたので、<br>
対応をお願いします。

## 前提条件
- static routeの追加禁止

### ネットワーク運用ポリシー

1. 下記の区間ではMTUを変更する
    - AS-BER1 - AS-CR2
    - AS-BER2 - AS-CR1
2. 本ＮＷでは下記のアドレスを利用している
    - 2001:0db8:abcd:219:: ～ 2001:0db8:abcd:219:6:ffff:ffff:ffff
    - 2001:db8:abcd:219:a:0:: ～ 2001:db8:abcd:219:a:0:ffff:ffff

## 初期状態

### AS-BER1/BER2で
- `ping  10.128.0.16 count 5`をすると失敗する。
    ```
    $ ping 10.128.0.16 count 5
    PING 10.128.0.16 (10.128.0.16) 56(84) bytes of data.
    From 10.128.0.3 icmp_seq=1 Destination Host Unreachable
    From 10.128.0.3 icmp_seq=2 Destination Host Unreachable
    From 10.128.0.3 icmp_seq=3 Destination Host Unreachable
    From 10.128.0.3 icmp_seq=4 Destination Host Unreachable
    From 10.128.0.3 icmp_seq=5 Destination Host Unreachable

    --- 10.128.0.16 ping statistics ---
    5 packets transmitted, 0 received, +5 errors, 100% packet loss, time 4051ms
    ```

### AS-CR1で
- `show ip ospf neighbor`をするとneighbor相手が3つ。
    ```
    Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
    10.128.0.2       80 Full/Backup     9.491s            39.818s 10.128.0.0      eth1:10.128.0.1                      1     0     0
    10.128.0.98      80 Full/Backup     9.484s            31.720s 10.128.0.4      eth2:10.128.0.5                      2     0     0
    10.128.0.115     70 Full/Backup     9.048s            30.950s 10.128.0.33     eth4:10.128.0.32                     1     0     0
    ```

### AS-CR2で
- `show ip ospf neighbor`をすると`ExStart`が存在する。
    ```
    Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
    10.128.0.2       80 Full/Backup     2m22s             33.104s 10.128.0.2      eth1:10.128.0.3                      0     0     0
    10.128.0.98      80 ExStart/Backup  2m23s             32.940s 10.128.0.6      eth2:10.128.0.7                      0     0     0
    10.128.0.115     70 Full/Backup     2m20s             39.096s 10.128.0.35     eth4:10.128.0.34                     0     0     0
    ```

- ` show ipv6 route ospfv3`をすると`2001:db8:abcd:219:7::/127`がある。
    ```
    (略)
    O   2001:db8:abcd:219:6::2/127 [110/100] is directly connected, eth4, weight 1, 3d20h43m
    O>* 2001:db8:abcd:219:7::/127 [110/200] via fe80::be24:11ff:fe50:9078, eth4, weight 1, 3d20h43m
    O>* 2001:db8:abcd:219:a:0:1:1/128 [110/100] via fe80::be24:11ff:feec:ffcb, eth1, weight
    (略)
    ```

### AS-CR1/CR2どちらかで
- `ping 10.128.0.97 count 5`をすると失敗する。
    ```
    PING 10.128.0.97 (10.128.0.97) 56(84) bytes of data.

    --- 10.128.0.97 ping statistics ---
    5 packets transmitted, 0 received, 100% packet loss, time 4113ms
    ```
- `show ipv6 ospfv3 neighbor`をするとNeighbor IDに`10.128.0.2`がいる。

    - CR1の場合
        ```
        Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
        10.128.0.2       80    00:00:39     Full/BDR             00:00:49 eth1[DR]
        10.128.0.98      80    00:00:31     Full/BDR             00:00:49 eth2[DR]
        10.128.0.115     70    00:00:33     Full/BDR             00:00:47 eth4[DR]
        ```

    - CR2の場合
        ```
        Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
        10.128.0.2       80    00:00:38     Full/DROther         00:10:18 eth1[DR]
        10.128.0.98      80    00:00:30  ExStart/DR              00:03:09 eth2[BDR]
        10.128.0.115     70    00:00:37     Full/BDR             00:10:17 eth4[DR]
        ```

## 終了状態

### AS-BER1/BER2で
- `ping  10.128.0.16 count 5`をすると成功する。
    ```
    $ ping  10.128.0.16 count 5
    PING 10.128.0.16 (10.128.0.16) 56(84) bytes of data.
    64 bytes from 10.128.0.16: icmp_seq=1 ttl=64 time=0.683 ms
    64 bytes from 10.128.0.16: icmp_seq=2 ttl=64 time=0.505 ms
    64 bytes from 10.128.0.16: icmp_seq=3 ttl=64 time=0.442 ms
    64 bytes from 10.128.0.16: icmp_seq=4 ttl=64 time=0.466 ms
    64 bytes from 10.128.0.16: icmp_seq=5 ttl=64 time=0.580 ms

    --- 10.128.0.16 ping statistics ---
    5 packets transmitted, 5 received, 0% packet loss, time 4134ms
    rtt min/avg/max/mdev = 0.442/0.535/0.683/0.087 ms
    ```

### AS-CR1で
- `show ip ospf neighbor`をするとneighbor相手が4つ。
    ```
    Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
    10.128.0.97      80 Full/Backup     1m20s             35.192s 10.128.0.0      eth1:10.128.0.1                      0     0     0
    10.128.0.98      80 Full/Backup     1m17s             35.643s 10.128.0.4      eth2:10.128.0.5                      0     0     0
    10.128.0.110     90 Full/Backup     1m17s             37.509s 10.128.0.17     eth3:10.128.0.16                     0     0     0
    10.128.0.115     70 Full/Backup     1m19s             30.911s 10.128.0.33     eth4:10.128.0.32                     0     0     0
    ```

### AS-CR2で
- `show ip ospf neighbor`をすると`ExStart`が存在しない。
    ```
    Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
    10.128.0.97      80 Full/Backup     1m47s             39.513s 10.128.0.2      eth1:10.128.0.3                      0     0     0
    10.128.0.98      80 Full/Backup     1m47s             39.968s 10.128.0.6      eth2:10.128.0.7                      0     0     0
    10.128.0.109    100 Full/DR         1m43s             33.186s 10.128.0.16     eth3:10.128.0.17                     0     0     0
    10.128.0.115     70 Full/Backup     1m44s             35.239s 10.128.0.35     eth4:10.128.0.34                     0     0     0
    ```

- ` show ipv6 route ospfv3`をすると`2001:db8:abcd:219:7::/127`がない。
    ```
    (略)
    O>* 2001:db8:abcd:219:6::2/127 [110/200] via fe80::be24:11ff:fea0:a585, eth4, weight 1, 00:04:19
    O>* 2001:db8:abcd:219:a:0:1:1/128 [110/1] via fe80::be24:11ff:fe92:eea9, eth1, weight 1, 00:04:23
    O>* 2001:db8:abcd:219:a:0:1:2/128 [110/100] via fe80::be24:11ff:fede:582f, eth2, weight 1, 00:04:23
    (略)
    ```

### AS-CR1/CR2どちらかで
- `ping 10.128.0.97 count 5`をすると成功する。
    ```
    $ ping 10.128.0.97 count 5
    PING 10.128.0.97 (10.128.0.97) 56(84) bytes of data.
    64 bytes from 10.128.0.97: icmp_seq=1 ttl=64 time=0.626 ms
    64 bytes from 10.128.0.97: icmp_seq=2 ttl=64 time=0.457 ms
    64 bytes from 10.128.0.97: icmp_seq=3 ttl=64 time=0.609 ms
    64 bytes from 10.128.0.97: icmp_seq=4 ttl=64 time=0.517 ms
    64 bytes from 10.128.0.97: icmp_seq=5 ttl=64 time=0.559 ms

    --- 10.128.0.97 ping statistics ---
    5 packets transmitted, 5 received, 0% packet loss, time 4112ms
    rtt min/avg/max/mdev = 0.457/0.553/0.626/0.061 ms
    ```
- `show ipv6 ospfv3 neighbor`をするとNeighbor IDに`10.128.0.97`がいる。

    - CR1の場合
        ```
        Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
        10.128.0.97      80    00:00:32     Full/BDR             00:04:02 eth1[DR]
        10.128.0.98      80    00:00:33     Full/BDR             00:04:02 eth2[DR]
        10.128.0.110     90    00:00:35     Full/BDR             00:04:00 eth3[DR]
        10.128.0.115     70    00:00:31     Full/BDR             00:03:58 eth4[DR]
        ```

    - CR2の場合
        ```
        Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
        10.128.0.97      80    00:00:39     Full/BDR             00:03:46 eth1[DR]
        10.128.0.98      80    00:00:39     Full/BDR             00:03:46 eth2[DR]
        10.128.0.109    100    00:00:32     Full/DR              00:03:43 eth3[BDR]
        10.128.0.115     70    00:00:37     Full/BDR             00:03:46 eth4[DR]
        ```

## ネットワーク図
![](/images/2024-final-round/mus01.jpg)
---

## 解説
本問題はOSPSFv2,v3に関する基礎知識を求める問題でした。<br>
- OSPFv2/v3の共通トラブル
    - `R1のCR1-CR2間がshutdown`
- OSPFv2のトラブル
    - `BER1のloopbackが未設定`。
    - `CR2のBER2-CR2間のMTU不一致`
- OSPFv3のトラブル
    - `CR1のeth4のアドレス間違え`
    - `OSPFv3のrouter-idの未設定`

の5つのトラブルがありました。

### CR1のeth3がadmin down
`$ show interfaces ethernet`をすると、

```
Codes: S - State, L - Link, u - Up, D - Down, A - Admin Down
Interface        IP Address                        S/L  Description
---------        ----------                        ---  -----------
(略略)
eth3             10.128.0.16/31                    A/D
                 2001:db8:abcd:219:4::/127
eth4             10.128.0.32/31                    u/u
```

とeth3がA/DとなっておりAdmin Downとなっていることが分かるので、
Admin Downを削除するコマンドを入れる。<br>
`delete interfaces ethernet eth3 disable`

### BER1のloopbackが未設定
`ping 10.128.0.97 count 5`をすると失敗するから

 アドレスの設定がされてない　もしくは　OSPFv2の広報対象になってない　のいずれかが考えられる。<br>
BER1のコンフィグを確認すると
```
(中略)
set interfaces ethernet eth2 mtu '1384'
set interfaces loopback lo address '2001:0db8:abcd:219:A::1:1/128'
set protocols ospf area 0 network '10.128.0.0/31'
(中略)
```
となっておりアドレスが設定のされてないことが分かるなので、<br>
アドレスを設定するコマンドを入れる。<br>
`set interfaces loopback lo address '10.128.0.97/32'`

### CR2のBER2-CR2間のMTU不一致
`show ip ospf neighbor`をすると`ExStart`が存在する。
```
Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.128.0.97      80 Full/Backup     2m22s             33.104s 10.128.0.2      eth1:10.128.0.3                      0     0     0
10.128.0.98      80 ExStart/Backup  2m23s             32.940s 10.128.0.6      eth2:10.128.0.7                      0     0     0
10.128.0.115     70 Full/Backup     2m20s             39.096s 10.128.0.35     eth4:10.128.0.34                     0     0     0
```
ことから、OSPFの前提条件を満たせていないことをがわかる。
CR2のログを確認すると
```
Jan 16 10:31:29 ospfd[1339]: [XZZ9Y-NNTMQ][EC 134217741] Packet[DD]: Neighbor 10.128.0.98 MTU 1500 is larger than [eth2:10.128.0.7]'s MTU 1384
Jan 16 10:31:34 ospfd[1339]: [XZZ9Y-NNTMQ][EC 134217741] Packet[DD]: Neighbor 10.128.0.98 MTU 1500 is larger than [eth2:10.128.0.7]'s MTU 1384
Jan 16 10:31:39 ospfd[1339]: [XZZ9Y-NNTMQ][EC 134217741] Packet[DD]: Neighbor 10.128.0.98 MTU 1500 is larger than [eth2:10.128.0.7]'s MTU 1384
Jan 16 10:31:44 ospfd[1339]: [XZZ9Y-NNTMQ][EC 134217741] Packet[DD]: Neighbor 10.128.0.98 MTU 1500 is larger than [eth2:10.128.0.7]'s MTU 1384
```
BER2のログを確認すると
```
Jan 16 10:32:08 ospf6d[1334]: [WX5Y6-7T029] VRF default: I/F eth2 MTU mismatch (my 1500 rcvd 1384)
Jan 16 10:32:13 ospf6d[1334]: [WX5Y6-7T029] VRF default: I/F eth2 MTU mismatch (my 1500 rcvd 1384)
Jan 16 10:32:18 ospf6d[1334]: [WX5Y6-7T029] VRF default: I/F eth2 MTU mismatch (my 1500 rcvd 1384)
Jan 16 10:32:23 ospf6d[1334]: [WX5Y6-7T029] VRF default: I/F eth2 MTU mismatch (my 1500 rcvd 1384)
Jan 16 10:32:28 ospf6d[1334]: [WX5Y6-7T029] VRF default: I/F eth2 MTU mismatch (my 1500 rcvd 1384)
```
とMTU値が一致しないことがわかる。<br>
前提条件の`ネットワーク運用ポリシー`からCR2の方を変更する<br>
`delete interfaces ethernet eth2 mtu 1384`

### CR1のeth4のアドレス間違え
` show ipv6 route ospfv3`をすると`2001:db8:abcd:219:7::/127`がある
```
(略)
O   2001:db8:abcd:219:6::2/127 [110/100] is directly connected, eth4, weight 1, 3d20h43m
O>* 2001:db8:abcd:219:7::/127 [110/200] via fe80::be24:11ff:fe50:9078, eth4, weight 1, 3d20h43m
O>* 2001:db8:abcd:219:a:0:1:1/128 [110/100] via fe80::be24:11ff:feec:ffcb, eth1, weight
(略)
```
問題となっている`2001:db8:abcd:219:7::/127`について前提条件の前提条件の`ネットワーク運用ポリシー`を見ると<br>
使用アドレスの範囲外のアドレスであることが分かる。<br>
そのため、経路を広報しているルーターを検索すると、
```
$ show ipv6 ospfv3 database | match :7::
IAP  0.0.0.4        10.128.0.109     27 80000001      2001:db8:abcd:219:7::/127
IAP  0.0.0.4        10.128.0.110     25 80000001      2001:db8:abcd:219:7::/127
INP  0.0.0.6        10.128.0.109     27 80000002      2001:db8:abcd:219:7::/127
```
とCR1であることがわかる。<br>
アドレスについて対向ルーターのアドレスを確認すると'2001:0db8:abcd:219:6::1/127'であることから
```
delete interfaces ethernet eth4 address '2001:0db8:abcd:219:7::0/127'
set interfaces ethernet eth4 address '2001:0db8:abcd:219:6::0/127'
```
上記のコマンドを入れる。

### BER1のOSPFv3のrouter-idの未設定
初期状態で`show ipv6 ospfv3 neighbor`をすると<br>
```
(CR1)
Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
10.128.0.2       80    00:00:39     Full/BDR             00:00:49 eth1[DR]

(CR2)
Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
10.128.0.2       80    00:00:38     Full/DROther         00:10:18 eth1[DR]
```

とBER1のeht2アドレスとなっている。<br>
しかしの他のルーターではrouter-idが明示されてので<br>
AS-BER1で `set protocols ospfv3 parameters router-id 10.128.0.97`を投入<br>
さらに、投入しただけでは反映されないため`restart ospfv3`を行う

## 採点基準
ex) 採点ポイント : 得点
- R1のCR1-CR2間がshutdown : 20
- BER1のloopbackが未設定 : 20
- CR2のBER2-CR2間のMTU不一致 : 20

- `2001:db8:abcd:219:7::/127`を消している : 30
- `2001:0db8:abcd:219:6::0/127`にしている : 30
    - 上記の二つが完答 : 10

- set protocols ospfv3 parameters router-id 10.128.0.98 が入っている : 30
- restart ospfv3を行い更新されている : 30
    - 上記の二つが完答 : 10

## 講評
販売されている業務向けルーターで、多くのベンダーで実装されているOSPFについて出題しました。<br>
本選では想定以上に回答が少なくて、点数やホスト数など出題側でもう少し調整をするべきだったかと思いました。<br>
ここからは出題理由について述べようかと思います。<br>
OSPFv2/v3の共通トラブルの`R1のCR1-CR2間がshutdown`は、ボーナス問題として出題しました。<br>
OSPFv2のトラブルの`BER1のloopbackが未設定`は、OSPFの経路広報の条件を問う問題として出題しました。<br>
広報の条件は、`自身のインターフェースにアドレスが設定されていること`と`OSPFの設定でネットワークとareaが指定がされていること`の二つが必須条件となっています。<br>
`CR2のBER2-CR2間のMTU不一致`はOSPFのneighber条件に知ってほしく出題しました。<br>
一般的に、同一サブネットであることや各種パラメータが一致しているといった点は意識されますが、`MTU値もneighber条件の一つ`となっています。例えば、複数拠点のNWをトンネルで繋いだときなどのMTU値が変わる場面で発生しやすいトラブルです。<br>
OSPFv3のトラブルの`CR1のeth4のアドレス間違え`は、OSPFv2とv3では`ネットワークとareaの指定の仕方が異なる`ことを知っているかを問う問題として出題しました。
OSPFv2(IPv4)では、ネットワークとareaの指定はプレフィックスごとに指定をしていましたが、<br>
OSPFv3(IPv6)では、`インターフェースとareaの紐付けを行う形式`となっています。
そのため、インターフェースのIPv6アドレスをタイポするとタイポしたアドレスが広報されてしまうのです。
`OSPFv3のrouter-idの未設定`は、3段階で意識して欲しいため出題しました。<br>
1. OSPFではrouter-idは必須です。<br>
環境によってはrouter-idがインターフェースのIPv4アドレスから選出され動作する場合や、そもそもrouter-idが設定されないためOSPFv3が動作しないということがあります。<br>
特にIPv6だけのNWの場合だとrouter-idに使える任意の32bitのIDがなくで動作しないといったことがあるので、ちゃんと設定しましょう。<br>
2. 次にrouter-idの選出基準です。<br>
一般的に、①明示的に指定されたrouter-id、②loopbackのアドレスの中で最も大きいアドレス、③他のインターフェースの中で最も大きいアドレスの順で選出されるということです。<br>
これには、上記の`BER1のloopbackが未設定`も関わっており、①明示的に指定されたrouter-id:ない、②loopbackのアドレス:ない、③インターフェースのアドレス:10.128.0.0 or 10.128.0.2の中で最も大きいアドレスということで、`10.128.0.2`がNeighbor IDとして表示されているということです。<br>
3. 最後はOSPFのプロセスが起動中にrouter-idを設定/変更しても即時に反映されないということです。<br>
OSPFのプロセスでrouter-id関する処理が入るがOSPFのプロセスを始めたタイミングでしか設定されないことが多いです。<br>
そのため、今回のようなOSPFのプロセスが既に動いている際は一度プロセスをリセットさせる必要があります。
