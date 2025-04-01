---
title: "ICTSC2024 本戦 問題解説: [CWJ] Postfix は大変なメールを配送していきました"
description: "ICTSC2024 本戦 問題解説: Postfix は大変なメールを配送していきました"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/cwj"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

公くんの研究室にはタスク実行を行うためのサーバがあります。公くんは記録を溜めることに興味があったため、メールの仕組みを応用して実行されたタスクのログを溜め込むことができないかと考えました。そこで、慣れないながらもメールサーバ用ソフトウェアの設定を書いてみましたが、途中でどうにもうまくいかず投げ出してしまいました。

公くんは、事前に `execwithreport` というコマンドを用意していました。このコマンドは、例えば `$ execwithreport echo "hello $USER"` のように実行したいコマンドおよびその引数を続けて書くことによって、実行されたコマンドのログが `execwithreport+<プロセス ID>@localhost` 宛てに送信されるものです。公くんは、このようなメールアドレスに宛てられたメールを UNIX ユーザ user に対して転送するような設定をしたいと思い、メールサーバの設定を頑張りましたが、どうにもうまくいかず諦めてしまったようです。

公くんの同僚であるあなたは、原因特定と修正の適用を行い、報告してください。

## 前提条件

- `/usr/local/bin/execwithreport` に変更を加えてはならない
- `/etc/postfix` 以下に新たなファイルを作成・生成してはならない
- 新規ユーザを作成してはならない

## 初期状態

`$ execwithreport echo test` のようにプログラムを実行しても、その実行結果がユーザ `user` で `$ mail` を実行したときに確認できない

## 終了状態

- `$ execwithreport echo test` のようにプログラムを実行した後、その実行結果がユーザ `user` で `$ mail` を実行することで確認できる
  - ただし、メールが正常に配送されているものとする
      - 「正常に配送されている」とは、`From` が `user@cwj-mail` またはそれに類するものであり、`To` が `execresult+<プロセス ID>` またはそれに類するものであるメールがユーザ `user` のメールボックスに配送されていることを指します
    - 例えば、MAILER-DAEMON によって `execwithreport` で送信したメールが返送されてきた場合、それは `To` が `user@cwj-mail` であることから正常に配送されていないものとみなされます

---

## 解説

### 想定解

この問題は、Postfix の設定ファイルに問題があることから発生していました。

まず、問題文にあるように `$ execwithresult echo test` を実行し、その後に `$ mail` を実行してもメールがユーザ `user` のメールボックスに配送されていないことがわかります。

```shell-session
user@cwj-mail-for-editorial-pyusuke:~$ execwithreport echo test
+ pid=2210
++ echo test
+ result=test
+ echo test
++ date
+ mail -s 'PID 2210 Sun Mar  2 16:38:41 JST 2025' execresult+2210
user@cwj-mail-for-editorial-pyusuke:~$ mail
No mail for user
user@cwj-mail-for-editorial-pyusuke:~$
```

ここで、`/var/log/mail.log` を見ると、以下のようなログが記録されていることがわかります。

```
2025-03-02T16:36:48.741258+09:00 cwj-mail-for-editorial-pyusuke postfix/pickup[1229]: B45E647C28: uid=1001 from=<user@cwj-mail-for-editorial-pyusuke>
2025-03-02T16:36:48.785889+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: error: open database /etc/execresult.db: No such file or directory
2025-03-02T16:36:48.791192+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: hash:/etc/execresult is unavailable. open database /etc/execresult.db: No such file or directory
2025-03-02T16:36:48.791307+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: hash:/etc/execresult lookup error for "*"
2025-03-02T16:36:48.791375+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: hash:/etc/execresult is unavailable. open database /etc/execresult.db: No such file or directory
2025-03-02T16:36:48.791442+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: hash:/etc/execresult lookup error for "*"
2025-03-02T16:36:48.793028+09:00 cwj-mail-for-editorial-pyusuke postfix/cleanup[1696]: B45E647C28: message-id=<20250302073648.B45E647C28@cwj-mail.local>
2025-03-02T16:36:48.802464+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[1230]: B45E647C28: from=<user@cwj-mail-for-editorial-pyusuke>, size=377, nrcpt=1 (queue active)
2025-03-02T16:36:48.802863+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: hash:/etc/execresult is unavailable. open database /etc/execresult.db: No such file or directory
2025-03-02T16:36:48.802984+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: hash:/etc/execresult lookup error for "execresult+1689@cwj-mail.local"
2025-03-02T16:36:48.803080+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[1698]: warning: transport_maps lookup failure
2025-03-02T16:36:48.857235+09:00 cwj-mail-for-editorial-pyusuke postfix/error[1699]: B45E647C28: to=<execresult+1689@cwj-mail.local>, orig_to=<execresult+1689>, relay=none, delay=0.15, delays=0.09/0.02/0/0.03, dsn=4.3.0, status=deferred (address resolver failure)
```

ここで、Postfix の設定ファイル `/etc/postfix/main.cf` を閲覧すると、`/etc/execresult` という設定ファイルを参照しているように見えますが、実際には `/etc/postfix/execresult` に当該ファイルが存在することがわかります。そこで、`/etc/execresult` となっている箇所を `/etc/postfix/execresult` に変更してみます。

この後、`$ sudo systemctl restart postfix` で設定を適用し、再度 `$ mail` を試してみると、別のエラーが表示されることがわかります。

```
2025-03-02T16:37:59.616473+09:00 cwj-mail-for-editorial-pyusuke postfix/pickup[2189]: 9654E47C2E: uid=1001 from=<user@cwj-mail-for-editorial-pyusuke>
2025-03-02T16:37:59.623441+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: error: open database /etc/postfix/execresult.db: No such file or directory
2025-03-02T16:37:59.625390+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: hash:/etc/postfix/execresult is unavailable. open database /etc/postfix/execresult.db: No such file or directory
2025-03-02T16:37:59.625484+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: hash:/etc/postfix/execresult lookup error for "*"
2025-03-02T16:37:59.626174+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: hash:/etc/postfix/execresult is unavailable. open database /etc/postfix/execresult.db: No such file or directory
2025-03-02T16:37:59.626279+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: hash:/etc/postfix/execresult lookup error for "*"
2025-03-02T16:37:59.626835+09:00 cwj-mail-for-editorial-pyusuke postfix/cleanup[2201]: 9654E47C2E: message-id=<20250302073759.9654E47C2E@cwj-mail.local>
2025-03-02T16:37:59.671856+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[2190]: 9654E47C2E: from=<user@cwj-mail-for-editorial-pyusuke>, size=378, nrcpt=1 (queue active)
2025-03-02T16:37:59.673943+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: hash:/etc/postfix/execresult is unavailable. open database /etc/postfix/execresult.db: No such file or directory
2025-03-02T16:37:59.674751+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: hash:/etc/postfix/execresult lookup error for "execresult+2194@cwj-mail.local"
2025-03-02T16:37:59.674849+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[2202]: warning: transport_maps lookup failure
2025-03-02T16:37:59.740095+09:00 cwj-mail-for-editorial-pyusuke postfix/error[2203]: 9654E47C2E: to=<execresult+2194@cwj-mail.local>, orig_to=<execresult+2194>, relay=none, delay=1.1, delays=1.1/0.01/0/0.05, dsn=4.3.0, status=deferred (address resolver failure)
```

エラー文を元に調べてみると `$ sudo postmap /etc/postfix/execresult` を行うことによって存在していないファイルを生成できるようにも見受けられますが、そのようにしても以下のようなログが表示され解決しませんし、前提条件「`/etc/postfix` 以下に新たなファイルを作成・生成してはならない」にも反してしまいます。

```
2025-03-02T16:46:24.480826+09:00 cwj-mail-for-editorial-pyusuke postfix/pickup[2578]: 74D6447C30: uid=1001 from=<user@cwj-mail-for-editorial-pyusuke>
2025-03-02T16:46:24.482203+09:00 cwj-mail-for-editorial-pyusuke postfix/cleanup[2588]: 74D6447C30: message-id=<20250302074624.74D6447C30@cwj-mail.local>
2025-03-02T16:46:24.490660+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[2580]: 74D6447C30: from=<user@cwj-mail-for-editorial-pyusuke>, size=381, nrcpt=1 (queue active)
2025-03-02T16:46:24.502865+09:00 cwj-mail-for-editorial-pyusuke postfix/local[2585]: 74D6447C30: to=<execresult+2607@cwj-mail.local>, orig_to=<execresult+2607>, relay=local, delay=0.04, delays=0.02/0/0/0.01, dsn=5.1.1, status=bounced (unknown user: "execresult+2607")
2025-03-02T16:46:24.504586+09:00 cwj-mail-for-editorial-pyusuke postfix/cleanup[2589]: 7AE0C47C32: message-id=<20250302074624.7AE0C47C32@cwj-mail.local>
2025-03-02T16:46:24.513094+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[2580]: 7AE0C47C32: from=<>, size=2367, nrcpt=1 (queue active)
2025-03-02T16:46:24.513424+09:00 cwj-mail-for-editorial-pyusuke postfix/bounce[2586]: 74D6447C30: sender non-delivery notification: 7AE0C47C32
2025-03-02T16:46:24.514363+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[2580]: 74D6447C30: removed
2025-03-02T16:46:24.523773+09:00 cwj-mail-for-editorial-pyusuke postfix/error[2591]: 7AE0C47C32: to=<user@cwj-mail-for-editorial-pyusuke>, relay=none, delay=0.02, delays=0.01/0/0/0.01, dsn=5.0.0, status=bounced (cwj-mail-for-editorial-pyusuke)
2025-03-02T16:46:24.524411+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[2580]: 7AE0C47C32: removed
```

`/etc/postfix/execresult` をよく見てみると、正規表現のような文字列が含まれているところから、`transport_maps = hash:` から始めるのではなく `transport_maps: regexp:` から始めるべきであることがわかります。

編集を加えると、次に以下のようなエラーが表示されます。

```
2025-03-02T17:52:03.722018+09:00 cwj-mail-for-editorial-pyusuke postfix/pickup[3541]: AFFAA47C38: uid=1001 from=<user@cwj-mail-for-editorial-pyusuke>
2025-03-02T17:52:03.729840+09:00 cwj-mail-for-editorial-pyusuke postfix/trivial-rewrite[3555]: warning: regexp map /etc/postfix/execresult, line 1: Invalid preceding regular expression
2025-03-02T17:52:03.731358+09:00 cwj-mail-for-editorial-pyusuke postfix/cleanup[3554]: AFFAA47C38: message-id=<20250302085203.AFFAA47C38@cwj-mail.local>
2025-03-02T17:52:03.766372+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[3542]: AFFAA47C38: from=<user@cwj-mail-for-editorial-pyusuke>, size=378, nrcpt=1 (queue active)
2025-03-02T17:52:03.804961+09:00 cwj-mail-for-editorial-pyusuke postfix/error[3556]: AFFAA47C38: to=<execresult+3547@cwj-mail.local>, orig_to=<execresult+3547>, relay=none, delay=0.26, delays=0.22/0.01/0/0.03, dsn=5.0.0, status=bounced (cwj-mail.local)
2025-03-02T17:52:03.807096+09:00 cwj-mail-for-editorial-pyusuke postfix/cleanup[3554]: C4C0747C3B: message-id=<20250302085203.C4C0747C3B@cwj-mail.local>
2025-03-02T17:52:03.828836+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[3542]: C4C0747C3B: from=<>, size=2330, nrcpt=1 (queue active)
2025-03-02T17:52:03.829255+09:00 cwj-mail-for-editorial-pyusuke postfix/bounce[3557]: AFFAA47C38: sender non-delivery notification: C4C0747C3B
2025-03-02T17:52:03.830338+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[3542]: AFFAA47C38: removed
2025-03-02T17:52:03.856205+09:00 cwj-mail-for-editorial-pyusuke postfix/error[3556]: C4C0747C3B: to=<user@cwj-mail-for-editorial-pyusuke>, relay=none, delay=0.05, delays=0.02/0/0/0.03, dsn=5.0.0, status=bounced (cwj-mail-for-editorial-pyusuke)
2025-03-02T17:52:03.857955+09:00 cwj-mail-for-editorial-pyusuke postfix/qmgr[3542]: C4C0747C3B: removed
```

正規表現が壊れていることがわかるため、`/^execresult(\+.*)(@cwj-mail)?$/ user` などに修正すると、以下のようなログが表示されます。

```
2025-03-04T20:38:10.676063+09:00 cwj-mail-20250304 postfix/pickup[2518]: A47DE47C33: uid=1001 from=<user@cwj-mail-20250304>
2025-03-04T20:38:10.682184+09:00 cwj-mail-20250304 postfix/cleanup[2530]: A47DE47C33: message-id=<20250304113810.A47DE47C33@cwj-mail.local>
2025-03-04T20:38:10.705540+09:00 cwj-mail-20250304 postfix/qmgr[2519]: A47DE47C33: from=<user@cwj-mail-20250304>, size=365, nrcpt=1 (queue active)
2025-03-04T20:38:10.706532+09:00 cwj-mail-20250304 postfix/qmgr[2519]: warning: connect to transport private/user: No such file or directory
2025-03-04T20:38:10.729616+09:00 cwj-mail-20250304 postfix/error[2532]: A47DE47C33: to=<execresult+2523@cwj-mail.local>, orig_to=<execresult+2523>, relay=none, delay=0.08, delays=0.06/0.01/0/0.02, dsn=4.3.0, status=deferred (mail transport unavailable)
```

メールの配送に失敗しているのは、そもそも `execresult+<PID>` のような形式のユーザが存在しないことに起因します。`main.cf` を見てみると、`transport_maps` で`/etc/postfix/execresult` を指定していますが、この設定項目はマッチした宛先のメールの転送先サーバを指定するものであることから、より適切な `virtual_alias_maps` に変更する必要があります。

ここまでの作業を行うと、メールを正常に送信できました。

#### まとめ

以下のような設定変更を行うことで最終状態を実現できました。

- Postfix の設定ファイル `main.cf` への変更が中途半端である
  - `transport_maps` の値で `hash:` となっている部分を `regexp:` に変更する
  - `transport_maps` を `virtual_alias_maps` に変更する
- `virtual_alias_maps` で指定する設定ファイル
  - `/^execresult(+.*)?@localhost$/ user` の正規表現は壊れているため、`/^execresult(\+.*)/ user` などに変更し、`execwithreport` で送信されたメールの宛先がマッチするようにする

この方針に当てはまる解答は 1 つありました。

#### 参考文献

- postconf(5)
- virtual(5)

### 別解1: `/etc/execresult` の変更と `virtual_alias_maps` の設定を入れる

- `/etc/execresult` の中身を `execresult user` に変更する
- `virtual_alias_maps = hash:/etc/execresult` とする
- `$ sudo postfix reload`

この方針に当てはまる解答は 1 つありました。

### 別解2: `transport_maps` の削除と `/etc/aliases` の変更

- `/etc/postfix/main.cf` にある `transport_maps = ……` を削除
- `sudo systemctl restart postfix.service`
- `/etc/aliases` に `execresult: user` を追記
- `$ sudo newaliases`

この方針に当てはまる解答は 2 つありました。

### 別解3: luser_relay を指定する

- `sudo touch /etc/execresult && sudo postmap /etc/execresult`
- `/etc/postfix/main.cf` に `luser_relay = user@cwj-mail` を追記する
- `$ sudo postfix reload`

この方針に当てはまる解答は 2 つありました。

### 別解4: 独自 transport を実装する

- `/etc/execresult` の中身を `/^execresult\+.*$/ mailback:` として作成する
- `/etc/postfix/main.cf` に `mailback  unix  -       n       n       -       -       pipe
  flags=Fq user=nobody argv=/usr/sbin/sendmail -i -f ${sender} user@localhost` を追記する
- `$ sudo postfix reload`

この方針に当てはまる解答は 1 つありました。

## 採点基準

満点は 300 点である。

### 加点

- `main.cf` で `/etc/execresult` となっているところを `/etc/postfix/execresult` に変更している（想定解の場合）、あるいは `/etc/execresult` を作成している: +30 点
- `main.cf` で `hash:` となっているところを `regexp:` に変更している（想定解の場合）、あるいは Postfix が `execresult+<PID>` に対するメールを `user` に配送するような設定が記述されている: +100 点
- Postfix の reload が実行され、`execresult+<PID>` 形式のメールがユーザ `user` に配送されるようになっている: +150 点
- `$ execwithreport <cmd> <args...>` を使って正常動作を確認している: +20 点

### 減点

- `/usr/local/bin/execwithreport` に変更が加えられている場合、解答の得点を 0 点とする

## 講評

この問題は Postfix のエラーログを見て地道に解決することもできれば、Postfix の仕組みを理解した上でより簡素にも解決できました。特に、別解 2 は最もシンプルかつわかりやすい解決方法のように見受けられ、出題側としてもこの方法に気づかず配点を 300 点としたことには申し訳なさがあります。

制約が比較的緩かったこともあり、各チーム毎に個性的な別解が提出された問題でした。reload の操作が明示されていないことから満点を逃した報告書も幾つかありました。

Postfix, Mailman3, SPF, DKIM, DMARC の設定を自前で行う研究室にて作業をしていた際に思いついた問題でした。この機会にぜひメールサーバを自前運用してみてはいかがでしょうか。

