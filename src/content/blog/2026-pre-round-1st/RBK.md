---
title: "ICTSC2026 一次予選 問題解説: 問8"
description: "ICTSC2026 一次予選 問題解説: 問8"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/rbk"
draft: false
renderer: "md"
sticky: false
---

## 問8

LAN-A(10.0.1.0/24)からLAN-B(10.0.2.0/24)への通信において、ICMP(ping)は正常に応答するが、HTTPなどのTCP通信はタイムアウトするとの問い合わせがあった。
ネットワーク構成および各機器のルーティング情報を確認し、設問に答えよ。

### 前提

**【ネットワーク構成】**

- R1(Cisco IOS)・R2(Juniper Junos)は、Path A(OSPF Area 0)およびPath B(eBGP, AS65001-AS65002)の2本のリンクで接続されている。
- LAN-A(10.0.1.0/24)・LAN-B(10.0.2.0/24)は、それぞれ両方のリンク上で相互に広告されており、R1・R2ともに相手側LANへの経路をOSPFとeBGPの両方から学習している。

**【ルーティング要件】**

- OSPF・eBGPともにネイバー関係は正常に確立しており、経路広告も正常に行われている。
- 経路選択に用いるAdministrative Distance(Cisco)およびRoute Preference(Juniper)は、両機器とも初期設定値から変更されていない。(distanceコマンド、protocol-preferenceステートメント等による手動変更は行われていない)
- BGPのlocal preference・MED等の属性にも調整はない。
- スタティックルート・デフォルトルートなど、OSPF/eBGP以外の経路は存在しない。

**【ファイアウォール要件】**

- Path B上には1台のステートフルファイアウォールが設置されており、通過するトラフィックに対してセッションを追跡し、TCPのOut of StateなPacketは破棄する。
- Path A上にはファイアウォールは設置されていない。
- ファイアウォールのアクセス制御ポリシー自体に設定ミスはなく、双方向の通信を許可する設定になっている。

### トポロジ

![](/images/2026-pre-round-1st/rbk-topology.png)

### 小問(1)

LAN-A(10.0.1.0/24)からLAN-B(10.0.2.0/24)への通信において、R1・R2それぞれが現在選択している経路の組み合わせとして正しいものを選べ。

#### 選択肢（択一選択）

1. R1: Path A(OSPF) / R2: Path A(OSPF)
2. R1: Path B(eBGP) / R2: Path A(OSPF)
3. R1: Path A(OSPF) / R2: Path B(eBGP)
4. R1: Path B(eBGP) / R2: Path B(eBGP)

#### 正解

2

### 小問(2)

HTTPなどのTCP通信のみタイムアウトする原因として、最も適切なものを選べ。

#### 選択肢（択一選択）

1. R1・R2間で経路が非対称となり、戻りパケットがFWを経由しないため、FWがTCPセッションを正しく追跡できない。
2. TCPのMSSが経路MTUより大きく、HTTP通信のみフラグメントが破棄されている。
3. OSPFとeBGPで異なる経路が選択されているため、TTLが不足してTCPパケットのみ破棄されている。
4. eBGP経由の経路はOSPFよりAdministrative Distanceが小さいため、TCPコネクションが確立できない。

#### 正解

1

### 解説

#### 小問(1)

正解は 2 です。経路選択は、まずAdministrative Distance(Cisco)/Route Preference(Juniper)の小さい方が優先されます。初期値は機器ごとに異なるため、同じOSPFとeBGPでも、R1とR2で選ばれる経路が変わります。

| 機器 | OSPF | eBGP | 選択される経路 |
| --- | --- | --- | --- |
| R1(Cisco IOS) | AD 110 | AD 20 | Path B(eBGP) |
| R2(Juniper Junos) | Preference 10 | Preference 170 | Path A(OSPF) |

この結果、LAN-AからLAN-Bへの往路はR1がPath B(FW経由)に送り、復路はR2がPath A(FWなし)に送るという、非対称ルーティングになります。

- 選択肢1: R1のADはeBGPが20、OSPFが110なので、R1はeBGPを選びます。
- 選択肢3: R1・R2ともに逆の経路を選ぶことになり、実際の初期値と合いません。
- 選択肢4: R2はOSPF(Preference 10)がeBGP(Preference 170)より優先されるため、Path Bは選びません。

#### 小問(2)

正解は 1 です。往路はFWを通りますが、復路はFWを通らないため、FWはTCPの3ウェイハンドシェイクの一部(SYN-ACKとACK)を見られません。ステートフルFWは、SYNを見ただけでセッションが完成しない状態のまま後続のパケットをOut of Stateとして破棄します。ICMPはセッション状態を厳密に追跡されないため、非対称でも通ります。

- 選択肢2: MSSやMTUの問題なら、ICMPの小さなpingは通ってもHTTPの大きなパケットだけ落ちるケースはありますが、本問ではFWのOut of State破棄が前提として明示されており、原因は経路の非対称性です。
- 選択肢3: TTLはホップ数で減る値で、経路が異なることだけでTCPパケットのみ破棄される原因にはなりません。ICMPも同じTTLの影響を受けます。
- 選択肢4: ADはルータ内の経路選択に使う値で、TCPコネクションの確立可否とは無関係です。