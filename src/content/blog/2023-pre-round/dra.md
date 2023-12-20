---
title: "ICTSC2023 予選 問題解説: DRA"
description: "ICTSC2023 本戦 問題解説: 半径と直径"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ICTSC2023 予選 問題解説: 半径と直径"
draft: false
renderer: "md"
sticky: false
---

## 概要

貴方は辺境令和ぽくぽく大学の大学院生です。 大変かわいそうですがラボのボスから仕事を丸投げされました。

ボスは以下のように言って立ち去りました。

「新しく入る学生のためにSIerをしばいて、LANに入るための認証システムを納入してもらおうと思うんだ。ただ学科長に言われて技術仕様を自分達である程度決めないといけないんだよね...困ったなぁ...

調べたら802.1x認証で使われてるRADIUSっていうプロトコルには後継があるらしいんだよね。

モバイルでも使われてるらしいし、せっかくなのでそれを使って認証サーバーとシステムを作りたいと考えているのだけど、暇だったらそのPoCを行ってくれるかな？後最終的にはクラウドでも動かしたいなーとか色々考えてるんだよね。

あ、僕が途中までやった環境はあるからそれはあげるよ。クラウドでありがちな環境とか模してあるからそのまま使ってね。まぁ肝心のシステムは全然うまく動かないけど...僕は講義があるから行くね！じゃあよろ！」

ボスからもらった環境のトポロジー図は以下の通りです。

## ネットワーク図

![](https://i.imgur.com/38TSp7X.jpg)

## 前提条件

- 特になし

## 制約

- Middleサーバーに入って書き換えることは禁止とする
- ネットワークトポロジーの変更などは禁止する

## 初期状態

client nodeから以下のものが通らない

- `wpa_supplicant -c /etc/wpa_supplicant.conf -D wired -i client-hostapd`
- `ping 192.168.100.102`

sshでclient サーバーに接続した後、client node への接続方法は以下のように行う
`ip netns exec client bash`

`ip netns` をすると `hostapd`, `app`, `client` の3つのノードがある。その中のnetnsのclientが `client node` に該当する。

通らないと記述してあるモノに関しては client サーバーにおいて systemdで管理されており、以下のコマンドで状態を見ることが可能である。このコマンドは client node で制御されているリソースである。

- `sudo systemctl status wpa_supplicant_ns.service`
- `sudo systemctl status hostapd_ns.service`

## 終了状態

client nodeから以下のものが通る

- `wpa_supplicant -c /etc/wpa_supplicant.conf -D wired -i client-hostapd`
- `ping 192.168.100.102`
