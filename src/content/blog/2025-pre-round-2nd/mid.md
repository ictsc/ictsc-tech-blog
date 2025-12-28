---
title: "ICTSC2025 二次予選 問題解説: 半分しか伝わらない"
description: "ICTSC2025 二次予選 問題解説: 半分しか伝わらない"
tags: ["ICTSC2025", "問題解説"]
pubDate: 2025-12-27T08:41:14.623Z
slug: "2025/12/27/ictsc2025pr2/mid"
draft: false
renderer: "md"
sticky: false
---

## 概要

あなたは、2台のGWサーバーから、ルーターを経由して社内のサービスに冗長経路でアクセスできるNW構成の作成をお願いされました。
この仕事には前任の担当者がおり、Network Namespaceを用いて模擬した検証環境を作成していた途中だったみたいなのですが、担当者は既に会社におらず詳細が分かりません。
とりあえず動作確認を行ったところ、それぞれのGWからRouter側の宛先アドレス`10.10.10.10`にPingを飛ばすと、約50-100%のパケットロスが発生し、非常に不安定な状態であることが分かりました。

平常時にPingが100%通ることと、片系断でも残りの経路で疎通が継続すること（フェールオーバー）を目標に、作りかけの検証環境を完成させてください。

## 構成概要

- `setup-network.service` が作成する network namespace は `GW1`、`GW2`、`Router1`、`Router2` の4つ
- `GW1` と `GW2` は `Router1` と `Router2` にそれぞれ接続されており、192.168.70.0/24 で収容
- 目的アドレス `10.10.10.10/32` は `Router1` と `Router2` の `lo` に設定されており、どちらに届いても問題ない
- ネットワークは netplan で自動構成されており、`sudo systemctl restart setup-network.service` で初期状態に戻せる
- 大まかな構成・配線は下図の通り

![](/images/2025-pre-round-2nd/mid.png)

## 制約条件

- 上記の図から配線や機器(namespace)を追加・変更することは不可
  - 問題を解く上で一時的に構成を変更することは可能とする
- namespace名やlink名の変更は不可

## 初期状態

- service `setup-network`が起動し、netplanを用いた検証構成が起動している
- GW1及びGW2から"10.10.10.10"にPingを実行すると、約50-100%のパケットロスが発生する

## 終了状態

- 以下を満たす`ans.sh`をホームディレクトリ上に作成すること。
  - `sudo systemctl restart setup-network.service` を実行した後にans.shを実行することで、下記の条件を満たすこと
    1. GW1及びGW2から`10.10.10.10`にPingを実行すると、100%成功すること（平常系で安定していること）
    2. **GW-Router間の**いずれか1本のリンクを停止させても、GW1, GW2双方でPingが100%成功すること（フェールオーバーが動作すること）
    - 例: `GW1` - `Router1` の 接続インターフェースを down しても通信が継続して行える。

- **回答時には、ans.shとして作成したスクリプトの中身（全文）をcatコマンドなどで表示し、記述欄に含めてください**

## 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
|  mid-srv-01 | 192.168.255.71 | user | ictsc2025 |

## 確認例

### 平常時

```shell
sudo ip netns exec GW1 ping -c 10 10.10.10.10
sudo ip netns exec GW2 ping -c 10 10.10.10.10
```

### フェールオーバー動作の確認

Router1 側を一時的に切った場合の例:

```shell
sudo ip netns exec Router1 ip link set veth-rt1-gw1 down   # 片系停止
sudo ip netns exec GW1 ping -c 10 10.10.10.10              # 通信ができることを確認
sudo ip netns exec GW2 ping -c 10 10.10.10.10
sudo ip netns exec Router1 ip link set veth-rt1-gw1 up     # 復旧
```

### Tips

netnsによる検証環境の作成・削除はそれぞれ以下のコマンドで実行されます。

```shell
sudo systemctl start setup-network.service
sudo systemctl stop setup-network.service
```

各namespaceのIF名・アドレス・ルーティングなどは、`sudo ip netns exec <ns> {{任意のコマンド}}` のようにすれば確認可能です。

```shell
sudo ip netns exec <ns> ip addr
sudo ip netns exec <ns> ip route
```

----

## 解説

### 想定している解答手順

問題文に載っている配線図だけだと、手がかりが少なく、状況の把握が難しいはずです。
そこでまずは、netnsでどのようなコンフィグが投入されているのかを特定し、詳細な構成図を作成してみます。

問題文を見ると、netnsによる検証環境の作成・削除をsystemdでやっていることが分かります。
そこで、setup-network.serviceの設定ファイルを追っていくことで、問題環境の展開を行っているスクリプトファイルにたどり着きます。

```
user@baseimage-ubuntu2404:~$ cat /etc/systemd/system/setup-network.service
[Unit]
Description=ICTSC Lab Network Setup
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/opt/bin/setup-network.sh
ExecStop=/opt/bin/cleanup-network.sh

[Install]
WantedBy=multi-user.target
```

.serviceから見つけた `/opt/bin/setup-network.sh` を開いてコンフィグを確認し、詳細な構成図を作成すると、次のようになることが分かります。

![](/images/2025-pre-round-2nd/mid-solution.png)

この構成からわかることは以下の通りです

1. GWのインターフェースはbondingされている。
1. Router間のサイドリンクは存在するもののupされていない
1. Router側のIPアドレスは単独のInterfaceに紐づいている

bondingの設定に注目すると、`ip netns exec GWx ip link add bond0 type bond` となっており、bondingのmodeが指定されていません。
これは、mode 0、つまり`balance-rr`で動作することを示します。
これはラウンドロビン方式、つまり、パケットをbond0のスレーブになっているそれぞれのインターフェースに順番に送信します。
初期状態の場合、GWのbond0から、Router1, 2に向けて交互にパケットが送信されてしまうため、ARP解決が上手く行えません。これがPingが50%の確率で失敗する原因になっています。
このことは、Router1, 2にtcpdumpを仕掛けて、パケットの動きを観察することで確認できると思います。

解法は主に2通りあり、

- bondを維持しながら、Router1 - 2間のサイドリンクを活用してARP解決させる方法
- bondを廃してマルチパスルーティングを設定する方法

を想定しています。

#### 解法1 サイドリンクの活用

Router間の接続（サイドリンク）を有効にしたうえで、Router1とRouter2それぞれに **ブリッジ(br0)** を作成し、GW接続用のvethインターフェイスと **Router間のvethインターフェイス(veth-rt1-rt2, veth-rt2-rt1)** をブリッジメンバーに追加します。これにより、Router1とRouter2がL2で接続され、どちらのRouterにパケットが到達しても宛先の`10.10.10.10`に到達可能になります。

この解法においては、GW側の設定変更は不要です。

↓ ans.shの例

```shell
#!/bin/bash

echo "Applying bonding solution..."

# Router1: Enable side link and create bridge
ip netns exec Router1 ip link set veth-rt1-rt2 up
ip netns exec Router1 ip link add br0 type bridge
ip netns exec Router1 ip link set veth-rt1-gw1 master br0
ip netns exec Router1 ip link set veth-rt1-gw2 master br0
ip netns exec Router1 ip link set veth-rt1-rt2 master br0
ip netns exec Router1 ip addr del 192.168.70.11/24 dev veth-rt1-gw1 2>/dev/null || true
ip netns exec Router1 ip addr add 192.168.70.11/24 dev br0
ip netns exec Router1 ip link set br0 up

# Router2: Enable side link and create bridge
ip netns exec Router2 ip link set veth-rt2-rt1 up
ip netns exec Router2 ip link add br0 type bridge
ip netns exec Router2 ip link set veth-rt2-gw1 master br0
ip netns exec Router2 ip link set veth-rt2-gw2 master br0
ip netns exec Router2 ip link set veth-rt2-rt1 master br0
ip netns exec Router2 ip addr del 192.168.70.12/24 dev veth-rt2-gw1 2>/dev/null || true
ip netns exec Router2 ip addr add 192.168.70.12/24 dev br0
ip netns exec Router2 ip link set br0 up

echo "Configuration completed!"
```

#### 解法2 ECMPの設定

Router側の設定は解法1と同じくブリッジを構成してRouter間をL2接続します。

GW側では**bondingを削除**し、各vethインターフェイス(veth-gw1-rt1, veth-gw1-rt2等)に直接同じIPアドレスを割り当て、**ECMP(Equal-Cost Multi-Path)**ルーティングで2つのnexthopを設定します(`ip route add 10.10.10.10/32 nexthop via ... dev ... nexthop via ... dev ...`)。これにより、Linuxカーネルのマルチパスルーティング機能を使って負荷分散と冗長性を実現します。

ただし、複数のインターフェイスに同じIPアドレスを設定するため、正しくフェールオーバーさせるためには、リンクダウン時にルートを切り替えられる設定を追加する必要があります。
ignore_routes_with_linkdown などの設定を使って、ダウンしている経路を無視できるようにしてあげるとよいでしょう。

↓ ans.shの例

```shell
#!/bin/bash

echo "Applying Pure ECMP solution..."

# Router1: Enable side link and create bridge
ip netns exec Router1 ip link set veth-rt1-rt2 up
ip netns exec Router1 ip link add br0 type bridge
ip netns exec Router1 ip link set veth-rt1-gw1 master br0
ip netns exec Router1 ip link set veth-rt1-gw2 master br0
ip netns exec Router1 ip link set veth-rt1-rt2 master br0
ip netns exec Router1 ip addr del 192.168.70.11/24 dev veth-rt1-gw1 2>/dev/null || true
ip netns exec Router1 ip addr add 192.168.70.11/24 dev br0
ip netns exec Router1 ip link set br0 up

# Router2: Enable side link and create bridge
ip netns exec Router2 ip link set veth-rt2-rt1 up
ip netns exec Router2 ip link add br0 type bridge
ip netns exec Router2 ip link set veth-rt2-gw1 master br0
ip netns exec Router2 ip link set veth-rt2-gw2 master br0
ip netns exec Router2 ip link set veth-rt2-rt1 master br0
ip netns exec Router2 ip addr del 192.168.70.12/24 dev veth-rt2-gw1 2>/dev/null || true
ip netns exec Router2 ip addr add 192.168.70.12/24 dev br0
ip netns exec Router2 ip link set br0 up

# GW1: Remove bonding and configure ECMP
ip netns exec GW1 ip route del 10.10.10.10/32 via 192.168.70.11 2>/dev/null || true
ip netns exec GW1 ip route del 10.10.10.10/32 via 192.168.70.12 2>/dev/null || true
ip netns exec GW1 ip link set bond0 down 2>/dev/null
ip netns exec GW1 ip link set veth-gw1-rt1 nomaster 2>/dev/null
ip netns exec GW1 ip link set veth-gw1-rt2 nomaster 2>/dev/null
ip netns exec GW1 ip addr del 192.168.70.1/24 dev bond0 2>/dev/null || true
ip netns exec GW1 ip link del bond0 2>/dev/null
ip netns exec GW1 ip addr add 192.168.70.1/24 dev veth-gw1-rt1
ip netns exec GW1 ip addr add 192.168.70.1/24 dev veth-gw1-rt2
ip netns exec GW1 ip link set veth-gw1-rt1 up
ip netns exec GW1 ip link set veth-gw1-rt2 up
ip netns exec GW1 sysctl -w net.ipv4.conf.veth-gw1-rt1.ignore_routes_with_linkdown=1 >/dev/null
ip netns exec GW1 sysctl -w net.ipv4.conf.veth-gw1-rt2.ignore_routes_with_linkdown=1 >/dev/null
ip netns exec GW1 ip route add 10.10.10.10/32 \
  nexthop via 192.168.70.11 dev veth-gw1-rt1 weight 1 \
  nexthop via 192.168.70.12 dev veth-gw1-rt2 weight 1

# GW2: Remove bonding and configure ECMP
ip netns exec GW2 ip route del 10.10.10.10/32 via 192.168.70.11 2>/dev/null || true
ip netns exec GW2 ip route del 10.10.10.10/32 via 192.168.70.12 2>/dev/null || true
ip netns exec GW2 ip link set bond0 down 2>/dev/null
ip netns exec GW2 ip link set veth-gw2-rt1 nomaster 2>/dev/null
ip netns exec GW2 ip link set veth-gw2-rt2 nomaster 2>/dev/null
ip netns exec GW2 ip addr del 192.168.70.2/24 dev bond0 2>/dev/null || true
ip netns exec GW2 ip link del bond0 2>/dev/null
ip netns exec GW2 ip addr add 192.168.70.2/24 dev veth-gw2-rt1
ip netns exec GW2 ip addr add 192.168.70.2/24 dev veth-gw2-rt2
ip netns exec GW2 ip link set veth-gw2-rt1 up
ip netns exec GW2 ip link set veth-gw2-rt2 up
ip netns exec GW2 sysctl -w net.ipv4.conf.veth-gw2-rt1.ignore_routes_with_linkdown=1 >/dev/null
ip netns exec GW2 sysctl -w net.ipv4.conf.veth-gw2-rt2.ignore_routes_with_linkdown=1 >/dev/null
ip netns exec GW2 ip route add 10.10.10.10/32 \
  nexthop via 192.168.70.11 dev veth-gw2-rt1 weight 1 \
  nexthop via 192.168.70.12 dev veth-gw2-rt2 weight 1

echo "Configuration completed!"

```
