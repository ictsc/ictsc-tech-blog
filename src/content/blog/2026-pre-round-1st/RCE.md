---
title: "ICTSC2026 一次予選 問題解説: 問20"
description: "ICTSC2026 一次予選 問題解説: 問20"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/rce"
draft: false
renderer: "md"
sticky: false
---

## 問20

### 概要

Cisco Nexus 9000 シリーズ (NX-OS 10.4(4)) のリーフスイッチ配下で、Hopper世代のGPU ノード間の RoCEv2 通信を lossless 化した。DSCP 26 を no-drop クラスに割り当て、PFC と ECN を設定し、対象ポートの MTU を 9216 に引き上げた。

症状: RoCE の path MTU が 1024 のときだけ通信が成立し、2048 / 4096 では失敗する。NCCL の集団通信は断続的にハングする。

### 提示情報

**資料1: 各種設定 (抜粋)**
```
sw-leaf# show running-config ipqos
version 10.4(4) Bios:version 05.51
policy-map type network-qos roce-nq-policy
  class type network-qos c-8q-nq3
    pause pfc-cos 3
  class type network-qos c-8q-nq7
  class type network-qos c-8q-nq6
  class type network-qos c-8q-nq5
  class type network-qos c-8q-nq4
  class type network-qos c-8q-nq2
  class type network-qos c-8q-nq1
  class type network-qos c-8q-nq-default
    mtu 9216
policy-map type network-qos custom-8q-nq-policy
  class type network-qos c-8q-nq3
    pause pfc-cos 3
    mtu 9216
  class type network-qos c-8q-nq7
  class type network-qos c-8q-nq6
  class type network-qos c-8q-nq5
  class type network-qos c-8q-nq4
  class type network-qos c-8q-nq2
  class type network-qos c-8q-nq1
  class type network-qos c-8q-nq-default
    mtu 9216

class-map type qos match-any CNP
  match dscp 48
class-map type qos match-any NO-LOSS
  match dscp 26
policy-map type qos QOS_classification
  class NO-LOSS
    set qos-group 3
  class CNP
    set qos-group 7
  class class-default
    set qos-group 0
policy-map type queuing custom-8q-out-policy
  class type queuing c-out-8q-q7
    priority level 1
  class type queuing c-out-8q-q3
    bandwidth remaining percent 99
    random-detect minimum-threshold 150 kbytes maximum-threshold 3000 kbytes drop-probability 100 weight 0 ecn
  class type queuing c-out-8q-q-default
    bandwidth remaining percent 1
system qos
  service-policy type network-qos roce-nq-policy
  service-policy type queuing output custom-8q-out-policy

sw-leaf# show running-config interface Ethernet1/13
interface Ethernet1/13
  description /* gpu-node-01 rail1 */
  switchport
  switchport access vlan 10
  mtu 9216
  priority-flow-control mode on
  service-policy type qos input QOS_classification
  no shutdown

sw-leaf# show interface Ethernet1/13 | include -i MTU
  MTU 9216 bytes, BW 400000000 Kbit , DLY 10 usec

sw-leaf# show interface Ethernet1/13 priority-flow-control
============================================================
Port               Mode Oper(VL bmap)  RxPPP      TxPPP
============================================================
Ethernet1/13       On   On  (8)       0          0
```

**資料2: スイッチ側のキュー統計 (`ib_write_bw --tclass=104 -m 4096` を1回実行した区間の増分)**
```
Ethernet1/13  qos-group 3   Tx  +26,701 packets
                            WRED/AFD & Tail Drop Pkts  0
                            ECN Pkts                   0
```

**資料3: 受信側 GPU ノードの NIC カウンタ (同じ区間の増分)**
```
gpu-node-01# ethtool -S enp1s0f0np0 | grep -iE 'rx_crc_errors_phy|rx_1024_to_1518_bytes_phy'
     rx_crc_errors_phy:         +26,624
     rx_1024_to_1518_bytes_phy: +26,624
```

**資料4: 帯域測定**
```
gpu-node-02# ib_write_bw -d mlx5_0 --tclass=104 -m 1024 <peer>    -> 成立   370.2 Gb/s
gpu-node-02# ib_write_bw -d mlx5_0 --tclass=104 -m 2048 <peer>    -> RETRY_EXC_ERR
gpu-node-02# ib_write_bw -d mlx5_0 --tclass=104 -m 4096 <peer>    -> RETRY_EXC_ERR
```

**資料5: L2 の疎通確認**
```
gpu-node-02# ping -M do -s 8972 <peer>    -> 成功（DSCP 0）
```

**資料6: ホスト側の設定** \
netdev MTU 9000、RoCE の `active_mtu` は 4096、NCCL 側は `NCCL_IB_TC=104` (いずれも DSCP 26 に対応する traffic class 104 を使用している)。送信側・受信側とも Hopper ノードの ConnectX-7 が 400GbE でスイッチに接続され、ホストとは PCIe Gen5 x16 で接続されている。

### 設問

以下の3点について答えよ。設問 (1) と設問 (2) は記述、設問 (3) は複数選択である。

### 小問 (1)

この現象の原因を詳細に説明せよ。

#### 正解 (想定解答)

> **原因**
>
> Nexus では、インターフェースの MTU と `network-qos` のクラスの MTU が別々に決まる。\
> そのため、ポート側を `mtu 9216` にしても、トラフィッククラスごとの MTU はそれとは別に設定されている。\
> 資料1 では `mtu 9216` を持つ `custom-8q-nq-policy` が作られているが、`system qos` が実際に使っているのは `roce-nq-policy` のほうで、こちらの `class type network-qos c-8q-nq3` には `mtu` の指定が無い。\
> NX-OS の running-config は既定値を表示しないので設定行として出てこないだけで、このクラスの MTU は既定の 1500 のままである。\
> その結果、DSCP 26 から qos-group 3 に分類された RoCE のフレームのうち、path MTU 2048 / 4096 のものは、出口で 1500 バイト相当の位置で切られ、受信側で CRC 不正になる。\
> path MTU 1024 のときだけ通信できるのは、1024 バイトのペイロードならクラス MTU の 1500 に収まるためである。
>
> **切り分けの根拠**
>
> 資料2 では、スイッチ側の WRED/AFD/Tail Drop がいずれも 0 で、スイッチは 26,701 パケットを「破棄せずに送った」と報告している。\
> 一方、資料3 では受信側でほぼ同じ数 (26,624) が CRC エラーになっている。\
> 失われた割合が数 % ではなくほぼ 100 % なので、輻輳による破棄ではなく、フレームが壊されている。
>
> また、資料3 の `rx_crc_errors_phy` と `rx_1024_to_1518_bytes_phy` が完全に一致しており、壊れたフレームはすべて 1024〜1518 バイトのバケットに入っている。\
> これはフレームが決まった位置で切られている証拠で、物理層のランダムな劣化であればいろいろなサイズのバケットに散らばるはずである。\
> さらに資料5 で DSCP 0 の 9000 バイトを超える ping が通るので、配線とインターフェース MTU には問題が無く、問題は qos-group 3 だけで起きていると絞り込める。

#### 得点の条件

部分点は設けず、以下の条件をすべて満たした回答を正解とした。

- インターフェースの MTU と `network-qos` クラスの MTU が独立していることを書いている
- `system qos` に適用されているのは `roce-nq-policy` であり、`mtu 9216` を持つ `custom-8q-nq-policy` は作成されているだけで適用されていないことを指摘している
- 適用中の `roce-nq-policy` の `c-8q-nq3` には `mtu` の指定が無く既定の 1500 のままで、そのため 2048 / 4096 のフレームが打ち切られることを書いている
- 根拠として、資料2 でスイッチ側の破棄カウンタが 0 であることに触れている
- 根拠として、資料3 の `rx_crc_errors_phy` と `rx_1024_to_1518_bytes_phy` が一致しており、一定の位置で切られていることを示すと説明している
- 原因を断定している。誤った原因を同格で併記した回答や、「断定できない」と留保した回答は正解としない

### 小問 (2)

資料1 において、qos-group 3 のトラフィックに実際に適用される MTU はいくつか答えよ。また、その値を確認するための実行コマンドと、予想される出力結果を示せ。

#### 正解 (想定解答)

> 1500 バイトである。\
> `system qos` に適用されているのは `roce-nq-policy` で、その `c-8q-nq3` には `mtu` の指定が無いため、NX-OS の既定値の 1500 が使われている。
>
> 確認には、running-config ではなく「システムに実際に適用されている内容」か「ハードウェアに書き込まれた値」を表示するコマンドを使う。
>
> ```
> sw-leaf# show policy-map system type network-qos
> ```
>
> 出力では、適用中のポリシーが `roce-nq-policy` で、その `class type network-qos c-8q-nq3` の MTU が `1500` と表示される (`custom-8q-nq-policy` は出てこない)。
>
> または、
>
> ```
> sw-leaf# show queuing interface Ethernet1/13
> ```
>
> で、qos-group 3 に対してハードウェアに書き込まれた MTU が 1500 であることを確認してもよい。
>
> `show running-config` は既定値を表示しないので、これだけでは判断できない。

#### 得点の条件

部分点は設けず、以下の条件をすべて満たした回答を正解とした。

- qos-group 3 に適用される MTU を 1500 と答えている
- 適用中のポリシーまたはハードウェアの値を出すコマンド (`show policy-map system type network-qos`、`show queuing interface <if>` など) と、そこに `c-8q-nq3` の MTU が 1500 と出ることの両方を書いている。`show running-config ipqos all` の場合は、適用中のポリシーが `roce-nq-policy` であることと、その `c-8q-nq3` に `mtu 1500` が出ることの両方を示していればよい

### 小問 (3)

投入すべき設定および投入時の注意点として妥当なものを全て選べ。

#### 選択肢 (複数選択)

1. `system qos` に適用する network-qos ポリシーを `custom-8q-nq-policy` に差し替える
2. `roce-nq-policy` の `c-8q-nq-default` に `mtu 9216` があるため、qos-group 3 にもこの値が適用されており、クラス MTU の追加設定は不要である
3. 適用中の `roce-nq-policy` の `class type network-qos c-8q-nq3` に `mtu 9216` を追加する
4. `custom-8q-nq-policy` に `mtu 9216` がすでに書かれているため、新たに投入すべき設定は無い
5. インターフェース `Ethernet1/13` の `mtu` を 9216 に変更する
6. `Ethernet1/13` に network-qos ポリシーを個別に適用し、当該ポートだけ qos-group 3 の MTU を 9216 にする
7. `roce-nq-policy` に `mtu 9216` を追記したあと、`system qos` に `service-policy type network-qos roce-nq-policy` を再投入しないと反映されない
8. `custom-8q-out-policy` の `random-detect` の閾値を引き上げ、ECN マークによる速度低下を抑制する
9. 送信側の RoCE の `active_mtu` を 2048 に下げ、クラス MTU に収まるようにする
10. ホスト側で RoCE の `active_mtu` を 1024 に固定し、スイッチの設定は現行のまま運用する
11. いずれの方法でも `system qos` のバッファとヘッドルームの再計算を伴い、数百 ms から数秒程度の通信断が起こりうるため、保守枠で投入する
12. 変更対象が `system qos` のポリシー定義だけなので、トラフィックを止めずに投入できる

#### 正解

1, 3, 11

#### 得点の条件

完答のみ。

### 解説

**本問は物理層の問題ではない**

資料5 で DSCP 0 の 9000 バイトを超える ping が通っているので、配線もインターフェースの MTU (9216) も問題が無い。\
CRC エラーが出ているから物理層の問題だと考えがちだが、本問では該当しない。

ただし、資料5 で確かめられているのは qos-group 0 の経路だけで、qos-group 3 で実際に使われる MTU については何も分からないため、ジャンボフレームの ping が通るから MTU は問題ないと考えてしまうと、原因にたどり着けない。

**クラスごとの MTU**

path MTU によって結果が変わり (1024 は通り、2048 以上は失敗する) 、DSCP によっても結果が変わる (DSCP 0 は 9000 バイトでも通る) が、この2つが同時に起きるのは、トラフィッククラスごとに MTU が制限されている場合である。\
Nexus ではインターフェースの MTU と `network-qos` のクラスの MTU が別々に決まるので、ポート側だけ 9216 にしても、no-drop クラスの MTU は既定の 1500 のままになる。

**`mtu 9216` は書かれているが使われていない**

資料1 には `custom-8q-nq-policy` があり、その `c-8q-nq3` には `mtu 9216` が入っている。\
しかし `system qos` が使っているのは `roce-nq-policy` のほうで、こちらには `mtu` の行が無い。\
ポリシーを作って中身も書いたが、`system qos` で使うポリシーを差し替えていない、という状況である。\
ここで、NX-OS の running-config は既定値を表示しないので、使われているポリシーの `c-8q-nq3` に `mtu 1500` とは表示されないため、設定が書かれているかどうかではなく、どの設定が実際に使われているかを確認せねばならない。

そのため、確認する際に `show running-config` では確認しきれず、`show policy-map system type network-qos` のようにシステムで実際に使われている内容を表示するコマンドか、`show queuing interface` のようにハードウェアに書き込まれた値を表示するコマンドを使う必要がある。

**CRC エラーのサイズがそろう理由**

切られたフレームは、クラス MTU の 1500 に L2 ヘッダと FCS を足した 1518 バイト前後になるので、受信側では 1024〜1518 バイトのバケットに入る。\
1つのバケットに集中していること自体が、決まった位置で切られてしまっていることを示している。\
これが物理層のランダムな劣化であれば、いろいろなサイズのバケットに散らばる。

**投入時の注意**

`network-qos` の MTU の変更も、システムで使う network-qos ポリシーの差し替えも、`system qos` 全体のバッファの再計算を伴う。\
Nexus ではバッファやキューの割り当てが変わるため、数百 ms から数秒程度の通信断が起こりうる。\
RoCE 以外の通信も同じスイッチを通る場合は、保守枠で投入したほうがよい。

**実機での確認について**

Cisco の設定ガイド (NX-OS 10.4(x)) には「network-qos の MTU は no-drop クラスのバッファ割り当てに使われ、ジャンボフレームのための調整は不要」と書かれている。\
しかし実機の Nexus 9364C-GX (NX-OS 10.4(4)) では、no-drop クラスの MTU を既定の 1500 のままにしていると、それより長いフレームが途中で切られ、受信側で CRC エラーになることが確認されている。

**小問 (3) の各選択肢**

| 選択肢 | 正誤 | 理由 |
| --- | --- | --- |
| 1 | 正 | `system qos` で使うポリシーを、`c-8q-nq3` に `mtu 9216` を持つものへ切り替える |
| 2 | 誤 | `c-8q-nq-default` はほかのクラスに当てはまらなかった通信のためのクラスで、qos-group 3 には適用されない |
| 3 | 正 | 2つのポリシーは `mtu` の行以外は同じなので、1 と 3 のどちらでも結果と副作用はほぼ変わらない。設問は「投入すべき設定および投入時の注意点として妥当なもの」を問うているので、互いに代わりになる 1 と 3 はどちらも選ぶ |
| 4 | 誤 | `custom-8q-nq-policy` は作られているだけで、`system qos` では使われていない |
| 5 | 誤 | 資料1 のとおり、すでに 9216 になっている。インターフェースの MTU とクラスの MTU は別物である |
| 6 | 誤 | NX-OS の network-qos ポリシーはシステム単位でしか適用できず、インターフェースごとには適用できない |
| 7 | 誤 | 使われている policy-map を編集すると、すぐに反映される。`service-policy` を入れ直す必要は無い |
| 8 | 誤 | 資料2 の ECN Pkts は 0 で、ECN のマークは起きていない |
| 9 | 誤 | クラス MTU は 1500 なので、2048 でも収まらない。1024 まで下げないと通信できない |
| 10 | 誤 | 症状を避けているだけで、lossless 化とジャンボフレームを使うという目的をあきらめている |
| 11 | 正 | network-qos ポリシーの差し替えも、クラス MTU の変更も、どちらもバッファの割り当て直しを伴う |
| 12 | 誤 | 11 の逆で、バッファの再計算による通信断が起こりうる |

### 講評

各小問の正解チーム数は次のとおり。

| 小問 | 正解チーム数 / 回答チーム数 |
| --- | ---: |
| (1) | 21 / 46 |
| (2) | 40 / 46 |
| (3) | 38 / 45 |

(1) はクラス MTU の不整合までは多くのチームが指摘できていたが、根拠として資料3 の 2 つのカウンタが一致していることを挙げた回答は半分以下であり、資料2 の Tx と資料3 の CRC を比べてしまう取り違えも目立った。\
また、原因を挙げつつ「断定できない」と留保した回答は不正解としている。

(2) はよく解けていた。\
不正解だったのは、予想出力が無いもの、MTU を 1024 と答えたもの、使われているポリシーではない値を表示するコマンドを挙げたものだった。

(3) は 1, 3, 11 をそのまま選べたチームが多かった。\
誤答で多かったのは、選択肢7 (`service-policy` の再投入が必要) を加えたもので、3 チームあった。
