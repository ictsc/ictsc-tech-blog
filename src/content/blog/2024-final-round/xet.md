---
title: "ICTSC2024 本戦 問題解説: [XET] 遠く離れても一緒にいたい"
description: "ICTSC2024 本戦 問題解説: 遠く離れても一緒にいたい"
tags: [ICTSC2024,問題解説,ネットワーク関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/xet"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

陽紫くんが所属している研究室に新たな部屋 room-A が設けられることになった。もともとあった部屋 room-B と room-A は離れた位置にあるため、それぞれ違うネットワークになってしまう。

陽紫くんは同じ研究室の VXLAN 先輩に、「離れた二つの部屋を同じネットワークにしたい」と相談したところ、「VXLAN を使えば離れていても同じ L2 空間に出来るよ！」とアドバイスをもらった。

陽紫くんは VXLAN 先輩のアドバイス通りに VXLAN を使って L2 延伸を試みたが、どうにも上手くいかない。陽紫くんは再度 VXLAN 先輩にアドバイスをもらおうとしたが、彼は遠く離れた国に旅に出てしまい、連絡が取れない。

どうか彼らに変わって原因を特定し、解決策を模索して欲しい！

## 前提条件

- 静的経路を追加しないこと
- 全てのホストに割り当てられた IP アドレスを変更・追加・削除してはいけない
- トポロジー図に書かれたホストのみでネットワークは構成されている
- 新たにサービスを動作させては行けない
- 既に動作しているサービスを停止・無効化をしてはいけない

## 初期状態

hostA から hostB に ping を実行すると，`Destination Host Unreachable`となる

``` shell-session
ictsc@hostA:~$ ping 192.168.100.12
From 192.168.100.11 icmp_seq=1 Destination Host Unreachable
From 192.168.100.11 icmp_seq=2 Destination Host Unreachable
From 192.168.100.11 icmp_seq=3 Destination Host Unreachable
From 192.168.100.11 icmp_seq=4 Destination Host Unreachable
From 192.168.100.11 icmp_seq=5 Destination Host Unreachable
```

## 終了状態

- hostA で `$ ping 192.168.100.12`を実行して疎通がとれる
- ホストを再起動しても疎通性がある

## ネットワーク図

![](/public/images/2024-final-round/xet.png)

---

## 解説

この問題はUDPポート4789宛のパケットが，routerCに設定されたファイアウォールによりドロップされることが原因です．

VXLANでは，送信元側でイーサネットフレームをUDP/IPでカプセル化します．

routerCではnftables.serviceが動作しています．
``` shell-session
ictsc@routerC:~$ systemctl | grep tables
  nftables.service                                                                                         loaded active exited    nftables
```

nftablesの設定を確認すると，udpパケットがドロップされる設定になっています．
``` shell-session
  ct state { established, related } meta l4proto tcp counter packets 0 bytes 0 accept
  tcp dport 22 counter packets 0 bytes 0 accept
  meta l4proto icmp counter packets 0 bytes 0 accept
  counter packets 1 bytes 84 drop
```

制約により，再起動後も設定が残る必要があるので，`/etc/nftables.conf`に設定を入れます．
``` shell-session
  ct state { established, related } meta l4proto tcp counter packets 0 bytes 0 accept
  tcp dport 22 counter packets 0 bytes 0 accept
  meta l4proto icmp counter packets 0 bytes 0 accept
  + udp dport 4789 counter packets 0 bytes 0 accept
  counter packets 1 bytes 84 drop
```

最後に，nftables.serviceを再起動すると，hostAからhostBに対してpingが成功します．
``` shell-session
ictsc@hostA:~$ ping 192.168.100.12
PING 192.168.100.12 (192.168.100.12) 56(84) bytes of data.
64 bytes from 192.168.100.12: icmp_seq=1 ttl=64 time=2.45 ms
64 bytes from 192.168.100.12: icmp_seq=2 ttl=64 time=1.40 ms
64 bytes from 192.168.100.12: icmp_seq=3 ttl=64 time=1.52 ms
64 bytes from 192.168.100.12: icmp_seq=4 ttl=64 time=1.34 ms
64 bytes from 192.168.100.12: icmp_seq=5 ttl=64 time=1.21 ms
```

### 想定解法
1. `sudo vi /etc/nftables.conf`で
    ipテーブルのNAME_FORWARD-FILTERチェーンに，
    `udp dport 4789 counter packets 0 bytes 0 accept`を追記
2. `sudo systectl restart nftables.service`でnftables再起動

## 採点基準

- host1で`ping 192.168.100.12`を実行して成功する: 100%

## 講評

本問はVXLANパケットがファイアウォールによりドロップされていることが原因でした．

VXLANというネットワーク初学者には馴染みのないプロトコルを使用していたためか，初日の解答は0，二日目も解答を提出したチームは3つのみでした．

問題作成当初はUDPパケットだけでなく，ICMPパケットもドロップさせていたのですが，問題テスト時点で，VTEP間でpingを実行するとパケットがドロップ→ファイアウォールが怪しい，と即座に見抜かれてしまったのでUDPパケットのみをドロップさせる形式にしました．難解なVXLANを使用することを考えると，初期の設定で良かったかなという気がしました．

また，vyosではファイアウォールはnftablesで動作しています．今回，nftablesに直接設定が投入されていましたが，意地悪だったかもしれません．
