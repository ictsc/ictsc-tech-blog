---
title: "ICTSC2026 一次予選 問題解説: 問18"
description: "ICTSC2026 一次予選 問題解説: 問18"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/gdr"
draft: false
renderer: "md"
sticky: false
---

## 問18

### 概要

GPU ノード2台（各ノードに GPU 8 基と RoCEv2 対応 NIC を 8 枚搭載）を Kubernetes 上で運用している。各ノードの NIC は 400GbE である。2 ノード間で 1 レール（`mlx5_0`）だけを使って NCCL のベンチマークを実行したところ、busbw が 15.4 GB/s しか出ない。リンクレートから期待される値は 50 GB/s 程度である。

GPU まわりは GPU Operator（Helm chart `nvidia/gpu-operator`、repo `https://helm.ngc.nvidia.com/nvidia`）、NIC まわりは NIC Operator（Helm chart `nvidia/network-operator`、repo は同じ）を導入している。

資料はすべて `gpu-node-01` で同一時刻に取得したものである。

### 提示情報

**資料1: NCCL のログ抜粋**
```
NCCL INFO NET/IB : Using [0]mlx5_0:1/RoCE
NCCL INFO NET/IB : GPU Direct RDMA Disabled for HCA 0 'mlx5_0'
NCCL INFO Channel 00 : 0[0] -> 1[0] [receive] via NET/IB/0
```

**資料2: 計算ノードの dmesg**
```
gpu-node-01# dmesg --level=err,warn | wc -l
0
```

**資料3: GPU メモリ登録まわりの状態**
```
gpu-node-01# ls /sys/kernel/mm/memory_peers
ls: cannot access '/sys/kernel/mm/memory_peers': No such file or directory
gpu-node-01# lsmod | grep -c peermem
0
gpu-node-01# ofed_info -s
MLNX_OFED_LINUX-24.10-1.1.4.0:
```

**資料4: ソフトウェア構成**
```
NCCL       : 2.21.5
CUDA       : 12.4
Kernel     : 5.4.0
```

**資料5: `lspci -vvv` 抜粋**
```
80:00.0 PCI bridge: Broadcom / LSI Device c030 (rev b0)
        LnkSta:	Speed 32GT/s, Width x16
        Capabilities: [f24 v1] Access Control Services
                ACSCap: SrcValid+ TransBlk+ ReqRedir+ CmpltRedir+ UpstreamFwd+ EgressCtrl+ DirectTrans+
                ACSCtl: SrcValid+ TransBlk- ReqRedir+ CmpltRedir+ UpstreamFwd+ EgressCtrl- DirectTrans-
```

**資料6: カーネルの起動パラメータと構成**
```
gpu-node-01# cat /proc/cmdline
BOOT_IMAGE=/boot/vmlinuz-5.4.0 root=/dev/mapper/vg0-root ro amd_iommu=on pcie_aspm=off
gpu-node-01# grep CONFIG_IOMMU_DEFAULT /boot/config-$(uname -r)
CONFIG_IOMMU_DEFAULT_PASSTHROUGH=y
```

**資料7: 運用者が疑って調べた項目**
```
1) NIC Operator の NicClusterPolicy の status に state-OFED: notReady と表示されている
   $ kubectl -n nvidia-network-operator get ds
   NAME                        DESIRED   CURRENT   READY   AGE
   mofed-ubuntu20.04-ds        0         0         0       36d
   $ kubectl -n gpu-operator get ds
   NAME                        DESIRED   CURRENT   READY   AGE
   nvidia-driver-daemonset     0         0         0       41d
   nvidia-device-plugin-ds     2         2         2       41d

2) GPU Operator の Helm values の driver.rdma に以下が書かれている
   driver:
     rdma:
       enabled: false
```

**資料8**: 本ノードは SR-IOV を使用している。

### 設問

この症状を恒久的に解消するために最も適切な対処の組み合わせを選べ。

### 選択肢（複数選択）

1. 各ノードで `nvidia_peermem` を `modprobe` し、`/sys/kernel/mm/memory_peers` が生えることを確認する
2. NIC Operator の `NicClusterPolicy` を修正して `state-OFED` を `ready` にする
3. GPU Operator の Helm values の `driver.rdma.enabled` を `true` に変更して再適用する
4. カーネルパラメータに `iommu=pt` を追加してノードを再起動する
5. GPU と NIC の共通上流ポートで PCIe ACS を無効化する
6. 環境変数に `NCCL_IB_DISABLE=0` を明示的に設定する
7. 環境変数に `NCCL_NET_GDR_LEVEL=SYS` を設定する
8. 環境変数に `NCCL_DMABUF_ENABLE=1` を設定する
9. GPU Operator の Helm values の `driver.rdma.useHostMofed` を `true` に変更して再適用する
10. 1〜9 で選択した変更のうち再起動で失われるものを、ノードの起動時設定（プロビジョニング定義）に反映する

### 正解

1, 5, 10

### 得点の条件

完答のみ。

### 解説

この問題では原因が2つ重なっている。1つ目を直すと、その時点で2つ目が出てくる。

**1つ目: Memory Registrationできない**

GPU Direct RDMA では、ネットワークアダプター（NIC）が GPU のメモリ (VRAM) に直接アクセスできるように、対象のメモリ領域をOSやNICに事前通知して関連付けを行う処理 (Memory Registration) をする必要がある。\
主な方法として以下の2つが存在する。

| 方法 | 使える条件 |
| --- | --- |
| dma-buf | カーネル 5.12 以降で、GPU ドライバが Open Kernel Module であること |
| `nvidia_peermem` | MOFED の peer-memory API を持つ `ib_core` があり、モジュールがロードされて `/sys/kernel/mm/memory_peers` ができていること |

資料4 を見るとカーネルは 5.4.0 なので、dma-buf が使えない。\
残るのは `nvidia_peermem` だが、資料3 のとおりロードされていない。\
登録する方法が無いので資料1 で `GPU Direct RDMA Disabled` となり、データがホストメモリを経由するため 15.4 GB/s しか出ていない。

ここで、`nvidia_peermem` をどのようにロードするかを考える。\
GPU Operator が入っているので、`driver.rdma.enabled: true` にして Operator に任せたくなるが、資料7-1 を見ると、`nvidia-driver-daemonset` の `DESIRED` が 0 になっている。\
device-plugin は 2/2 で動いているので Operator 自体は動いており、ドライバだけがホストに導入済み (pre-installed) の扱いになっていて、driver DaemonSet がどのノードにも展開されていないことが分かる。\
driver DaemonSet が動いていないのに device-plugin が GPU を公開でき、NCCL も GPU を使えているので、GPU ドライバはホストに入っていると分かる。

`driver.rdma.enabled` と `driver.rdma.useHostMofed` は、どちらも driver DaemonSet の中の nvidia-peermem コンテナを制御する設定である。\
DaemonSet が展開されていないノードでは、この値を変えても何も変わらない。\
そのため、ホストで `nvidia_peermem` をロードし (選択肢1) 、再起動しても消えないように起動時の設定に入れる (選択肢10) 必要がある。

**2つ目: P2P 転送が ACS に引っかかる**

資料5 の `ACSCtl` では `ReqRedir+` `CmpltRedir+` `UpstreamFwd+` が有効になっている。\
ACS の P2P リダイレクトが有効だと、GPU と NIC の間の P2P 通信が毎回 root complex まで上がってから折り返すため、高速な NIC では帯域を使い切ることが出来ない。\
そのため、GPU と NIC の共通上流ポートで ACS を無効にすることが推奨される (選択肢5)。

なお、資料5 の `LnkSta` は Gen5 x16 (実効で約 63 GB/s) なので、PCIe のリンク自体が 400GbE のボトルネックになっているわけではない。

また、資料2 で `dmesg` にエラーが1件も無いことは、問題が無いことを示しているわけではない。\
資料1 のとおり GDR が Disabled なので、1つ目の原因によって P2P 通信がまだ一度も発生しておらず、ACS にも引っかかっていないと考えられる。1つ目を直して GDR が有効になったところでこの問題が出てくることとなる。

これはメタ的に選択できたかもしれないが、`modprobe` も `setpci` での ACS 無効化も再起動すると元に戻るため、選択肢10 も必要になる。

#### 誤りの選択肢

| 選択肢 | 誤りの理由 |
| --- | --- |
| 2 (`state-OFED` を ready にする) | 資料3 の `ofed_info -s` のとおり MOFED はホストに入っており、資料1 で `mlx5_0` が RoCE として使われているので NIC ドライバも動いているため、配り直す必要は無い。資料7-1 の DaemonSet が `DESIRED 0` なのは対象ノードが0台というだけで、`state-OFED: notReady` もそう見えているにすぎない。これを「セレクタが合っていない」と考えて直すと、すでにあるドライバをもう一度配ることになる |
| 3 (`driver.rdma.enabled` を true にする) | driver DaemonSet が `DESIRED 0` で展開されないので、nvidia-peermem コンテナも起動せず、何も変わらない。Operator にドライバを管理させる構成に変えるのは設計の変更であり、今回の障害対応の範囲ではない |
| 4 (`iommu=pt` を追加) | すでにパススルーで動いているので、追加しても何も変わらない。資料6 の `/proc/cmdline` に `iommu=pt` は無いが、同じ資料6 に `CONFIG_IOMMU_DEFAULT_PASSTHROUGH=y` があり、起動パラメータで指定しなければ既定でパススルーになる。`amd_iommu=on` は 5.4 のカーネルでは認識されない値であり、domain type も決めない。`/proc/cmdline` だけを見て判断すると間違える |
| 6 (`NCCL_IB_DISABLE=0` の明示) | RDMA はもともと有効になっており、資料1 でもすでに NET/IB が使われている |
| 7 (`NCCL_NET_GDR_LEVEL=SYS` の設定) | GDR を使う距離の条件を決める設定で、登録する方法が無い状態では意味が無い |
| 8 (`NCCL_DMABUF_ENABLE=1` の設定) | カーネルが 5.12 より古く dma-buf に対応していないので、環境変数を設定しても使えない |
| 9 (`useHostMofed` を true にする) | 3 と同じく、driver DaemonSet が展開されないノードでは何も変わらない |

#### 選択肢5 と資料8 (SR-IOV) について

AI対策で用意した選択肢であった。AIは「SR-IOV を使っているなら VF を分離するために ACS が必要で、無効にすると IOMMU グループが崩れる」という考え方をしがちであり、実際、VF を `vfio-pci` にバインドして VM や DPDK に渡している構成では、上流ポートの ACS を切ると分離が崩れて、デバイスの割り当てができなくなる。

ただし本問の資料には、VF を VM や DPDK に割り当てていることを示すものは無く、Kubernetes 上で VF をカーネルの netdev として Pod に渡す構成を前提としている。\
この構成では IOMMU グループをまたいだデバイスの割り当ては行わない。\
また、ACS のうち P2P に関係するのは `ReqRedir` / `CmpltRedir` / `UpstreamFwd` で、GPU と NIC の共通上流ポートだけでこれらを切れば、ほかの部分の分離はそのまま残る (`pci=disable_acs_redir=` のように対象を絞って指定できる)。\
GDR を有効にしても ACS が残っていれば 400GbE の帯域は出ないので、選択肢5 は正解に含めている。

資料8 は「IOMMU を丸ごと無効にする対処は取れない」ことを示すための資料で、ACS を無効にできない理由にはならない。

A社の最上位LLMも間違える選択肢であったため、もう少し多くのチームに間違えて貰える想定だったが、一次予選直前にO社の最上位LLMが出たことにより正答率が上がってしまった。(作問者の嘆き)

#### 出題の意図

GPUDirect RDMA がうまく動かないとき、まず確認されるのが `iommu=pt` と ACS の無効化で、ベンダの資料にもそう書かれている。\
本問では、そのうち IOMMU のパススルーはすでに満たされている状態にした。\
ただし `/proc/cmdline` には `iommu=pt` が出てこないので、それだけを見て足そうとすると誤答となる。

もう1つは、`nvidia_peermem` をどこでロードするかである。\
Kubernetes に Operator が入っていれば Operator の設定で直したくなるが、本問ではドライバをホストで管理しているので、それでは直らない。\
資料7-1 の DaemonSet の `DESIRED` の列から判断ができるかどうかで正答にたどり着けるかどうかが決まったと考えている。

### 講評

回答した 45 チームのうち、正解は 27 チームだった。

誤答で多かったのは選択肢5 を外した `1, 10` で、8 チームがこの組み合わせだった。資料8 の SR-IOV を理由に ACS の無効化を避けたものと思われる。\
また、選択肢3 や 9 (GPU Operator の Helm values の変更) を含めた回答も 9 チームあった。\
資料7-1 の driver DaemonSet が `DESIRED 0` であることを見落とし、Operator 側で `nvidia_peermem` をロードさせようとしたものである。\
一方、選択肢4 (`iommu=pt` の追加) を選んだのは 1 チームだけで、`/proc/cmdline` だけを見て判断するミスはほとんど見られなかった。
