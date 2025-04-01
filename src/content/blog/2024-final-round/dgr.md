---
title: "ICTSC2024 本戦 問題解説: [DGR] podが起動しない"
description: "ICTSC2024 本戦 問題解説: podが起動しない"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/dgr"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要
友人から「プライベートレジストリのコンテナイメージを Kubernetes 上で使用したいが、うまくいかない」と相談を受けました。友人は、HTTPS での運用は少し面倒だと考え、HTTPで運用しようとしていますが、検証がうまく進んでいないようです。<br>どうにかして友人を助けてあげてください。

## 前提条件
- HTTPを使用しレジストリに接続すること

## 初期状態
`$ curl 192.168.8.1:8080` をしても応答がない

## 終了状態
`$ curl 192.168.8.1:8080` をするとWelcome to nginx!と表示できるようにすること

---

## 解説
初期状態では、registry.ictsc.internal上にあるnginxのイメージをcontainerdがHTTPS通信でpullしようとして失敗していたことが原因で、nginxのコンテナを含んだPodが起動していませんでした。

この問題を解消する方法の1つとして、kind クラスタの初期化時に利用する設定ファイルを介して、containerdにregistry.ictsc.internal用の設定を追加することが挙げられます。これは以下の2点に分けられます。

1つ目は、プライベートレジストリregistry.ictsc.internalに対してHTTP通信を用いるためにエンドポイントを明記することです。
```
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."registry.ictsc.internal"]
    endpoint = ["http://registry.ictsc.internal"]
```
2つ目は、containerdによる証明書検証の処理をスキップさせる設定を追加することです。下記のような設定をcontainerdConfigPatches内に追記します。
```
 [plugins."io.containerd.grpc.v1.cri".registry.configs."registry.ictsc.internal"]
    insecure_skip_verify = true
```
これらの設定項目をkindの設定ファイル(config.yaml)に追加した後、一度クラスタを削除し、設定ファイルを指定してkindによるクラスタの再作成を行います。

その後、userユーザのホームディレクトに配置されたマニフェストファイルをクラスタに適用することで、終了状態を満たすことができます。

### 備考
複数のチームで insecure_skip_verify = true の記述がありませんでしたが、検証の結果、この設定がなくても終了条件を満たせることを確認できました。そのため、insecure_skip_verify = true が記述されていない場合でも、点数を付与しています。

## 採点基準
- containerdの設定追加: 100%
　
## 講評
前提条件に、設定の永続化を入れていなかったため、稼働中のクラスタに設定を追加しているチームもあり、回答を見ている側としてもとても面白かったです。
