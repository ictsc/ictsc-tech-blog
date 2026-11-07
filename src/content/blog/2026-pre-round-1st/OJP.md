---
title: "ICTSC2026 一次予選 問題解説: 問44"
description: "ICTSC2026 一次予選 問題解説: 問44"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/ojp"
draft: false
renderer: "md"
sticky: false
---

## 問44

以下のようにL3スイッチが設定されています。

```text
interface GigabitEthernet 1/1
  switchport mode access
  switchport access vlan 20
!
interface GigabitEthernet 1/2
  switchport mode access
  switchport access vlan 20
!
interface Vlan 20
  no shutdown
  ip address 192.168.20.1 255.255.255.0
!
interface Vlan 30
  no shutdown
  ip address 192.168.30.1 255.255.255.0
!
ip routing
```

各ポートには以下の端末が接続されています。

- PC-A：`192.168.30.10/24`
- PC-B：`192.168.30.20/24`

デフォルトゲートウェイは設定されていません。

このとき、正しいものを1つ選びなさい。

### 選択肢（択一選択）

1. PC-AとPC-Bは通信できない。VLAN 20に所属する端末には、`192.168.20.0/24`のIPアドレスを設定する必要があるためである。
2. PC-AとPC-Bは通信できない。`192.168.30.0/24`はVLAN 30のSVIに設定されているネットワークであるため、VLAN 20上では利用できない。
3. PC-AとPC-Bは通信できる。同一VLANかつ同一IPサブネットに所属しているためである。
4. PC-AとPC-Bは通信できない。デフォルトゲートウェイが設定されていないため、L3スイッチによるルーティングを利用できない。

### 正解

3

### 解説

PC-Aが接続されているGigabitEthernet 1/1と、PC-Bが接続されているGigabitEthernet 1/2は、どちらもVLAN 20のアクセスポートとして設定されている。また、PC-A（`192.168.30.10/24`）とPC-B（`192.168.30.20/24`）は、同じIPサブネットである`192.168.30.0/24`に所属している。

PC-AからPC-Bに対して通信を行う際のフローは以下の通りである。
PC-AはPC-BのIPアドレスを同一サブネット内の宛先と判断するため、デフォルトゲートウェイを経由せず、ARPでPC-BのMACアドレスを解決する。ARP要求はVLAN 20内にブロードキャストされ、同じVLANに接続されたPC-Bに届く。PC-BからのARP応答によってMACアドレスがわかると、以降はL3スイッチのL2転送機能によって端末間で通信できる。

PC-BからPC-Aへの通信も同様に、PC-Aを同一サブネット内の宛先と判断し、必要に応じてARPでMACアドレスを解決してL2転送で通信できる。

SVI（VLANインターフェース）に設定されたIPアドレスは、そのVLANに所属する端末のIPサブネットを制限するものではない。VLAN 20のSVIには`192.168.20.1/24`が設定され、`192.168.30.1/24`はVLAN 30のSVIに設定されているが、今回の端末間通信ではSVIを介したルーティングを利用しないため、これらの設定は通信の可否に影響しない。デフォルトゲートウェイの設定も不要である。

したがって、同一VLANかつ同一IPサブネットに所属するPC-AとPC-Bは通信できるため、正答は **3** である。
