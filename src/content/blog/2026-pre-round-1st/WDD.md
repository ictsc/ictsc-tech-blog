---
title: "ICTSC2026 一次予選 問題解説: 問12"
description: "ICTSC2026 一次予選 問題解説: 問12"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/wdd"
draft: false
renderer: "md"
sticky: false
---

## 問12

図のネットワークではOSPFv2が動作しており、Area 10はNSSAとして構成されている。
R3は、R5のLoopback0が属する`172.16.100.0/24`への静的経路をOSPFv2へ再配送している。

また、各OSPFルータ間のネイバー関係はすべてFULL状態で正常に確立している。

![](/images/2026-pre-round-1st/WDD-001.png)

![](/images/2026-pre-round-1st/WDD-002.png)

現在、R1からR5のLoopback0（`172.16.100.1`）への疎通が確立できない。

以下は、各ルータで取得したOSPFデータベースおよびルーティングテーブルの抜粋である。図は4分割されており、右下にはR1のルーティングテーブルを示す。

![](/images/2026-pre-round-1st/WDD-003.png)

以下は、R3-R4間で取得したOSPF Link State Updateパケットである。

![](/images/2026-pre-round-1st/WDD-004.png)

以下は、R4-R1間で取得したOSPF Link State Updateパケットである。

![](/images/2026-pre-round-1st/WDD-005.png)

提示されたトポロジ、IPアドレス表、showコマンドの実行結果、およびWiresharkのパケットキャプチャを確認し、この障害の原因として最も適切なものを次から1つ選べ。

なお、showコマンドの実行結果は、可読性向上のため一部を抜粋している。

### 選択肢（択一選択）

1. R2がNSSA Translatorとして選出されていないため、外部経路がType 5 LSAとしてArea 0へ広告されていない。
2. R1からType 5 LSAのAdvertising Routerである`4.4.4.4`への経路が存在しないため、外部経路を利用できない。
3. Type 5 LSAのForwarding Addressに`3.3.3.3`が設定されており、`0.0.0.0`ではないため、外部経路を利用できない。
4. Type 7 LSAと変換後のType 5 LSAでAdvertising Routerが異なるため、同一の外部経路として認識されていない。
5. R1に、Type 5 LSAで指定されたForwarding Address `3.3.3.3`へ到達するための有効なOSPF経路が存在しない。
6. R3が生成したType 7 LSAのP-bitが設定されていないため、Type 5 LSAへの変換対象になっていない。

### 正解

5

### 解説

1. 不正解：R4がType 7をType 5へ正常に変換し、Area 0へ広告できているため、R2がTranslatorでないことは障害原因ではない。
2. 不正解：Forwarding Addressが0.0.0.0以外の場合、外部経路の計算には、そのアドレスへのOSPF内部経路が必要である。
3. 不正解：Type 7からType 5への変換時に、Advertising RouterがTranslatorであるR4に変わるのは正常な動作である。
4. 不正解：Link State IDはどちらも172.16.100.0であり、同じ外部ネットワークを表しているのでType 7からType 5へ変換してAdvertising Routerが異なっても大丈夫である。
5. **正解**：R1が受信したType 5 LSAにはForward Address: 3.3.3.3と指定されている。しかし、R1のOSPFルーティングテーブルには3.3.3.3/32への経路が存在しない。したがって、Forwarding Addressへ到達できず、172.16.100.0/24を外部経路として利用できない。
6. 不正解：R3→R4間のWiresharkでは、Type 7 LSAのOptionsに(P) Propagateが表示されており、P-bitは設定されている。また、R1では実際にType 5 LSAが確認できるため、Type 7→Type 5変換も成功している。
