---
title: "ICTSC2023 予選 問題解説: KOB"
description: "ICTSC2023 本戦 問題解説: Jenkins が動かない！"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ICTSC2023 予選 問題解説: Jenkins が動かない！"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

Kubernetes 上で Jenkins を動かしたかった A さんは、インターネット上の個人ブログに公開されているマニフェストファイルを利用して Jenkins を動作させようとしました。
しかし、どうやらマニフェストファイルを適用してもブラウザから Jenkins のページが開けないどころか、 `worker` インスタンスが過負荷になってしまいました。

ひとまず以下のように QoS を Pod に設定することで `worker` インスタンスが過負荷になる状況を避けることができましたが、依然 Jenkins はブラウザから確認できません。

- limits:
  - cpu: 1 core
  - memory: 700 Mi

この問題を解決し、ブラウザから Jenkins のページを確認できるようにしてください。

## ネットワーク図

```
 +------------------+       +----------------+
 |  controlplane    |       |     worker     |
 | 192.168.255.41   |<----->| 192.168.255.42 |
 +------------------+       +----------------+
```  

## 前提条件

- 公式ドキュメントによると、Jenkins はメモリが 200MB あれば動作するようです。
  - <https://www.jenkins.io/doc/book/scaling/hardware-recommendations/#memory-requirements-for-the-controller>

## 初期状態

- ブラウザから Jenkins のページが開けず、connection refusedとなってしまう。
  - 接続方法は備考を参照
- 問題環境に展開されている Jenkins のマニフェストファイルは、ホスト `controlplane` の `/home/user/jenkins.yaml` に配置されている。

## 終了状態

ブラウザから Jenkins のページを確認できる。

## 備考

以下の手順で、 SSH トンネル経由で Jenkins にアクセスできます

- 踏み台サーバへのアクセス時にポートフォワーディングの設定をすることで、手元のブラウザから SSH 経由で Jenkins にアクセスできます
  - 以下は CLI から  SSH する場合の例

~~~
ssh -L 31560:192.168.255.41:31560 <踏み台サーバにアクセスするためのユーザ>@<踏み台サーバのアドレス>

# 例.
# ssh -L 31560:192.168.255.41:31560 user@<踏み台サーバのアドレス>
~~~

- 上記接続後、ブラウザから <http://localhost:31560> にアクセスしてください

## 問題環境

```
$ lsb_release -a
No LSB modules are available.
Distributor ID: Ubuntu
Description: Ubuntu 22.04.3 LTS
Release: 22.04
Codename: jammy
```

```
$ kubectl version
Client Version: v1.28.2
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.28.2
```

# 解説

## トラブルの原因

この問題の原因は、Jenkins Pod の Java ヒープサイズ設定が Kubernetes のメモリリソース制限と対応していないことにあります。具体的には、Jenkins の Java Virtual Machine (JVM) のヒープメモリ初期設定 (-Xms) が高すぎ、これが Kubernetes の Pod メモリリソース制限を超えているため、Pod が `OOMKilled`（メモリ不足で終了）され頻繁に再起動しています。

### `-Xms` について

`-Xms` は Java Virtual Machine (JVM) のヒープメモリの起動時サイズを指定するオプションです。この値が大きすぎると、Pod が割り当てられたメモリリソースを超過し、Kubernetes によって `OOMKilled` (Out of Memory Killed) される可能性があります。

Pod のリソース制限をもうける前の段階では
`-Xms` によって指定されたヒープメモリの起動時サイズが Worker インスタンスで利用可能なメモリリソースを超えてしまっていたため過負荷`OOMKilled`となっていました。

### Kubernetes のリソース制限との関係

Kubernetes では、Pod のリソース制限（CPU, メモリ）を `limits` キーワードを使って設定します。この設定は Pod が消費できるリソースの最大値を定義し、これを超えると Kubernetes が Pod を再起動する可能性があります。

Pod のリソース制限をもうけたことによって
`-Xms` によって指定されたヒープメモリの起動時サイズがPod のリソース制限を超えてしまっていたため`OOMKilled`となっていました。

## 問題の解決方法

解決策としては、Jenkins の JVM ヒープメモリ設定（特に `-Xms`）を Kubernetes のリソース制限に合わせる必要があります。具体的には、`controller.javaOpts` の `-Xms` 値を Kubernetes のリソース制限（この場合、メモリは 700Mi）以下に調整するか、またはこのオプションを完全に取り除くことです。

マニフェストファイルは /home/user/jenkins.yaml に存在するため、これを編集したうえで

```bash
kubectl apply -f /home/user/jenkins.yaml
```

することで変更内容が反映されます。

または

```bash
kubectl edit statefulset jenkins
```

などのコマンドを用いて直接マニフェストを編集しても更新可能です。

jenkinsはStatefulSetsのため即座に変更は反映されないため、ポッドを削除することによって目的にあったように作成されます。

```bash
kubectl delete pod jenkins-0
```

### 問題に気づくための手がかり

```bash
kubectl get pods -w
```

すると watch API を用いて継続的に Pod の状態を確認することが出来る。これにより Pod が `OOMKilled` のステータスを経て CrashLoopBackOff になっていることを確認できる。
`OOMKilled` のステータスからメモリ関連の問題だと気づくことができる。

output 例

```
$ kubectl get pods -o wide -w
NAME        READY   STATUS             RESTARTS       AGE    IP              NODE     NOMINATED NODE   READINESS GATES
jenkins-0   1/2     CrashLoopBackOff   10 (83s ago)   2d1h   172.16.171.80   worker   <none>           <none>
jenkins-0   1/2     Running            11 (88s ago)   2d1h   172.16.171.80   worker   <none>           <none>
jenkins-0   1/2     Running            11 (100s ago)   2d1h   172.16.171.80   worker   <none>           <none>
jenkins-0   2/2     Running            11 (100s ago)   2d1h   172.16.171.80   worker   <none>           <none>
jenkins-0   1/2     OOMKilled          11 (102s ago)   2d1h   172.16.171.80   worker   <none>           <none>
jenkins-0   1/2     CrashLoopBackOff   11 (2s ago)     2d1h   172.16.171.80   worker   <none>           <none>
```

### 解決後の状態確認

変更を適用した後、以下のコマンドを実行して Jenkins Pod の状態を確認します。

```bash
kubectl get pods -o wide
```

このコマンドは、Pod の状態（例：`Running`, `OOMKilled`）や再起動回数を表示します。変更が正しく適用されていれば、Pod は `Running` 状態に安定し、頻繁な再起動は発生しなくなります。

## マニフェストファイルを使いまわす時は注意しましょう

この問題のように、インターネットで公開されているようなマニフェストファイルの内容を理解せずに利用すると、動作環境依存の設定が原因で動作しないことがままあります。またこの問題とは関係ありませんが、疑わしい image を利用していたり理由なく Pod に特権アクセスを許可しているなど、セキュリティのリスクも存在します。
インターネットに公開されているマニフェストファイルを利用する場合は、きちんと内容を理解してから利用するようにしましょう。

## 採点基準

問題が解決され、Jenkins がブラウザから確認できること: 100%
