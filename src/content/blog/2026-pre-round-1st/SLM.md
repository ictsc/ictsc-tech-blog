---
title: "ICTSC2026 一次予選 問題解説: 問22"
description: "ICTSC2026 一次予選 問題解説: 問22"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/slm"
draft: false
renderer: "md"
sticky: false
---

## 問22

### 概要

GPUクラスタ上で Slurm を利用し、複数ノードにまたがる NCCL の集団通信ベンチマークを実行している。計算ノードは 1 台あたり GPU 8 基。
少数ノードでは正常に動作するが、ノード数を増やすと RDMA 関連のエラーが発生し、ジョブが失敗するようになった。
原因を調査したところ、以下の情報が得られた。

### 現象

```
2 ノード（world=2）  -> 成功。busbw も期待値どおり。
8 ノード（world=8）  -> 失敗。
```

### 提示情報

**資料1: エラー**

```
NCCL WARN Call to ibv_create_qp failed with error Cannot allocate memory
NCCL WARN NET/IB : Got completion with error 12, opcode 0, len 0
```

**資料2: 計算ノードに直接 SSH して確認**

```
node01$ ulimit -l
unlimited
node01$ grep memlock /etc/security/limits.conf
*    soft    memlock    unlimited
*    hard    memlock    unlimited
node01$ free -g
               total  used  free
Mem:            1006    84   904
```

**資料3: ジョブの中で確認**

```
login$ srun --nodes=8 bash -c 'echo $(hostname) $(ulimit -l)'
node01 8192
node02 8192
node03 8192
...   （全ノード 8192）
```

**資料4: 投入元 (ログインノード) で確認**

```
login$ ulimit -l
8192
```

**資料5: 計算ノードの `slurmd` プロセス**

```
node01# cat /proc/$(pgrep -x slurmd)/limits | grep -E 'Limit |locked memory'
Limit                     Soft Limit           Hard Limit           Units
Max locked memory         8388608              8388608              bytes
node01# systemctl cat slurmd | grep -i '^Limit'
node01#
```

### 設問

この現象について正しい記述をすべて選べ。

### 選択肢 (複数選択)

1. 計算ノードの `limits.conf` は正しく効いており、PAM の設定に問題は無い
2. スケジューラが投入元ノードの rlimit をジョブへ伝播している
3. `world=2` で成功するのは、RDMA が必要とする QP とページ固定メモリの量がピア数とともに増えるため、ジョブに適用されている制限値でも少数ピアなら足りてしまうからである
4. 計算ノードに直接 SSH して `ulimit -l` を確認すれば、ジョブに適用される制限値の妥当性を検証できる
5. ログインノード側の `memlock` を unlimited に引き上げることが、この問題の恒久的な対処である
6. 計算ノードの物理メモリを増設すれば解消する
7. スケジューラの設定で伝播対象から `MEMLOCK` を除外すれば解消する
8. `world=2` が成功していることは、RDMA トランスポート (IB verbs) が選択されていることの根拠になる
9. `free -g` の空きが十分であることは、`ibv_create_qp` が成功することの根拠になる
10. 伝播対象から `MEMLOCK` を除外するだけでは解消せず、あわせて `slurmd` 側の制限値を引き上げる必要がある

### 正解

1, 2, 3, 8, 10

### 得点の条件

完答のみ。

### 解説

**各選択肢の正誤**

| 選択肢 | 正誤 | 理由 |
| --- | --- | --- |
| 1 | 正 | 資料2 では、ノードに直接 SSH したときの `ulimit -l` も `limits.conf` の設定も `unlimited` になっている。PAM 経由のログインには `limits.conf` の設定が正しく反映されている |
| 2 | 正 | Slurm は、`PropagateResourceLimits` / `PropagateResourceLimitsExcept` を設定していない既定の状態では、投入元の rlimit をすべてジョブに引き継ぐ。資料3 のジョブ内の値 8192 も、資料4 のログインノードの `ulimit -l` と一致している |
| 3 | 正 | RDMA に必要な QP とページ固定メモリの量は、通信相手の数に応じて増える。ジョブの制限値が 8192 KiB でも、通信相手が少なければ足りるので、`world=2` は成功する |
| 4 | 誤 | 資料2 と資料3 で値が食い違っているとおり、ノードに SSH して確認した値は、ジョブの制限値とは別物である。確認はジョブの中で行う必要がある |
| 5 | 誤 | 引き継がれる値は `slurmd` の hard limit を超えられないので、ログインノードを unlimited にしても、ジョブの制限値は資料5 の 8192 KiB のままで、症状は解消しない。仮に `slurmd` 側の上限が十分大きくても、投入元の設定に依存する構成になり、ログインノードを作り直したり別のノードから投入したりすると再発するため、恒久的な対処にはならない |
| 6 | 誤 | 資料2 の `free -g` では 904 GiB 空いており、物理メモリは足りている |
| 7 | 誤 | 引き継ぎを止めると、ジョブの制限値は `slurmd` の制限値になる。資料5 のとおり、本環境ではこれが 8388608 バイト (8192 KiB) で今と同じ値なので、`world=8` で失敗する状況は変わらない |
| 8 | 正 | 資料1 のエラーは `NET/IB` から出ており、この環境の NCCL は NET/IB を使っている。どのトランスポートを使うかは、利用可能な IB デバイスと `NCCL_NET` などの設定で決まり、ノード数では変わらないので、`world=2` でも NET/IB が使われていたと言える。また、ソケット経由の通信に切り替わっていれば TCP の帯域が上限になり、busbw が期待値に届くことは無い |
| 9 | 誤 | `ibv_create_qp` が失敗しているのはページ固定メモリの上限 (`RLIMIT_MEMLOCK`) によるもので、物理メモリの空き容量とは関係が無い。`free` の値は根拠にならない |
| 10 | 正 | 恒久的な対処には2つの設定が必要である。`slurmd` の systemd unit に `LimitMEMLOCK=infinity` を設定して再起動し、さらに `PropagateResourceLimitsExcept=MEMLOCK` で投入元の値の引き継ぎを止める。どちらか一方だけでは解消しない |

<br>

**`memlock` の値の根拠**

`memlock` の値は、次の3か所の設定で決まる。

| 層 | 設定場所 | 適用対象 | 本問での値 |
| --- | --- | --- | --- |
| PAM | `/etc/security/limits.conf` | SSH ログインなど PAM を経由するセッション | unlimited |
| systemd | `slurmd.service` の `LimitMEMLOCK` | `slurmd` とその子プロセス (= ジョブ) | 未設定 → 8192 KiB |
| Slurm | `PropagateResourceLimits*` | 投入元の rlimit をジョブに引き継ぐかどうか | 既定ではすべて引き継ぐ → 8192 KiB |

`limits.conf` は PAM を経由しない systemd のサービスには反映されない。\
資料2 で確認できるのは、PAM 経由のログインで設定が反映されていることだけで、`slurmd` の制限値については分からない。\
また、資料5 の `systemctl cat slurmd | grep -i '^Limit'` が何も出力しないことから、unit に `LimitMEMLOCK` が書かれておらず、systemd の既定値のままであると分かる。

Slurm のドキュメントには「ユーザの resource limit が伝播されない場合、ジョブには `slurmd` デーモンの制限値が適用される」と書かれている。\
つまり、引き継ぎを止めても、ジョブの制限値が「投入元の値」から「`slurmd` の値」に変わるだけで、`slurmd` 側の値が小さいままならトラブルは解消しない。

upstream が配布している `slurmd.service` には `LimitMEMLOCK=infinity` が含まれている。\
ただし、この unit をそのまま使っていても、既定ではすべての rlimit が引き継がれるので、ジョブの制限値は投入元と同じ 8192 KiB になる。\
そのため、`PropagateResourceLimitsExcept=MEMLOCK` もあわせて設定する必要がある (Slurm の FAQ にも同じ手順が書かれている)。\
本問は、その行が無い unit を使っている環境 (`Limit*` を含まない unit を自作している) を想定しており、資料5 はそれを確かめるための資料である。

**`world=2` が成功していることの意味**

`world=2` では成功して `world=8` で失敗するところが、この問題で一番の引っかけポイントであるが、小さい構成で動いたからといって、設定が正しいとは限らないことを示している。\
一方で、選択肢8 のように、小さい構成で動いたことから言えることもあり、何が言えて何が言えないかを切り分けることが、本問のねらいである。

また、選択肢4 と 9 では、どちらも運用者が実際に行った確認が原因の特定には役立たないものになっている。\
資料2 は「ノード側は正常」であることを示す資料ではなく、「ノード側を見ても原因は分からない」ことを示す資料である。

### 講評

回答した 45 チームのうち、正解は 2 チームだった。

誤答のほとんどは、選択肢8 だけを外した `1, 2, 3, 10` で、36 チームがこの組み合わせだった。\
選択肢8 を選んだのは 4 チームだけで、複数資料の組み合わせから IB の経路が使われていると言えることを、多くのチームが判断しきれなかったようである。\
作問者はAIのハルシネーションを狙って選択肢 8 を作ったため、狙い通りとなって嬉しい限りであった (が、参加者にとって触れる機会のあまりないと思われるHPC分野の問題であり、AI利用云々の以前にそもそもが難問だったかもしれない)。\
一方、選択肢3 と 10 はほぼすべてのチームが選んでおり、`slurmd` の制限値と伝播の両方を直す必要がある点は、よく理解されていた。
