---
title: "ICTSC2023 本戦 問題解説: [KCT] SSH壊れちゃった"
description: "ICTSC2023 本戦 問題解説: SSH壊れちゃった"
tags: [ICTSC2023,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/kct"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

お世話になっております。虎婚アプリ開発チームの風間です。
自分用の開発サーバーに入ろうとすると、SSHのエラーで入れなくなりました。
自分でもどこを変えてしまったのか分からないです。
申し訳ないのですが、治してもらえないでしょうか。

遠隔でも出来るように以下の設定だけしました。

1. VNCサーバーをインストールし、立ち上がるようにしています。
2. 再起動したらネットワークの設定が消えるみたいなので、設定されるように変更しました。

SSHを繋げれるようにして、なぜSSHが繋がらなくなったのかを教えていただければ幸いです。
誠に申し訳ありませんが、お願いします。

## 前提条件

SSHが繋がりません。代わりにVNCクライアントをインストールして使ってください。
接続の際はrootユーザを使用してください。

VNCへの接続は`問題のIPアドレス:5901`でパスワードは`ictscvnc`です。

## 初期状態

手元のPCからSSHをしようとしたらエラーが起こる

## 終了状態

手元のPCから`ssh`をすると接続出来る。
再起動してもssh出来る。

## 接続情報

### VNC

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
| porblem-kct-vm | 192.168.8.1:5901 | root | ictscvnc |

### SSH

ユーザ: user パスワード:ictsc

---

## 解説

実際に自分が/etc/hostsについて調べているときに/etc/nsswitch.confが出てきたので、色々イジってみたら起きてしまった問題です。
/etc/nsswitch.confのpasswdのfilesを消しているため、ユーザを/etc/passwdから読み込まず、systemdだけで読み込んでいます。
そのためsystemd-networkがネットワークの設定をやってくれず、今回の問題ではsystemdを追加してやっています。

## 想定解法

### ユーザを読み込む

/etc/passwdを読み込まないとsshが動かないので読み込むようにします。

```
sudo vi /etc/nsswitch.conf
```

下記を修正(filesを追加)

``` diff_bash
+ passwd: files systemd
- passwd: systemd
```

これにより/etc/passwdのユーザを読み込むようになります。

### sshの設定

問題環境は
- sshがdisable
- stop
- Port 2222
- MaxSessions 0

になっています。

MaxSessionsが0になっているため、今回はデフォルトの10に変更します。

```
sudo vi /etc/ssh/sshd_config
```

``` diff_bash
+ MaxSessions 10
- MaxSessions 0
```

SSHの起動と終了条件の再起動してもSSH出来るを守るために以下のコマンドを実行します。

```
sudo systemctl start ssh
sudo systemctl enable ssh
```

SSHの際は設定によりポートが2222になっているので修正するか、-p 2222を付けてください。

```
ssh user@xxx.xxx.xxx.xxx -p 2222
```

## 採点基準

1. /etc/nsswitch.confのpasswdにfilesを追加出来ている 50点
2. SSHのMaxSessionsを0以外に変更出来ている 30点
3. SSHをenableにしている(再起動してもSSHが出来る) 10点
4. 22から2222にポートが変わっているのに気付いている 5点
5. 報告書に不備がない 5点
