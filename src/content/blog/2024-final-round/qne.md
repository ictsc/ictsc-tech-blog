---
title: "ICTSC2024 本戦 問題解説: [QNE] スズメ、ツバメ、タカ、ドードー"
description: "ICTSC2024 本戦 問題解説: スズメ、ツバメ、タカ、ドードー"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/qne"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

ヌヌはLinux初心者で、はじめてVMでsshdを使っています。
彼はsshdのパスワード認証を有効化しようとし、`sshd_config.d` 配下に設定ファイルを書いていますが、苦戦しているようです。

「・・・ピィ？」

う〜ん、ブンチョウの彼には難しそうです。
代わりにsshdの設定をしてあげてください。

ちなみに、22番ポートにメインの、2222番ポートにバックアップのsshdを設置しています。
`$ ssh user@192.168.39.1 -p 2222` を実行するとバックアップの方でsshログインできます。

## 前提条件

- `/etc/ssh/sshd_config.d/` ディレクトリ配下のファイルによってsshdのパスワード認証を有効にする設定にすること
  - とくに`/etc/ssh/sshd_config` に直接 `PasswordAuthentication yes` と書き込むことや `PasswordAuthentication no` を削除・コメントアウトすることによる解決は禁止
- `/etc/ssh/sshd_config.d/60-cloudimg-settings.conf` の変更・削除は禁止

## 初期状態

- `$ ssh -o PreferredAuthentications=password user@192.168.39.1 -p 22` を実行しても、パスワード入力を促されず、パスワード認証されない

## 終了状態

- `$ ssh -o PreferredAuthentications=password user@192.168.39.1 -p 22` を実行すると、パスワード入力を促され、`ictsc2024` を入力するとパスワード認証され、sshログインができる

---

## 解説

想定していた解決方法は以下の通りです。

1. `sshd_config` に `Include /etc/ssh/sshd_config.d/*.conf` を追加
   - これにより、`sshd_config.d` 配下の設定ファイルが読み込まれるようになります
2. `99-enable-passwdauth.conf` を `20-enable-passwdauth.conf` に改名
   - ファイル名の辞書順で設定が適用されるため、`60-cloudimg-settings.conf` より前に読み込まれるようにします

`sshd_config` は出現の早い項目から設定が適用される仕様です。
そのため、`Include` を追加して設定ファイルを読み込むようにし、ファイル名を変更して適切な順序で設定が適用されるようにします。

## 採点基準

- 得点
  - 終了状態を満たす、つまり`ssh -o PreferredAuthentications=password user@192.168.39.1 -p 22` ができると +100点
- 以下の条件を満たすと減点（減点の結果0点未満となった場合は0点）
  - `sshd_config` に `PasswordAuthentication yes` を書いた -80点
  - `sshd_config` から `PasswordAuthentication no` を消した -80点
  - `60-cloudimg-settings.conf` を変更・削除した -60点

## 講評

sshdの意外な仕様に対して、正しい設定を行う問題でした。
`99-fuga.conf`みたいなファイルを作って、`PasswordAuthentication yes` と書いたのに解決できなかった経験からこの問題が生まれました。

解答の中でとくに多かったミスとして、報告書内でsshdの再起動の言及を抜かしたものがありました。
ICTSCのルール上、報告書の手順通りにやるとトラブルが解決される必要があるため、sshdの再起動の言及を忘れると設定が適用されず、終了状態を満たせません。

また、`99-enable-passwdauth.conf` に以下の内容を書き込んだチームがありました。

```sshd_config
Match User user
  PasswordAuthentication yes
```

こちらの設定は、`Match User` により、`user` ユーザに対してのみ、オーバーライドして `PasswordAuthentication yes` が適用されます。
当然、こちらの解決方法でも終了状態を満たすことができます。
今回の目的である「`user` ユーザに対してパスワード認証を有効にすること」を厳密に達成できるため、想定解より良い解決方法であると思われます。

なお、「ヌヌ」は作問者による架空の生物です。
