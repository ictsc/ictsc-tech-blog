---
title: "ICTSC2024 本戦 問題解説: [MGI] 君も今日からネットワークエンジニア"
description: "ICTSC2024 本戦 問題解説: 君も今日からネットワークエンジニア"
tags: [ICTSC2024,問題解説,ネットワーク関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/mgi"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要
陽紫くんは最近ネットワークに興味を持ち始め，試しに IS-IS というルーティングプロトコルを使ってみることにした．
ネットの記事を参考にしながら設定を投入すると，IS-IS は動作しているようだったが，一部想定とは異なる挙動が発生し，接続したはずのネットワーク間で疎通が取れない状況に陥ってしまった．

陽紫くんなりに色々調べてみたが，彼一人では原因を特定することができず，困っているようだ．彼はとても好奇心旺盛で，このまま解決できないとネットワークへの興味を失ってしまうかもしれない．

[ 依頼内容 ]

貴重なネットワーク人材がいなくなってしまう前に，陽紫くんの設定の問題点を特定し，どこを修正すれば正しくネットワークが動作するのかを，わかりやすく説明してほしい．

## 前提条件

- vyos1,2,3 には，静的経路を追加しては行けない
- ネットワークの構成ノード・アドレスはトポロジー図に示されたものを使うこと
- デフォルトルートの設定を変更してはいけない

## 初期状態

host1-1 で`$ ping 192.168.120.2`，host2 で`$ ping 192.168.110.2`をすると，"Time to live exceeded"になる．

``` shell-session
ictsc@host1-1:~$ ping 192.168.120.1 -c 5
PING 192.168.120.1 (192.168.120.1) 56(84) bytes of data.
From 172.19.1.3 icmp_seq=1 Time to live exceeded
From 172.19.1.3 icmp_seq=2 Time to live exceeded
From 172.19.1.3 icmp_seq=3 Time to live exceeded
From 172.19.1.3 icmp_seq=4 Time to live exceeded
From 172.19.1.3 icmp_seq=5 Time to live exceeded

--- 192.168.120.1 ping statistics ---
5 packets transmitted, 0 received, +5 errors, 100% packet loss, time 4007ms
```

## 終了状態

vyos1,2,3 を再起動しても，host1-1 と host2 の間で双方向の疎通性がある．

## ネットワーク図

![](/public/images/2024-final-round/mgi.png)

---

## 解説

この問題は，初心者が一度はやったことがあるであろう設定忘れ・ミスを複合したものになっており，大きく5つの要素に分かれています．

一つ目は，host1-1, host2に経路設定が入っていないというものです．host1-1からhost2，host2からhost1-1に対して，pingコマンドを実行すると，"Time to live exceeded"となります．下記のように，パケットがGWに吸い込まれているため，それぞれのhostで経路を設定する必要があります．
``` shell-session
ictsc@host1-1:~$ sudo tcpdump -i eth0 icmp
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
14:58:47.072789 IP host1-1 > 192.168.120.2: ICMP echo request, id 1404, seq 24, length 64
14:58:47.074302 IP 172.19.1.3 > host1-1: ICMP time exceeded in-transit, length 92
14:58:48.074558 IP host1-1 > 192.168.120.2: ICMP echo request, id 1404, seq 25, length 64
14:58:48.076195 IP 172.19.1.3 > host1-1: ICMP time exceeded in-transit, length 92
```

二つ目は，vyos1のeth1に割り当てられているアドレスのプレフィックスが間違っているというものです．対向に合わせて`/30`に修正します．

続いて，三つ目について，vyos1の経路情報を確認しに行くと，IS-ISによる経路交換が行われていないことがわかります．IS-ISのネイバーがvyos1から見えていません．
``` shell-session
    ictsc@vyos1:~$ show ip route
    Codes: K - kernel route, C - connected, S - static, R - RIP,
        O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
        T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
        f - OpenFabric,
        > - selected route, * - FIB route, q - queued, r - rejected, b - backup
        t - trapped, o - offload failure

    S>* 0.0.0.0/0 [1/0] via 192.168.17.254, eth0, weight 1, 03:36:33
    C>* 1.1.1.1/32 is directly connected, lo, 03:34:49
    C>* 10.3.1.0/30 is directly connected, eth1, 03:34:47
    C>* 192.168.17.0/24 is directly connected, eth0, 03:36:34
    C>* 192.168.110.0/31 is directly connected, eth2, 03:34:49

    ictsc@vyos1:~$ show isis neighbor
    Area VyOS:
    System Id           Interface   L  State        Holdtime SNPA
```

vyos1とvyos3でそれぞれIS-ISインタフェースのTypeを確認すると，vyos1のeth1はlan，vyos3のeth1はp2pになっており，これを一致させる必要があります．
``` shell-session
    ictsc@vyos1:~$ show isis interface
    Area VyOS:
    Interface   CircId   State    Type     Level
    lo          0x0      Up       loopback L1
    eth1        0x3      Up       lan      L1

    ictsc@vyos3:~$ show isis interface
    Area VyOS:
    Interface   CircId   State    Type     Level
    eth1        0x0      Up       p2p      L2
    eth2        0x0      Up       p2p      L2
    lo          0x0      Up       loopback L2
```

4つ目は，IS-ISのネイバーは確認できるようになりましたが，Stateが依然Initializingのままになっています．
``` shell-session
    ictsc@vyos1:~$ show isis neighbor
    Area VyOS:
    System Id           Interface   L  State        Holdtime SNPA
    0000.0000.0003      eth1        2  Initializing  28       2020.2020.2020
```
vyos2とvyos3はLevel-2ですが，vyos1はlevel-1になっているので，vyos1をlevel-2あるいはlevel-1-2に修正する必要があります．

最後に，この時点でIS-ISのネイバーが上がっていますが，肝心の192.168.120.0/30宛の経路がvyos2に入っていません．
``` shell-session
    ictsc@vyos3:~$ show isis neighbor
    Area VyOS:
    System Id           Interface   L  State        Holdtime SNPA
    vyos                eth1        1  Up            28       2020.2020.2020
    vyos                eth2        2  Up            28       2020.2020.2020

    ictsc@vyos3:~$ show ip route
    Codes: K - kernel route, C - connected, S - static, R - RIP,
        O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
        T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
        f - OpenFabric,
        > - selected route, * - FIB route, q - queued, r - rejected, b - backup
        t - trapped, o - offload failure

    S>* 0.0.0.0/0 [1/0] via 192.168.17.254, eth0, weight 1, 03:49:14
    I>* 1.1.1.1/32 [115/10] via 10.3.1.2, eth1, weight 1, 00:06:16
    I>* 2.2.2.2/32 [115/20] via 10.2.3.1, eth2, weight 1, 03:48:18
    C>* 3.3.3.3/32 is directly connected, lo, 03:48:21
    I   10.2.3.0/30 [115/20] via 10.2.3.1, eth2 inactive, weight 1, 03:48:18
    C>* 10.2.3.0/30 is directly connected, eth2, 03:48:21
    I   10.3.1.0/30 [115/10] via 10.3.1.2, eth1 inactive, weight 1, 00:06:16
    C>* 10.3.1.0/30 is directly connected, eth1, 03:48:20
    I   192.168.17.0/24 [115/10] via 10.3.1.2, eth1, weight 1, 00:06:16
    C>* 192.168.17.0/24 is directly connected, eth0, 03:49:16
    I>* 192.168.110.0/31 [115/10] via 10.3.1.2, eth1, weight 1, 00:06:16
 ```
 原因は，vyos2のeth1側の経路情報がIS-ISで広告されていないことにあり，Connectedの経路を再広告します．

以上で，host1-1 <-> host2で疎通性を確保することができました．

### 想定解法
#### host側に静的経路を設定
- ipコマンドで設定する場合，host1-1,2各々で下記コマンドを実行
    - `host1-1`にsshログインし，`sudo ip route add 192.168.120.0/30 via 192.168.110.1 dev eth1`
    - `host2`にsshログインし，`sudo ip route add 192.168.110.0/30 via 192.168.120.1 dev eth1`
- netplanで設定する場合，下記を実行
    - 実行手順
        - ファイル生成：`sudo cp /etc/netplan/50-cloud-init.yaml /etc/netplan/99-ictsc2024.yaml`
        - ファイル編集：`sudo vi /etc/netplan/99-ictsc2024.yaml`
        - ファイル適用：`sudo netplan apply`
    - 編集内容(host1-1の場合)
      ``` shell-session
      network:
      version: 2
      ethernets:
        eth0:
          match:
            macaddress: "bc:24:11:c1:43:af"
          addresses:
          - "192.168.17.4/24"
          - "fd00:d056:6:0017::4/64"
          nameservers:
            addresses:
            - 8.8.8.8
            search:
            - local
          set-name: "eth0"
          routes:
          - to: "default"
            via: "192.168.17.254"
          - to: "default"
            via: "fd00:d056:6:0017::ffff"
        eth1:
          match:
            macaddress: "bc:24:11:70:d2:47"
          addresses:
          - "192.168.110.2/30"
          nameservers:
            addresses:
            - 8.8.8.8
            search:
            - local
          set-name: "eth1"
          routes:
          + - to: "192.168.120.0/30"
          +   via: "192.168.110.1"
      ```



#### vyos1のeth1に割り当てられているアドレスの修正
`vyos1`にsshログインし，`configure`で設定モードに入る．
``` shell-session
delete interface ethernet eth2 address 192.168.110.1/31
set interface ethernet eth2 address 192.168.110.1/30
```
を設定

#### vyos1で，IS-ISインタフェースのTypeを修正
`vyos1`にsshログインし，`configure`で設定モードに入る．
`set protocols isis interface eth1 network point-to-point`を設定

#### vyos1で，IS-ISのlevelを修正
`vyos1`にsshログインし，`configure`で設定モードに入る．
下記コマンドを入力
``` shell-session
set protocols isis level level-2
delete protocols isis redistribute ipv4 connected level-1
set protocols isis redistribute ipv4 connected level-2
```

#### vyos2でConnectedの経路をIS-ISで再配布
`vyos2`にsshログインし，`configure`で設定モードに入る．
`set protocols isis redistribute ipv4 connected level-2`を設定

#### 設定の永続化
vyosで設定を変更・追加・削除したのち，
`commit`および`save`を実行

## 採点基準

- host1-1で`ping 192.168.120.2`，host2で`ping 192.168.110.2`を実行し，疎通性を確認できる：90%
- 設定が永続化されている：10%

## 講評

本問は基礎的な要因がいくつか組み合わさった問題ですが，想定より完答数が少なかったです．
全ての要件を満たせていなかったり，設定保存のための`save`の実行がなされていない解答が多かったため，部分点について慎重に吟味すべきだったと思います．
