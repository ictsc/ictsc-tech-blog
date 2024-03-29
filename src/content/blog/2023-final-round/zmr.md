---
title: "ICTSC2023 本戦 問題解説: [ZMR] 行って帰ってiperf"
description: "ICTSC2023 本戦 問題解説: 行って帰ってiperf"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/zmr"
draft: false
renderer: "md"
sticky: false
---

ICTSC2023 本戦 問題解説: 行って帰ってiperf

# 問題文

## 概要


1Gbpsの速度のLANケーブルの速度測定をしようとして、サーバーにあるLANポート二つにLANケーブルの両端を接続しました。
この状態でNIC2からNIC1へiperfでスピードテストをしようとしたところ、20Gbpsの速度が出ました。現実的に考えると何かおかしいので、正しく速度が計測する方法（実行するコマンド等）を見つけて報告してください。
またなぜそれで動くようになったのか原因に触れてください。
再起動した後でも動くように永続化する必要はありません。

![](/images/2023-final-round/zmr.png)

### サーバーを起動
```
iperf --server --bind 198.18.0.1
```

### 別窓からスピードテスト

```
iperf --client 198.18.0.1 --bind 198.18.0.2
```

## 前提条件

- IPアドレス・サブネットを他のものに変えてはいけない
- iperfを他のマシンで動かしてはいけない
- 必ず用意したLANケーブルを使わなければいけない

## 初期状態

- iperfの結果が20Gbpsを超える

## 終了状態

- きちんとLANケーブルで通信が行われiperfコマンドの出力が1Gbps程度になる
- ↑に必要な手順・コマンドを説明している
- 原因を究明して説明している

---

## 解説

NIC1とNIC2を一台のマシンにさしてその間の速度を図りたいとする。
それぞれにIPアドレスをアサインしてiperfのsrc ipとserver bind portを設定する場合、スピードテストで物理のケーブル以上の速度が出る。
原因としては、たとえNIC 1のIPからNIC 2のIPへ通信しようともLinuxは内部で転送してしまい実際にNICからは出ないという問題。
そのためnet namespaceなどをNICごとに作成するときちんとNICに差したケーブルを使ってくれるようになる。

解決方法としては、virt1というnetnsを作り、片方のNICをそれに属させてからiperfする。
netnsを二つ作ってそれぞれに属させても良い。

```
sudo ip netns add virt1
sudo ip link set eth2 netns virt1
sudo ip -n virt1 link set eth2 up
sudo ip -n virt1 addr add 198.18.0.2/24 dev eth2
sudo ip netns exec virt1 iperf -s -B 198.18.0.2
iperf -c 198.18.0.2
```

## 採点基準

満点: 100点

- 20点 カーネル内の通信が行われていること、netnsを使うことに報告書で言及している。
- 60点 ↑を踏まえた上で問題環境で速度制限に成功している
- 10点 報告書の内容通りのコマンドを打つだけで問題が解決する
- 10点 報告書の内容通りのコマンドが問題環境に入っている
- 減点
  - -5点 IPアドレスを他のものに変更している
  - -5点 clientやserverのコマンドを省略している

## 講評

わかる人間にとってはすぐにLinuxの内部ルーティングを疑えるが、知らないと気づけない問題。
解答が来たチームはほとんどこれに気づいていた。
今回はL2の話なのでVRFは関係なく、代わりにnetwork namespaceを利用する必要がある。
