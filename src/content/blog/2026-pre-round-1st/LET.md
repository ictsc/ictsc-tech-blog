---
title: "ICTSC2026 一次予選 問題解説: 問1"
description: "ICTSC2026 一次予選 問題解説: 問1"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/let"
draft: false
renderer: "md"
sticky: false
---

## 問1

### 概要

ルーターA (以下、RTAと呼ぶ)においてIP SLA + Object Trackingを用いた経路の自動フェイルオーバーを構成しているが、意図した通りに動作しない。以下の情報をもとに、原因を特定せよ。

### 要件（設計仕様）

本構成が満たすべき要件は次の3点である。

1. 通常時：PC1→PC2間の通信は、RTA→RTB1→RTCの経路（主経路）を使用する。
2. 障害時：RTAは自動的にRTA→RTB2→RTCの経路（副経路）へ切り替え、PC1→PC2間の通信を継続する。
3. 監視の継続性：上記の障害検知・経路切替の仕組みは設定後恒久的に有効であり、一定時間で停止してはならない。

### 環境・制約

- 機器：Cisco Router (IOS)
- RTAのみ設定変更が可能
- RTB1 / RTB2 / RTC は既に正常に設定済み
- 本環境はstatic route onlyの環境である

![](/images/2026-pre-round-1st/LET.png)

#### RTAの現在のconfig(抜粋)

```
interface GigabitEthernet0/1
 ip address 10.0.12.1 255.255.255.252
!
interface GigabitEthernet0/2
 ip address 10.0.13.1 255.255.255.252
!
ip sla 10
 icmp-echo 10.0.14.1 source-interface GigabitEthernet0/1
 frequency 5
ip sla schedule 10 start-time now
!
track 10 ip sla 10 reachability
!
ip route 192.168.20.0 255.255.255.0 10.0.12.2 track 1
ip route 192.168.20.0 255.255.255.0 10.0.13.2 210
```

```
RTA# show track 1
% Tracking object 1 not found

RTA# show ip route 192.168.20.0
Routing entry for 192.168.20.0/24
  Known via "static", distance 1, metric 0
  Routing Descriptor Blocks:
  * 10.0.12.2
      Route metric is 0, traffic share count is 1

RTA# show ip sla configuration 10
IP SLAs Infrastructure Engine-II
Entry number: 10
Type of operation: icmp-echo
Target address: 10.0.14.1
Life: 3600
Entry Ageout: never
```

### 現象

RTB1のG0/1をdownさせると、PC1→PC2間のpingは無応答となり、時間が経過しても復旧しない。このときRTA上で `show ip route 192.168.20.0` を確認すると、ネクストホップは10.0.12.2（RTB1）のままで変化していない。

### 設問

提示したシナリオを前提として、以下の1〜5のうち正しいものをすべて選べ。

### 選択肢（複数選択）

1. 現状の断絶が復旧しない直接の原因は、ip route文が参照するtrack 1が未定義であることである。これは以下のように track 番号を実在するtrack 10に合わせることで解消する。

```
no ip route 192.168.20.0 255.255.255.0 10.0.12.2 track 1
ip route 192.168.20.0 255.255.255.0 10.0.12.2 track 10
```

2. ip sla 10のicmp-echoターゲット(10.0.14.1)への到達性を確保するには、以下のスタティックルートを追加する必要がある。

```
ip route 10.0.14.0 255.255.255.252 10.0.12.2
```

3. ip sla schedule 10はlife foreverを指定しなくても、start-time nowのみでicmp-echoオペレーションは無期限に継続するため、要件3を満たすために追加のコマンドは不要である。

4. 主経路のスタティックルートからtrack指定を外し、以下のように無条件のルートに変更することで、要件2（障害発生時の自動切替）をより安定して実現できる。

```
ip route 192.168.20.0 255.255.255.0 10.0.12.2
```

5. track 10 ip sla 10 reachabilityを以下のように変更しても、要件2で求められるRTB1配下（下流）のリンク障害検知は実現できないため、この変更は解決策にならない。

```
track 10 interface GigabitEthernet0/1 line-protocol
```

### 正解

1, 2, 5

### 解説

正解：①②⑤

① 正しい　show track 1がnot foundであり、Cisco IOSでは未定義のtrackオブジェクトは常にUP扱いされる。よってRTB1のG0/1がdownしても主経路ルートは除去されない。提示したコマンドで既にip sla 10と結びついているtrack 10に統一すれば、track 10の実際の状態がルートに反映されるようになる。

② 正しい　show ip routeにもshow ip sla configurationにも10.0.14.0/30宛の経路が存在せず、icmp-echoの宛先(10.0.14.1)へパケットを送る手段がない。このスタティックルートが無いままでは、①を直してもtrack 10は常時down判定となり、正常時（要件1）にも副経路へ固定されてしまう。ネクストホップは必ず10.0.12.2（RTB1向け）を指定する必要がある。10.0.13.2（RTB2）を指定すると、RTB1のG0/1がdownしていてもRTB2経由で10.0.14.1に到達できてしまい、SLAが誤ってUP判定を出しかねない。

③ 誤り　life未指定時のデフォルトは3600秒であり、無期限には継続しない。show ip sla configuration 10にLife: 3600とある通り、1時間後にオペレーションが停止し要件3を満たさない。正しくはip sla schedule 10 life forever start-time nowが必要。

④ 誤り　track指定を外すと常時UP扱いの無条件ルートになり、要件2自体が成立しなくなる。自動切替機能が失われるため誤り。

⑤ 正しい　line-protocolでtrackできるのはRTA自身のインターフェースの物理/データリンク状態のみ。RTB1配下（RTB1-RTC間）のリンク障害はRTAのG0/1のline-protocol状態には現れない（RTA-RTB1間のリンク自体は生きているため）。要件2を満たせず、解決策にならない。
