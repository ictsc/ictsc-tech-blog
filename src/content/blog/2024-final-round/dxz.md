---
title: "ICTSC2024 本戦 問題解説: [DXZ] IPv6の自動アドレス設定ってややこしい"
description: "ICTSC2024 本戦 問題解説: IPv6の自動アドレス設定ってややこしい"
tags: [ICTSC2024,問題解説,ネットワーク関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/dxz"
draft: false
renderer: "md"
sticky: false
---

# 問題文
## 概要

小村君は自宅のネットワークを, IPv6 mostly の環境にしたいと考えている.
ひとまず, 検証として VyOS で IPv6 アドレスの自動設定を試してみることにした. DHCPv6 で自動設定を行ったところ, 自身のスマートフォンにユニークローカル IPv6 ユニキャストアドレスが振られていないことに気づいた.

以下の作業をし, その手順を報告してください.

- dev(スマートフォン)に`fd00:ad:e:25::/64` の IPv6 アドレスと DNS サーバ情報が自動設定されるように router のトラブルシューティングをする.
- dev(スマートフォン)から router へ`router.ictsc.internal`, server へ`server.ictsc.internal`で疎通できるようにトラブルシューティングをする.

※なお, dev はスマートフォンの IPv6 設定を模したものである.

## 前提条件

- dev(スマートフォン)の設定を変更してはならない
- ネットワークの構成ノード・アドレスはトポロジー図に示されたものを使うこと
- アドレス自動設定は、router の VyOS で設定すること
- DNS サーバ（名前解決）は、server にすでに導入済みの unbound を使用すること

## 初期状態

- dev(スマートフォン)から以下に疎通できない.
  - router への`$ ping6 fd00:ad:e:25::2`
  - router への`$ ping6 router.ictsc.internal`
  - server への`$ ping6 fd00:ad:e:25::3`
  - server への`$ ping6 server.ictsc.internal`

## 終了状態

- dev(スマートフォン)に`fd00:ad:e:25::/64` の IPv6 アドレスが自動で振られている.
- dev(スマートフォン)から以下のコマンドで疎通できる.
  - router への`$ ping6 fd00:ad:e:25::2`
  - router への`$ ping6 router.ictsc.internal`
  - server への`$ ping6 fd00:ad:e:25::3`
  - server への`$ ping6 server.ictsc.internal`

## ネットワーク図
![image.png](https://i.gyazo.com/ff2795f616a8c4d9b320bf38a32f0482.png)
---

## 解説

この問題は、IPv6アドレス自動設定不良および名前解決不良、serverアドレス設定忘れの三点をトラブルとして設定しています。

routerを確認するとDHCPv6の設定は、DHCPv6のパケットを送出するインターフェースが間違っていることが読み取れます。そのため、まず以下のように修正することが考えられます。
`set service dhcpv6-server shared-network-name 'DHCPV6_POOL' interface 'eth1'`
ただし、この設定をしてもdev（スマートフォン）にはアドレスが振られません。そこで、devの設定(netplan)を確認するとDHCPv6が拒否されていることがわかります。制限事項でdevの設定は変更できないため、managed-flagとother-config-flag（m、oフラグ）を立てたRouter Advertisement（RA）を送出し、devがDHCPv6を受け入れるよう以下の設定を行うとアドレスが自動で振られ、トラブルを解決することができます。
`set service router-advert interface eth1 prefix fd00:ad:e:25::/64`

`set service router-advert interface eth1 managed-flag`

`set service router-advert interface eth1 other-config-flag`

上記のトラブルには、SLAAC（Stateless Address Autoconfiguration）およびRDNSS（Recursive DNS Server）オプションを使用する別解も存在します。RAの設定で指定のプレフィックスを、RDNSSオプションの設定でDNSの情報を広報することによってトラブルを解決できます。
`set service router-advert interface eth1 prefix fd00:ad:e:25::/64`

`set service router-advert interface eth1 name-server fd00:ad:e:25::3`

名前解決のトラブルについては、server上でtcpdumpを用いて疎通確認をすると、ファイアウォールによって通信が拒否されていることが推測できます。そこでserver上の`firewalld`に以下の変更を加え、DNSの通信を許可することで名前解決が可能となります。

```
[root@server system-connections]# sudo firewall-cmd --permanent --add-service=dns
[root@server system-connections]# sudo firewall-cmd --reload
```

また、serverに指定のアドレスが振られていないためpingが飛びません。そのため、次のコマンド等でアドレスを追加、更新します。
```
sudo nmcli connection modify "Wired connection 1" ipv6.addresses "fd00:ad:e:25::3/64"

# 設定を適用（接続を再起動）
sudo nmcli connection down "Wired connection 1"
sudo nmcli connection up "Wired connection 1"
```

## 採点基準

- devの設定が変更されている: 0点
- dev(スマートフォン)に`fd00:ad:e:25::/64` のIPv6アドレスが自動で振られている: +100点
- dev(スマートフォン)から以下のコマンドで疎通確認できる: +50点
    - routerへの`$ ping6 fd00:ad:e:25::2`
    - routerへの`$ ping6 router.ictsc.internal`
    - serverへの`$ ping6 fd00:ad:e:25::3`
    - serverへの`$ ping6 server.ictsc.internal`

## 講評
IPv6のアドレス自動設定について、理解を深めてもらいたく問題を作成しました。
本番では、想定するほど回答してもらえなかったり、完答が少なかったりしたため、もうすこし配点を考慮する必要があったかと思いました。
また、コメントとして、ルータのインターフェースが問題に書かれておらず検証をして確かめなくてはならず、わかりにくかったとの声も聞かれました。
予選とは異なり、より実際の状況に近くなり難易度も上がっていたのではないかと思いました。

