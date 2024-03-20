---
title: "ICTSC2023 本戦 問題解説: [WOA] あれ、なぜCR2を経由するの？"
description: "ICTSC2023 本戦 問題解説: [WOA] あれ、なぜCR2を経由するの？"
tags: [ICTSC2023,ネットワーク関連,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/woa"
draft: false
renderer: "md"
sticky: false
---


# 問題文

## 概要

あなたが所属するサークルにてグローバルASを運用することになりました。
ネットワーク機器は異なる拠点(DC-A,DC-B)に機材を設置し、
拠点間と利用者間を公衆網(IPv6)上にEtherIpでトンネルを張り繋げることになりました。
あなたと後輩AでDC-Aの作業を行っており、後輩Aの作業結果を確認したらなぜかAS-CR2へトラフィックが流れています。
運用ドキュメントを参考にしながらトラブルシューティングをお願い致します。

## 前提条件

1.document
    本ページの最後の方に掲載

2.出題環境について
    トラブルの原因はAS-CR1である
    問題環境の軽量化のため下記を省略している
    全てのtunnel-Router
    公衆網(IPv6)
    AS-SR2※
    ※AS-SR2とAS-CR1,AS-SR2とAS-CR2間の設定は不要

3.禁止事項
    static routeを追加しないこと
    AS運用ドキュメントにて定義される値を変更する
    Ex) IPアドレス,OSPF cost,etc...

## 初期状態

AS-CR1で$ traceroute 192.168.230.1をすると下記の通りになる
```
traceroute to 192.168.230.1 (192.168.230.1), 30 hops max, 60 byte packets
connect: Network is unreachable
```

AS-SR1で$ traceroute 192.168.60.1をすると下記の通りになる
```
traceroute to 192.168.60.1 (192.168.60.1), 30 hops max, 60 byte packets
 1  192.168.120.34 (192.168.120.34)
 2  192.168.120.2 (192.168.120.2) 
 3  192.168.60.1 (192.168.60.1)
```

終了状態
AS-CR1で$ traceroute 192.168.230.1をすると下記の通りになる
```
traceroute to 192.168.230.1 (192.168.230.1), 30 hops max, 60 byte packets
 1  192.168.120.4 (192.168.120.4)  0.403 ms  0.358 ms  0.360 ms
 2  192.168.230.1 (192.168.230.1)  0.985 ms  0.963 ms  0.942 ms
```

AS-SR1で$ traceroute 192.168.60.1をすると下記の通りになる
```
traceroute to 192.168.60.1 (192.168.60.1), 30 hops max, 60 byte packets
 1  192.168.120.32 (192.168.120.32)
 2  192.168.120.0 (192.168.120.0)
 3  192.168.60.1 (192.168.60.1)
```

---

## 解説

## トラブルの原因

この問題は、OSPFで二つBGPで二つのトラブルが発生していました。
OSPFでは`areaの不一致`と`Loopbackの広報忘れ`というトラブルが、
BGPでは`BGP Neighborのアドレス設定ミス`と`ルートリフレクタの設定忘れ`というトラブルが発生していました。

## 原因の解決策

1.OSPF/areaの不一致
   AS-CR1で`show log | much ospf`を実行すると
   ```
   interface eth2:192.168.120.5: ospf_read invalid Area ID 0.0.0.102
   ```
   とarea id が異なるというのが出ています。
   この点についてドキュメントを見ると`192.168.120.4/31`は`area id 102`であることが分かるので、
   ```
   delete protocols ospf area 101 network '192.168.120.4/31'
   set protocols ospf area 102 network '192.168.120.4/31'
   ```
2.OSPF/Loopbackの広報忘れ
   AS-SR1で`show ip route ospf`を実行すると
   ```
   (省略)
   O>* 192.168.120.128/32 [110/100] via 192.168.120.32, eth1, weight 1, 00:35:24
   O>* 192.168.120.129/32 [110/150] via 192.168.120.34, eth2, weight 1, 00:35:22
   O>* 192.168.120.161/32 [110/100] via 192.168.120.34, eth2, weight 1, 00:35:24
   O   192.168.120.192/32 [110/0] is directly connected, lo, weight 1, 00:42:44
   ```
   が表示されAS-CR1のLoopbackである`192.168.120.160/32`がない事が分かる。
   なのでOSPFで広報する設定
   ```
   set protocols ospf area 0 network 192.168.120.160/32
   ```
   を投入する。

3.BGP/BGP Neighborのアドレス設定ミス
   OSPFの二つのトラブルを解決した上でAS-CR1にて`show bgp summary `を実行すると
   ```
   Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
   192.168.120.2   4      65219         0        23        0    0    0    never       Active        0 N/A
   192.168.120.4   4      65219         0        24        0    0    0    never       Active        0 N/A
   192.168.120.15  4      65219         0         0        0    0    0    never       Active        0 N/A
   192.168.120.33  4      65219         0        21        0    0    0    never       Active        0 N/A

   Total number of neighbors 4
   ```
   という結果が出て来る。
   BGPに関するドキュメントを読むと`BGP NeighborはOSPFで広報したLoopbackで張る`と書いてあるので、
   すべてのBGP Neighborアドレスが間違っていることが分かる。
   なので、この状態であるBGPの設定の削除とLoopbackアドレスでBGPの設定を行う必要がある。
   ```
   delete protocols bgp neighbor 192.168.120.2
   delete protocols bgp neighbor 192.168.120.4
   delete protocols bgp neighbor 192.168.120.15
   delete protocols bgp neighbor 192.168.120.33
   set protocols bgp neighbor 192.168.120.128 address-family ipv4-unicast nexthop-self force
   set protocols bgp neighbor 192.168.120.128 update-source lo
   set protocols bgp neighbor 192.168.120.128 remote-as '65219'
   set protocols bgp neighbor 192.168.120.129 address-family ipv4-unicast nexthop-self force
   set protocols bgp neighbor 192.168.120.129 update-source lo
   set protocols bgp neighbor 192.168.120.129 remote-as '65219'
   set protocols bgp neighbor 192.168.120.161 address-family ipv4-unicast nexthop-self force
   set protocols bgp neighbor 192.168.120.161 update-source lo
   set protocols bgp neighbor 192.168.120.161 remote-as '65219'
   set protocols bgp neighbor 192.168.120.192 address-family ipv4-unicast nexthop-self force
   set protocols bgp neighbor 192.168.120.192 update-source lo
   set protocols bgp neighbor 192.168.120.192 remote-as '65219'
   ```

4.BGP/ルートリフレクタの設定忘れ
   ドキュメントには`AS-CRではBGP ルートリフレクタを行う`と書いているあるが、設定が抜けているので設定する。
   ```
   set protocols bgp neighbor 192.168.120.128 address-family ipv4-unicast route-reflector-client
   set protocols bgp neighbor 192.168.120.129 address-family ipv4-unicast route-reflector-client
   set protocols bgp neighbor 192.168.120.161 address-family ipv4-unicast route-reflector-client
   set protocols bgp neighbor 192.168.120.192 address-family ipv4-unicast route-reflector-client
   set protocols bgp parameters cluster-id 192.168.120.160
   ```

## 解決後の状態確認コマンド・結果

   * AS-CR1
      * show ip ospf neighbor
      ```
      Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
      192.168.218.161   1 Full/DR         6m55s             34.618s 192.168.218.17  eth3:192.168.218.16                  0     0     0
      192.168.218.128   1 Full/DR         7m30s             39.314s 192.168.218.0   eth1:192.168.218.1                   0     0     0
      192.168.218.129   1 Full/Backup     6m38s             38.510s 192.168.218.4   eth2:192.168.218.5                   0     0     0
      ```

      * show bgp summary
      ```
      Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
      192.168.218.128 4      65219        10        12        5    0    0 00:05:35            3        4 N/A
      192.168.218.129 4      65219        10        12        5    0    0 00:05:35            3        4 N/A
      192.168.218.161 4      65219        11        12        5    0    0 00:05:35            4        4 N/A
      192.168.218.192 4      65219        11        11        5    0    0 00:05:35            4        4 N/A

      Total number of neighbors 4
      ```

   * AS-SR1
      * show bgp summary
      ```
      Neighbor        V         AS   MsgRcvd   MsgSent   TblVer  InQ OutQ  Up/Down State/PfxRcd   PfxSnt Desc
      192.168.218.160 4      65219        65        87       19    0    0 00:00:51            4        4 N/A
      192.168.218.161 4      65219        30        33       19    0    0 00:00:51            4        4 N/A

      Total number of neighbors 2
      ```
  
## 採点基準

1.tracertoute 点数 : 50点

   * AS-CR1で`$ traceroute 192.168.230.1`をしたときに
      * 192.168.120.4を経由している (得点:25点)
   
   * AS-SR1で`$ traceroute 192.168.60.1`をしたときに
      * 192.168.120.32と192.168.120.0 を経由している (得点:25点)

2.OSPF 点数 : 100点

   * areaの不一致 (得点:30点)
      * network 192.168.120.4/31がarea 102として広報されている。

   * Loopbackの広報忘れ (得点:30点)
      * CR1のLoopbackである network 192.168.120.160/32がarea 0として広報されている。

   * すべての設定が行われている (得点:10点※)
   * ※以外にもう一つトラブル(得点:30点)があったが、終了条件を満たすのに大きな影響がないことが判明したため得点調整を実施

3.BGP 点数 : 150点

   * BGP neighber先をLoopkackに変更する
      * 192.168.120.128 (得点:25点・完答)
         ```
         address-family next-hop force
         address-family ipv4-unicast route-reflectnext-hopnt
         remote-as '65219'
         ```

      * 192.168.120.129 (得点:25点・完答)
         ```
         address-family next-hop force
         address-family ipv4-unicast route-reflectnext-hopnt
         remote-as '65219'
         ```

      * 192.168.120.161 (得点:25点・完答)
         ```
         address-family next-hop force
         remote-as '65219'
         ```

      * 192.168.120.192 (得点:25点・完答)
         ```
         address-family next-hop force
         address-family ipv4-unicast route-reflectnext-hopnt
         remote-as '65219'
         ```

      * 下記の設定が完全に消されている (得点:10点・完答)
         * 192.168.120.2
         * 192.168.120.4
         * 192.168.120.15
         * 192.168.120.33

   * ルートリフレクタの設定
      * 192.168.120.128 (得点:10点)
         * address-family ipv4-unicast route-reflectnext-hopnt

      * 192.168.120.129 (得点:10点)
         * address-family ipv4-unicast route-reflectnext-hopnt

      * 192.168.120.192 (得点:10点)
         * address-family ipv4-unicast route-reflectnext-hopnt

      * parameters cluster-id 192.168.120.160 (得点:10点)

   * すべての設定が行われている (得点:10点)

---

## AS65219 運用ドキュメント

## 本ドキュメントでの略称

1. ルータ
   - ER : Edge-Router
   - CR : Core-Router
   - SR : Service-Router
   - CTR : Core-Tunnel-Router
   - STR : Service-Tunnel-Router


## 割り当て情報

1. ASN : 65219
2. IPv4 Address : 192.168.120.0/23
3. IPv6 Address : FC03:0DB0:5A4C/48

## 構内配線

1.物理構成図

![](/public/images/2023-final-round/woa01.png)


2.論理構成図

![](/public/images/2023-final-round/woa02.png)


## 本ネットワークにおいて注意ポイント

1. CTR/STRの共通点について
   - 公衆電話交換網(Ipv6)上にEtherIP(RFC3378)を利用してイーサネットフレームを転送している。
   - EtherIP用に専用のルータを設ける。
   - TRにはUNIVERGE IXシリーズを利用している。
   - 各ER,CR,SRではEtherIPを経由するときにIPフラグメンテーションが起きないようにMTU値を変更する。
   - MTU値は[UNIVERGE IXシリーズの機能説明書](https://www.support.nec.co.jp/View.aspx?id=3170102598)を参考に変更する。

2. CTRについて
   - CTRでは拠点間を跨ぐときに使用する
   - 組み合わせ
     - ER1 - CR2
     - ER2 - CR1
     - CR1 - CR2
     - CR1 - SR2
     - CR2 - SR1
   - CTRでは外側インタフェースにて3つのIpv6アドレスを設定し、各組み合わせごとに専用のトンネルを張る。
   - CTRの内側インタフェースにて各ER,CR,SR専用のvlan-groupを設定する。
   - 各トンネルと各vlan-groupで繋がるようにbridge設定を行う。

3. STRについて
   - 利用者のRouterとSR間を担当する
   - 各利用者にVLANを割り当て、SRにて各利用者とBGP接続を行う。

4.バックボーンエリアについて
   - 異なるエリアにある二箇所のDCに、ER-CR-SR並びにマネジメント一式を設置している。
   - 同一DC間の接続は直接接続を行っている。
   - DCを跨ぐ接続については、2. CTRについて に従って接続する。
   - ERではJANOG Comment Indexの技術文書のJC1001並びにJC1002に従って設定を行う。
   - SRではJANOG Comment Indexの技術文書のJC1003に乗っ取り設定を行う
   - 参考 : [JANOG Comment Index](https://www.janog.gr.jp/doc/janog-comment/)

5.ダイナミックルーティングプロトコル
   - OSPF
      - バックボーンエリアのIP Addressを広報する
      - Area は下記の通り(表記 対象ルータ名/広報interface,RTA-RTB:表記されるルータ同士のネットワーク)
         - Area 0 : CR1/Loopback , CR2/Loopback , SR1/Loopback , SR2/Loopback
         - Area 0 : CR1-CR2 , CR1-SR1 , CR1-SR2 , CR2-SR1 , CR2-SR2
         - Area 101 : ER1/Loopback , ER1-CR1 , ER1-CR2
         - Area 102 : ER2/Loopback , ER2-CR1 , ER2-CR2
      -  Costについて
         - ER,CR,SRのLoopbackの除いたすべてのインターフェイスにて設定を行う
         - 基本 : 50, トンネル区間 : 100, CR1-CR2間 : 500

   - BGP
      - AS内のBGP peerはOSPFにて広報したLoopbackで張る。
      - transit,IX,private peerとのBGP peerはインターフェイスにて張る。
      - 各AS-ER,AS-SRは他ASから入ってきた外部経路をnexthopを書き換えてAS-CRへ広報する。
      - AS内のiBGP neighborの数を抑えるためにAS-CR1,AS-CR2でルートリフレクタ機能を使用する。
      - ルートリフレクタのクラスタIDはAS-CRのLoopbackのアドレスを利用する。

## IPv4 Address 割り当て

1.大まかな割り当て
   - 192.168.120.0/24 : バックボーンネットワーク用
   - 192.168.121.0/24 : 利用者へ割り当て
       
2.バックボーンネットワーク用
- 192.168.120.0/25 : P2P用
   - 192.168.120.0/28 : ER-CR間用
     - .0 : ER1 - .1: CR1
     - .2 : ER1 - .3 : CR2
     - .4 : ER2 - .5 : CR1
     - .6 : ER2 - .7 : CR2

   - 192.168.120.16/28 : CR-CR間用
     - .16 : CR1 - .17 : CR2

   - 192.168.120.32/27 : CR-SR間用
     - .32 : CR1 - .33 : SR1
     - .34 : CR2 - .35 : SR1
     - .36 : CR1 - .37 : SR2
     - .38 : CR2 - .39 : SR2

- 192.168.120.128/25 : LoopBack用
   - 192.168.120.128/27 : ER用
     - 192.168.120.128 : ER1
     - 192.168.120.129 : ER2

   - 192.168.120.160/27 : CR用
     - 192.168.120.160 : CR1
     - 192.168.120.161 : CR2

   - 192.168.120.192/27 : SR用
     - 192.168.120.192 : SR1
     - 192.168.120.193 : SR2

- 192.168.120.224/27 : SR - 利用者間
   - 未割当

3.利用者へ割り当て
- 192.168.219.0/24 : 未割当
 
## IPv6 Address 割り当て

- (省略)
