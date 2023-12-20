---
code: kob
title: Jenkins が動かない！
point: 50
solvedCriterion: 50
type: normal
connectInfo:
  - hostname: controlplane
    command: ssh user@192.168.255.41 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh

  - hostname: worker
    command: ssh user@192.168.255.42 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh
---

## 概要

Kubernetes 上で Jenkins を動かしたかった A さんは、インターネット上の個人ブログに公開されているマニフェストファイルを利用して Jenkins を動作させようとしました。
しかし、どうやらマニフェストファイルを適用してもブラウザから Jenkins のページが開けないどころか、 `worker` インスタンスが過負荷になってしまいました。

ひとまず以下のように QoS を Pod に設定することで `worker` インスタンスが過負荷になる状況を避けることができましたが、依然 Jenkins はブラウザから確認できません。

* limits:
  * cpu: 1 core
  * memory: 700 Mi

この問題を解決し、ブラウザから Jenkins のページを確認できるようにしてください。

## ネットワーク図

```
 +------------------+       +----------------+
 |  controlplane    |       |     worker     |
 | 192.168.255.41   |<----->| 192.168.255.42 |
 +------------------+       +----------------+
```  

## 前提条件

* 公式ドキュメントによると、Jenkins はメモリが 200MB あれば動作するようです。
  * <https://www.jenkins.io/doc/book/scaling/hardware-recommendations/#memory-requirements-for-the-controller>

## 初期状態

* ブラウザから Jenkins のページが開けず、connection refusedとなってしまう。
  * 接続方法は備考を参照
* 問題環境に展開されている Jenkins のマニフェストファイルは、ホスト `controlplane` の `/home/user/jenkins.yaml` に配置されている。

## 終了状態

ブラウザから Jenkins のページを確認できる。

## 備考

以下の手順で、 SSH トンネル経由で Jenkins にアクセスできます

* 踏み台サーバへのアクセス時にポートフォワーディングの設定をすることで、手元のブラウザから SSH 経由で Jenkins にアクセスできます
  * 以下は CLI から  SSH する場合の例

~~~
ssh -L 31560:192.168.255.41:31560 <踏み台サーバにアクセスするためのユーザ>@<踏み台サーバのアドレス>

# 例.
# ssh -L 31560:192.168.255.41:31560 user@<踏み台サーバのアドレス>
~~~

* 上記接続後、ブラウザから <http://localhost:31560> にアクセスしてください

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
