---
code: dra
title: 半径と直径
point: 50
solvedCriterion: 50
type: normal
connectInfo:
  - hostname: client
    command: ssh user@192.168.255.81 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh

  - hostname: trans
    command: ssh user@192.168.255.82 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh

  - hostname: middle
    command: ssh user@192.168.255.83 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh

  - hostname: diameter
    command: ssh user@192.168.255.84 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh
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

* 特になし

## 制約

* Middleサーバーに入って書き換えることは禁止とする
* ネットワークトポロジーの変更などは禁止する

## 初期状態

client nodeから以下のものが通らない
* `wpa_supplicant -c /etc/wpa_supplicant.conf -D wired -i client-hostapd`
* `ping 192.168.100.102`

sshでclient サーバーに接続した後、client node への接続方法は以下のように行う
`ip netns exec client bash`

`ip netns` をすると `hostapd`, `app`, `client` の3つのノードがある。その中のnetnsのclientが `client node` に該当する。

通らないと記述してあるモノに関しては client サーバーにおいて systemdで管理されており、以下のコマンドで状態を見ることが可能である。このコマンドは client node で制御されているリソースである。
* `sudo systemctl status wpa_supplicant_ns.service`
* `sudo systemctl status hostapd_ns.service`

## 終了状態

client nodeから以下のものが通る
* `wpa_supplicant -c /etc/wpa_supplicant.conf -D wired -i client-hostapd`
* `ping 192.168.100.102`
