---
title: "ICTSC2026 一次予選 問題解説: 問9"
description: "ICTSC2026 一次予選 問題解説: 問9"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/gck"
draft: false
renderer: "md"
sticky: false
---

## 問9

図1および表1は、PC1からServerへ通信を行うネットワーク構成である。
PC1からServerへの通信を行うため、R1では静的NATが設定されている。

![](/images/2026-pre-round-1st/NAT-001.png)

![](/images/2026-pre-round-1st/NAT-002.png)

しかし、PC1からServerへのpingは失敗した。
R1で `show ip nat translations` を実行したところ、以下の結果が得られた。

![](/images/2026-pre-round-1st/NAT-003.png)

このとき、R1に設定すべき正しい静的NATの設定コマンドを次から1つ選べ。

なお、本問題ではCisco IOSを搭載したルータを使用し、設定およびコマンドはCisco IOSの仕様に従うものとする。

### 選択肢（択一選択）

1. `ip nat inside source static 192.168.1.1 100.1.1.2`
2. `ip nat inside source static 100.1.1.2 192.168.1.1`
3. `ip nat inside source static 100.1.1.1 192.168.1.1`
4. `ip nat inside source static 192.168.1.1 100.1.1.1`
5. `ip nat inside source static 192.168.1.1 192.168.1.10`
6. `ip nat inside source static 192.168.1.10 192.168.1.1`

### 正解

4

### 解説

今回の問題で使用する静的NATの設定コマンドは以下のとおりである。

ip nat inside source static　<内部ローカルアドレス>　<内部グローバルアドレス>

内部ローカルアドレスは内部ネットワークで使用される変換前のIPアドレスで、今回の問題ではPC1のIPアドレスである192.168.1.1が当てはまる。\
内部グローバルアドレスは外部ネットワークから見える変換後のIPアドレスで、今回の問題ではR1のGi0/1である100.1.1.1が当てはまる。

そのため、正解は4となる。

その他の選択肢はIPアドレスが異なるため不正解となる。

実は、、、選択肢4はコマンドの文法としては正しいものの、`100.1.1.1` はR1自身のインターフェースに設定されているIPアドレスであるため、実際にはこの設定で正常に通信することはできない。

そのため、最終的には静的NAT用のIPアドレスを別途確保できるようにサブネットを拡張する必要がある。
