---
title: "ICTSC2023 本戦 問題解説: [KOG] さよならリモートワーク"
description: "ICTSC2023 本戦 問題解説: さよならリモートワーク"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/kog"
draft: false
renderer: "md"
sticky: false
---

## 問題名

さよならリモートワーク

## ストーリー

黒羽くんは普段サーバーマシンに直接ディスプレイとキーボードを接続して操作している。
しかし、サーバーを操作する必要のあるタスクが山積みの中、急遽外出の予定が生えたため、外出中にサーバーを操作し、リモートワークすることとなった。
黒羽くん曰く「まあ、SSHサーバーなんか適当にやっても動くし、公開鍵も仕込んだし外からでも適当に繋がるでしょ」とのことである。

さて遠征当日、黒羽くんは移動の休憩中にサーバーへ接続し、作業を行おうとした。
「あれ、なんか繋がらない…… この作業今日中に終わらせないとマズいのに……」
このままでは遠征を途中で取り止めて帰宅し、作業する羽目になってしまう。

黒羽くんはCLI以外でもSSH接続を使用するため、SSHの設定はコマンドライン引数ではなく設定ファイルに記述したい。
が、黒羽くんは複数端末を使用しており、端末間で設定が異なると面倒なため、できる限り設定ファイルは変更したくない。
黒羽くんからの注文は多いが、なんとかしてSSHでサーバーに接続できるようにしてほしい。

なお、設定の際にルート権限を持った `user` ユーザーを使用することはできるが、実際の作業にはSSHで直接 `worker` ユーザーにログインする必要があるらしい。
また、サーバーはセキュリティ面が怪しいのでping, SSH以外の外部からの接続は禁止している。

## 前提条件

- `server` に外部からping, SSH以外の接続ができてはならない
- `server` の `user` ユーザー及び `worker` ユーザーには `client` の `/home/user/.ssh/id_rsa` に対応する公開鍵が登録されている

### 制約

- 各ホストの通信経路を変更してはならない
- `router` 及び `server` には `client` を経由せずに接続してはならない
- `server` に対する外部からのping, SSH以外の通信を可能としてはならない
    - 出題時点で可能であったものについは無視して良い
- `server` の各ユーザーに公開鍵を追加登録してはならない
- `server` の `/etc/ssh/sshd_config` 及び `/etc/ssh/sshd_config.d/` 以下に変更を加えてはならない
- `client` の `.ssh/config` を変更してはならない
    - この制約を満たせていない場合は部分点が与えられる

## 初期状態

- `client` から `server` の `user` ユーザーにSSHログインできない
- `client` から `server` の `worker` ユーザーにSSHログインできない
- `client` から `router` の `user` ユーザーにSSHログインできる

## 終了状態

- `user` ユーザーでログインしている `client` において `ssh server` と入力することで公開鍵認証で `server` の `worker` ユーザーにSSHログインできる
- `client` の `.ssh/config` が出題時点と同一である
- 以上の状態が永続化されている

## ネットワーク図

![](/images/2023-final-round/kog-topology.png)


## 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
| `client` | 192.168.50.1 | user | ictsc |
| `router` | 192.168.51.1 | user | ictsc|
| `server` | 192.168.52.128 | user | ictsc |
| `server` | 192.168.52.128 | worker |  |

## 解説

この問題は4つの問題が複合して、 `server` 上の `worker` ユーザーに公開鍵認証によるログインができないというものでした。
この問題は大きく分けて2段階に分かれています。

1段階目は `user` ユーザーで `server` にSSHログインできるようにする、というものです。
この段階には以下の2つの問題を解決する必要があります。

- `router` のファイアウォールでTCP22番が許可されていない
- `server` において以下の項目で、OpenSSHがデフォルトで使用しないアルゴリズムを用いている
    - Ciphers
    - MACs
    - KexAlgorithms

`router` のファイアウォールの設定については、vyosのZone Based Firewallというものを使用していました。
インターフェースに対してACLを設定する形式に慣れている方は、もしかしたら少し戸惑ったかもしれません。

`server` において以下の項目で、OpenSSHがデフォルトで使用しないアルゴリズムを用いているというトラブルは、古いネットワーク機器にSSHログインしようとした場合に経験することがあるかと思います。
実際に、作問者はコンテスト後の撤収作業においてL2SWにログインする際にこのトラブルに遭遇しました。(冗談で「もう数ヶ月分はこのトラブルへ対応する呪文(コマンド引数)を書いたから、この呪文を書くの飽きた」と話していました。)
`server` へは `ssh -c +aes256-cbc -o MACs=+hmac-md5 -o KexAlgorithms=+diffie-hellman-group14-sha1 192.168.52.128` などのように引数を指定した上でSSHコマンドを実行することで、一時的にログインすることが可能です。

`server` が指定しているアルゴリズムはRHEL系ディストリビューションの crypto-polociesという機能で指定されています。
これは `/etc/ssh/sshd_config.d/50-redhat.conf` の `Include /etc/crypto-policies/back-ends/opensshserver.config` という記載から推測することができます。
ここで `update-crypto-policies --show` と実行すると `ICTSC` と表示され、 `DEFAULT` ではないことがわかります。
この問題ではcrypto-policiesを `DEFAULT` に変更することでトラブルが解決できます。

2段階目は `worker` ユーザーに公開鍵認証でログインできるようにする、というものです。
この段階には以下の2つの問題を解決する必要があります。

- `worker` ユーザーのホームディレクトリーに `worker` ユーザー以外(グループ)に書き込み権限がある
    - かつ(デフォルトの設定ではあるが) `sshd` において `StrictModes` が `yes` である
- `worker` ユーザーの `.ssh` ディレクトリー及び `authorized_keys` のオーナーが `worker` ユーザーでない

これらのうち、ホームディレクトリにおいて所有者ユーザー以外に書き込み権限を与えた場合に公開鍵認証が行えなくなるトラブルについては、 [さよなら本番サーバー](https://qiita.com/dala00/items/bc03f6522dd20969f481) という記事及び、その検証を行った [さよならした本番サーバを復帰させてみる](https://north.thco.mp/2019/12/03/sshd-strictmodes-and-singleboot/) という記事が参考になるかと思います。 (問題名の元ネタはこちらの記事です。)
また、 `.ssh` ディレクトリー及び `authorized_keys` のオーナーが誤って　`root` ユーザーになっているというトラブルは、新規ユーザーの公開鍵を手作業で設定した際などに経験することがあるかと思います。

## 想定解法

### Routerの設定

1. `client` から `router` にログイン
    - `ssh 192.168.51.1`
2. 設定モードに入る
    - `configure`
3. 以下の設定を投入
    - `set firewall ipv4 name to-svr rule 20 action accept`
    - `set firewall ipv4 name to-svr rule 20 protocol tcp`
    - `set firewall ipv4 name to-svr rule 20 destination port 22`
        - ポートは `ssh` と指定してもよい
4. 適用して保存
    1. `commit`
    2. `save`
        - 永続化の制約があるため必須

### Serverの設定

- ログイン
    - ~~呪文付きで~~ 暗号化方式等のオプションをつけて `client` から `server` にSSH
    - `-c` と `-o Ciphers` や `-m` と `-o MACs` などはどちらでも良い
    - 各方式の指定は `+` 付きでも完全指定でもどちらでも良い
    - e.g.) `ssh -c +aes256-cbc -o MACs=+hmac-md5 -o KexAlgorithms=+diffie-hellman-group14-sha1 192.168.52.128`
- ホームディレクトリーのパーミッションを変更
    - `sudo chmod g-w /home/worker`
- `.ssh と `.ssh/authorized_keys` のオーナーを変更
    - `sudo chown -R worker: /home/worker/.ssh`
- crypto-policies を変更 (SSHの暗号化方式等の変更)
    - `sudo update-crypto-policies --set DEFAULT`

## 採点基準

- 4つの項目ごとに0点以上の採点を行う
- `router` のファイアウォールでTCP22番が許可されている
    - +50点
    - `router` のファイアウォールで `server` に対してICMP, TCP22以外の通信が許可されている -30点 (20点)
        - `server` 以外のホストについては考慮しない
        - `router` のファイアウォールが無効化されているなども該当
        - UDP22, ポート指定なしなどに注意
    - save されていない -10点
- `server` の `worker` ユーザーのホームディレクトリー以下における、グループ及びOthersの書き込み権限
    - ホームディレクトリーに権限が **ない** +30点
    - `.ssh` に権限が **ある** -10点
    - `authorized_keys` に権限が **ある** -10点
    - 完答 +10点 (計40点)
- `worker` ユーザーのホームディレクトリー以下のオーナーが `worker` ユーザー
    - `.ssh` ディレクトリー +10点
    - `authorized_keys` +10点
    - 完答 +10点 (計30点)
- crypto-policies で `client` のOpenSSHがデフォルトで対応している方式を許可している
    - +50点
    - `update-crypto-policies --set DEFAULT` や `update-crypto-policies --set LEGACY` など
    - `ICTSC:SHA1` 的な書式でも可
    - crypto-policies を使っていなくても `sshd_config` などに変更を加えていなければOK
    - clientの `/etc/ssh/ssh_config` 等は制約に反しないため減点しない
    - `/etc/crypto-policies/back-ends/opensshserver.config` を直接編集 -20点
- 以上を完答している
    - +30点

## 講評

この問題はSSHに関連するよくあるトラブルの詰め合わせのようなものとして作問しました。

この問題ではcrypto-policiesというRHEL系ディストリビューション独自の機能を扱っています。
この機能は、作問者も作問にあたって関連技術を調査する中で初めて知ったものです。
この部分の解決は難しいと考え少し高めの200点という配点としました。

しかしながら、閉会式前の問題解説でも述べたように、作問者のミスにより `client` において `.ssh/config` の代わりに `/etc/ssh/ssh_config` 等を編集するという、想定解以外の解法が存在しました。
多くのチームはこの方法によりトラブルを解決していたように思いますが、想定通りにcrypto-policiesを用いて解決しているチームが3チーム存在しました。
点数の差はありませんが、知識が要求されるcrypto-policiesを用いた解法を提出したチームを、この場を借りて賞賛したいと思います。
