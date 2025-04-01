---
title: "ICTSC2024 本戦 問題解説: [GPO] Is ansible Complex?"
description: "ICTSC2024 本戦 問題解説: Is ansible Complex?"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/gpo"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

上司から、「サーバーにユーザーを作成してほしいんだけど、最近話題のIaCってヤツを使ってやってほしいんだよね。取り敢えずネットで拾ってきたやつをもとに途中まで作っておいたから、あとはよろしく。」などという無茶振りを受けた。
上司が途中まで設定したファイルは `controller` の `/home/user/ansible/` に配置されているらしい。

上司の無茶振りはいつものことなので、どうにか対応してほしい。

## 前提条件

- `/home/user/ansible` 配下の `playbook.yml` で設定を行う
- 正常に動作した場合、 `playbook.yml` は冪等性があり、複数回の実行で環境が破壊されることはない

### 制約

- `controller` において管理者権限(sudo)は使用できない
- `server` にシェルでログインして設定やファイル書き込み等を行ってはならない
  - 設定やファイル書き込み等はAnsible Playbookを用いて行うこと
  - 状況の確認のためにログインしてファイルの閲覧等を行うことは認められる
- `playbook.yml` から参照されるタスクについて、追加、削除、モジュールの変更、順序の変更、実行条件の変更をしてはならない
  - タスクの削除は部分点の対象となる

### 設定内容

- ユーザー x, y, z を表のとおり作成
  | ユーザー | UID  | sudo権限 | パスワード |
  | -------- | ---- | -------- | ---------- |
  | x | 2000 | あり | `1qaz!QAZ` |
  | y | 2001 | なし | `Passw0rd` |
  | z | 2002 | なし | `iL0veTr0ub1e` |
- 各ユーザーの Primary Group として、ユーザーと同名で、GIDがUIDと同じものを作成
- `roles/user/files` 配下の `id_*` でそれぞれのユーザーに公開鍵認証でSSHログイン可能に

## 初期状態

- `controller` の`/home/user/ansible` で `playbook.yml` の実行がエラー終了する

## 終了状態

- `controller` の`/home/user/ansible` で `playbook.yml` の全てのタスクをエラーなく実行できる
- `controller` の`/home/user/ansible` で `playbook.yml` の実行により、前提条件に記載の内容を設定できる
- `server` が前提条件に記載のとおり設定されている

### 部分点

- 全てのトラブルが解決できない場合、タスクの一部を削除(コメントアウト)することにより、動作した箇所に基づく部分点が与えられる
- タスクの削除以外の制約に反した場合、部分点は与えられない

## 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
| controller | 192.168.2.1 | user | ictsc2024 |
| server | 192.168.2.2 | user | ictsc2024 |

---

## 解説

この問題はAnsibleに関連する複数のトラブルを解決するものです。
この問題では以下のトラブルが発生していました。

- `ansible.posix.authorized_key` モジュールが使用できない
- `groups` という変数が読み込めない
- pythonの依存関係である `passlib` がインストールされていない
- RedHat系ディストリビューションにおいて `sudo` グループがユーザーに付与できない
- 公開鍵認証でSSHログインできない

### `ansible.posix.authorized_key` モジュール

このトラブルは `playbook.yml` を実行しようとすると、 `ERROR! couldn't resolve module/action 'ansible.posix.authorized_key'.` というエラーが表示されるというものです。
`ansible.posix.authorized_key` モジュールは `ansible.posix` コレクションに含まれるモジュールで、 `apt install ansible` や `pipx install ansible` などで環境構築した場合にデフォルトで含まれるものです。
しかし、この環境は `pipx install ansible-core` により最低限の内容で構築されており、 `ansible.builtin` コレクションしか含まれていません。

このトラブルは、 `ansible-galaxy collection install ansible.posix` などを実行することにより、手動で `ansible.posix` コレクションをインストールすることで解決できます。
なお、別解として、 venvで `ansible` をインストールした環境を作り、その環境にPATHを通すことで、 `ansible.posix` コレクションが含まれた環境を使用することでも解決できます。

### `groups` 変数

このトラブルは、 `roles/user/tasks/main.yml` の `Add new groups` というタスクを実行しようとした際に `The task includes an option with an undefined variable..` というエラーが表示されるというものです。
これは、このタスクで使用している `groups` という変数がAnsibleの予約語であり、実行時にAnsibleにより上書きされていることが原因です。

このトラブルは、 `roles/user/tasks/main.yml` 及び `roles/user/vars/main.yml` 中の `groups` 変数を異なる名前に変更することで解決できます。

Ansibleの予約語については、 [Special Variables &mdash; Ansible Community Documentation](https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html) をご覧ください。

### 依存パッケージ(`passlib`)の不足

このトラブルは、 `roles/user/tasks/main.yml` の `Set password` というタスクを実行しようとした際にエラーが発生するというものです。
このタスクはvarsに含まれるパスワードがログに表示されることを防ぐために、 `'no_log: true'` と設定されているため、エラーの原因が表示されません。
デバッグのため、一時的に  `'no_log: true'` をコメントアウトすると、このタスクの実行時に `Unable to encrypt nor hash, passlib must be installed. No module named 'passlib'. Unable to encrypt nor hash, passlib must be installed. No module named 'passlib'` というエラーログが確認できます。
このことから、このタスクの実行にはPythonの `passlib` パッケージが必要であるのに、このパッケージがインストールされていないと分かります。
`requirements.txt` には `passlib==1.7.4` という記載があるため、本来ならインストールされているべきですが、依存パッケージのインストールが正常に行えていないという状況です。
問題文に沿って言えば、上司が「途中まで作っておい」てやっていなかった部分ということになります。

この環境は pipx により構築されているため、 `pipx inject ansible-core passlib` などを実行することで、実行している環境に `passlib` をインストールすることができます。
venvで別途実行環境を構築している場合は、単に `python3 -m pip install -r requirements.txt` のようにするだけで解決できます。

### RedHat系ディストリビューションでの `sudo` グループ

このトラブルは、 `roles/user/tasks/main.yml` の `Add to sudoers` というタスクを実行しようとした際に `Group sudo does not exist` というエラーが表示されるというものです。
このトラブルはAnsibleというより、RedHat系ディストリビューションとDebian系ディストリビューションの差異に関するトラブルです。
UbuntuなどのDebian系ディストリビューションでは、デフォルトでsudoersに `sudo` グループが登録されますが、RedHat系ディストリビューションやFreeBSDなどではデフォルトで `wheel` グループが登録されます。
この問題では `server` にRedHat系ディストリビューションであるAlmaLinuxを用いているため、 `sudo` ではなく `wheel` グループを使用する必要があります。

このトラブルは、登録するグループを `sudo` から `wheel` に変更することで解決できます。
なお、 `Add new groups` タスクを用いて `sudo` グループを作成した場合、このタスクでエラーは発生しませんが、ユーザーxにsudo権限が付与されないため、終了状態を満たしません。

### 公開鍵認証でのSSHログイン

このトラブルは、 `playbook.yml` の実行が完了した後、 `roles/user/files` 配下の `id_*` でそれぞれのユーザーに公開鍵認証でSSHログインできないというものです。
このトラブルは直接的にはSSHについてのトラブルで、 `server` に作成した `.ssh` ディレクトリのパーミッションが `d-w-rwxr-T` となっており、当該ユーザー以外に書き込み権限が付与されていることに起因するものです。
詳細は、昨年出題した[[KOG] さよならリモートワーク](/2024/03/24/ictsc2023final/kog/)の解説記事をご覧ください。

さて、 `.ssh` ディレクトリのパーミッションが `d-w-rwxr-T` となっている原因は `roles/user/tasks/main.yml` の `Create .ssh directory` というタスクにあります。
このタスクの中で、 `mode: 700`と指定されていますが、この値は10進数の `700` として解釈されます。
10進数の `700` は8進数では `01274` となるためスティッキービットを含め `d-w-rwxr-T` となります。

Ansibleでパーミッションを指定する場合、文字列として `'700'` のように指定するか、8進数の数値として `0700` のように指定する必要があります。
このトラブルは、 `mode` をこれらの表現に修正することで解決します。

## 採点基準

- `ansible.posix.authorized_key` モジュールを実行可能にした
  - 30点
- varsの `groups` が予約語と被っている問題を解消した
  - 30点
- `Set password` タスクを実行可能にした
  - 30点
- sudoグループをwheelグループに変更した
  - 10点
- `playbook.yml` の全てのタスクをエラーなく実行できる
  - タスクを削除した場合は対象でない
  - 以上4つの項目に対する完答ボーナス
  - 50点
- x, y, zのユーザーで公開鍵認証によるログインができる
  - 50点

- `server` に対し、Ansible Playbookでの `playbook.yml` の実行以外の方法で、設定やファイル書き込みをした
  - 部分点付与せず0点
- `playbook.yml` から参照されるタスクについて、追加、モジュールの変更、順序の変更、実行条件の変更をした
  - タスクの削除、コメントアウトは例外
  - 部分点付与せず0点

200点満点

## 講評

この問題は、 `groups` 変数がAnsibleの予約語で使用できない、GitHub ActionsでのCIにてLintを行った際に `ansible.posix` コレクションを解決できないなどのトラブルを、作問者が実際に経験したことから着想を得て作問したものです。

aptによる環境構築を防ぐためにsudo権限なしとし、pipxで環境を構築することを想定して作問しました。
venvを設定した上でpipにより環境構築することも想定していましたが、想定以上にvenv+pipによる解答が多く、殆どの解答はvenvを用いていた印象です。
一部、pipxで使用しているディレクトリをwhichコマンドで探し、その環境上にpipコマンドでインストールするという解答も見受けられました。

依存パッケージである `passlib` が不足していたトラブルは、venvを用いて環境構築した場合、 `python3 -m pip install -r requirements.txt` をするだけで解決するため、別のトラブルを解決するために環境構築しているうちに、意図せず気づかない間に解決していた、そもそもトラブルがあったことに気づかなかった、というチームもあったように感じます。

また、 `passlib` が不足していたトラブルは、厳密には `Set password` タスク中で使用している `password_hash` フィルターを使用するためには `passlib` が必要というものです。
このため、varsに記載されているパスワードを予め何らかの手段でハッシュ化し、Ansibleでは `password_hash` フィルターを使用しないという解答が複数チームから提出されました。
この解答は制約には反しないため、減点とはせず、当該項目は正解したものとして扱いました。
この解答は作問者が想定していないものでしたが、複数チームが同じ手法を用いていたため、驚きました。

`sudo` グループについては、作問者としては軽い引っ掛け程度に考えており、実際に多くのチームはあまり躓いていない印象を受けました。
しかし、一部のチームは `sudo` グループを作成する、制約に反しsudoersファイルを編集して `sudo` グループを用いるなど、かなり苦戦していたように感じます。
RedHat系ディストリビューションに触れたことがあるかどうか、という点がこのトラブルで躓くかを分けたように感じます。
是非、Debian系ディストリビューションだけでなく、RedHat系ディストリビューション、あるいはBSD系OSなど、様々なOS/ディストリビューションに触れる経験をしてほしいと思います。

公開鍵認証でのSSHログインについては、Ansible Playbookの実行自体はエラーなく完了するため、気付きづらいと考えて出題しました。
実際に、このトラブルが残っていることに気づかず、50点減点された採点結果を見て気づいたというチームが多かったように感じます。
終了状態を満たしていることをきちんと確認した上で解答を提出する大切さを体感してもらえたのではないかと感じます。
本戦は採点によるフィードバックが協議時間中に行われますが、予選ではこのようなフィードバックがないため、尚のこと注意してください。

## 環境構築

この問題の環境を構築するAnsible Playbookを、 https://github.com/Crow314/ictsc2024-gpo で公開しています。
この問題をVMなどに構築することで、コンテスト外でもトラブルシューティングを体験いただけます。
