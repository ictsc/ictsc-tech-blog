---
title: "ICTSC2024 本戦 問題解説: [MKP] 繋げよう、みんなのこころ"
description: "ICTSC2024 本戦 問題解説: 繋げよう、みんなのこころ"
tags: [ICTSC2024,問題解説,ネットワーク関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/mkp"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要
あなたはネットワークを勉強している尊い人材。
拠点間接続について学ぶため、自宅と友達の家でWireGuardを使ってVPN接続をすることになった。
検証のため、サーバ用とクライアント用のVMを2台建ててWireGuardの設定をしてみたがなぜか繋がらない！！！

この問題を解決するため、あなたはネットワークの海へと漕ぎ出すのだった。

## 前提条件
- 両サーバ共にWireGuardのインストールは完了しており、キーペアと設定ファイルは作成済み
- 今回の検証ではWireGuardの設定をシンプルにするため、VPN トンネルで扱うネットワークは最小限にしている
- 使用するWireGuardのインターフェース名はwg0となっており、変更してはならない
- 各インターフェースに割り当てられたIPアドレスを変更してはならない
- WireGuardの設定ファイルを新規作成してはならない
- キーペアは作成済みのものを使用すること
- Server側がListenしているWireGuardのポートを変更しないこと
- 両サーバ共にreboot後も終了状態が維持されていること

## 初期状態
- wg-server10.0.7.1からwg-client10.0.7.2へpingしても応答がない
- wg-client10.0.7.2からwg-server10.0.7.1へpingしても応答がない

## 終了状態
- wg-server10.0.7.1からwg-client10.0.7.2へpingすると応答が返ってくる
- wg-client10.0.7.2からwg-server10.0.7.1へpingすると応答が返ってくる

## ネットワーク図
![](/images/2024-final-round/mkp.png)

---

## 解説

この問題は、wg-serverで51000/udpをブロックする設定が入っていること、wg-clientのWireGuardの設定ファイルにミスがあること、この二つが原因でVPNが繋がらないようになっていました。

### 解決方法
#### wg-server
iptablesで51000/udpをブロックするルールが入っている
```
user@wg-server:~$ sudo iptables -L -n --line-numbers
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    DROP       17   --  0.0.0.0/0            0.0.0.0/0            udp dpt:51000
```
上記のルールを削除する
```
sudo iptables -D INPUT 1
```
前提条件に`両サーバ共にreboot後も終了状態が維持されていること`とあるので、下記コマンドでiptablesのルールを永続化する
```
sudo netfilter-persistent save
```

#### wg-client
設定ファイルに複数のミスがある
- `MTU = 50`になっているので、MTUを正常な値に変更するか項目自体を削除する
- PublicKeyで自身の公開鍵を指定しているので、wg-serverの公開鍵を指定する
- EndPointでネットワークアドレスを指定しているので、wg-serverのアドレスを指定する
- AllowedIPsで指定している自身が所属しているネットワークを指定しているので削除する
```
[Interface]
PrivateKey = cBNpSevMKzjQkdlLbhqIgI18HXXJgvzO7nQZYEguzGQ=
Address = 10.0.7.2
MTU = 50

[Peer]
PublicKey = YyWokSWpXIWAyKX6p/jRiKae588bijqcxTGGs3NWUQM=
EndPoint = 192.168.107.0:51000
AllowedIPs = 10.0.7.0/24, 192.168.107.0/24
```

↓修正して終了状態を満たすことができる`wg0.conf`
```
[Interface]
PrivateKey = cBNpSevMKzjQkdlLbhqIgI18HXXJgvzO7nQZYEguzGQ=
Address = 10.0.7.2

[Peer]
PublicKey = /+c6iIS7eZS0lU9QMPrhxRg7SRnRBZezRE3jkHd9XR4=
EndPoint = 192.168.107.1:51000
AllowedIPs = 10.0.7.0/24
```
修正後、wg0インターフェースをUPしてpingで疎通できればトラブルシューティング完了

## 採点基準
server側：20%
  - AllowedIPsで指定しているアドレスを修正している：5%
  - iptablesの51000/udpをブロックするルールを削除している：10%
  - iptablesのルールを永続化しており、reboot後も終了状態を維持している：5%

client側：80%
  - MTUを適切な値に設定する or MTUの項目を削除している：20%
  - PublicKeyでwg-serverの公開鍵を指定している：20%
  - EndPointでwg-serverのIPアドレスを指定している：20%
  - AllowedIPsで指定している自身が所属しているネットワークを削除している：20%

## 講評
この問題は、WireGuardの設定ファイルのミスとiptablesの設定によって起きたトラブルでした。

トラブルシューティングする部分が少なく、ネットワークが苦手な方にも解きやすい問題だったのではないでしょうか。

これを機にネットワークへの理解を深め、みなさんのこころを繋げましょう。
