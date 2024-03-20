---
title: "ICTSC2023 本戦 問題解説: [NLE] †権限デストロイヤー†"
description: "ICTSC2023 本戦 問題解説: †権限デストロイヤー†"
tags: [ICTSC2023,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/nle"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

同じ部署の風間くんがトイレに行ったが、パソコンをロックせずに行ってる。
SSH先は開発サーバー。
「これは先輩としてセキュリティ意識をつけさせないとな(笑)」
そう思い、何個かコマンドを打った後、モニターに付箋を貼りました。

「我が名は†権限デストロイヤー†。
貴様がパソコンをロックせずにトイレに行った隙に/home/user/memo.txtの権限を000にしてやった。
ついでにchmod含め、ほぼ全てのコマンドも000にしておいたぞ。まぁ治せるだろう。知らんけど(笑)」

戻ってきた風間くんが「memo.txtに大事なことをメモした気がするので見たい」と言い出した。

あれ？権限を変更するコマンド自体の権限を000にしたらヤバくない？
もしかして、まずいことをしてしまった？
上司にバレたら非常にまずいことになるので急いで治したい。
インターネットからなにかをダウンロードしたり、パッケージ管理ツールを使うには上司の許可が必要なので、それは絶対に使えない。

風間くんのために以下のことをやってください。

1. memo.txtをcatで見れるようにしてください。
2. /usr/bin/chmodを755にしてください。

## 前提条件

- memo.txtのの中身は維持すること

#### 禁止事項

- OSの入れ直し
- インターネットからのダウンロード
- aptなどのパッケージ管理ツールの使用

## 初期状態

/home/user/memo.txtの権限が000になっている。

## 終了状態

/usr/bin/chmodを755にする
`memo.txt`を644にし、catで見えるようにする

## 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
| porblem-kct-vm | 192.168..9.1 | user | ictsc |

---

## 解説

chmod自体を000にしてしまったため、権限を変更することが出来ない。という問題です。
それに加えて、ほとんどのコマンドも000にしてしまっているため、通常の方法で権限を変更することが出来ません。

今回の問題環境を起動するとsystemdで、このスクリプトが動くようになっていました。

```
#!/bin/bash

sudo find /usr/bin -name 'a*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'b*' ! -type d ! -name 'bash' -exec chmod 000 {} \;
sudo find /usr/bin -name 'c*' ! -name chmod -exec chmod 000 {} \;
sudo find /usr/bin -name 'd*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'e*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'f*' ! -name 'find' -exec chmod 000 {} \;
sudo find /usr/bin -name 'g*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'h*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'i*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'j*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'k*' ! -name 'kmod' -exec chmod 000 {} \;
sudo find /usr/bin -name 'l*' ! -name 'lsmod'  -exec chmod 000 {} \;
sudo find /usr/bin -name 'm*' ! -name 'mount' -exec chmod 000 {} \;
sudo find /usr/bin -name 'n*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'o*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'p*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'q*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'r*' ! -name 'rbash' -exec chmod 000 {} \;
sudo find /usr/bin -name 's*' ! -name 'sudo' ! -name 'systemd' ! -name 'sudoedit' ! -name 'systemctl' -exec chmod 000 {} \;
sudo find /usr/bin -name 't*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'u*' ! -name 'udevadm' -exec chmod 000 {} \;
sudo find /usr/bin -name 'v*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'w*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'x*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'y*' -exec chmod 000 {} \;
sudo find /usr/bin -name 'z*' -exec chmod 000 {} \;
sudo chmod 000 /usr/bin/find
sudo chmod 000 /usr/bin/chmod
```

残しているのは問題イメージの起動に必要なコマンド+lsのみになっています。

その状態での解決策ですが、ローダを使用することで解決します。<br>
000でもrootは読み込むことは出来るので、実行バイナリを直接ロードすることで実行権限に関係なくバイナリを実行出来ます。

https://zenn.dev/a_kawashiro/articles/506a224d206418

https://unix.stackexchange.com/questions/83862/how-to-chmod-without-usr-bin-chmod

## 想定解法

指定通りchmodの権限を755にする

```
user@problem-nle-vm:~$ sudo /lib64/ld-linux-x86-64.so.2 /usr/bin/chmod 755 /usr/bin/chmod
```

ls -laで権限を確認するとmemo.txtが000になっていることがわかる

```

user@problem-nle-vm:~$ ls -la
total 32
drwxr-x--- 4 user user 4096 Mar 15 16:10 .
drwxr-xr-x 5 root root 4096 Feb 22 04:49 ..
lrwxrwxrwx 1 root root    9 Feb 22 04:56 .bash_history -> /dev/null
-rw-r--r-- 1 user user  220 Jan  7  2022 .bash_logout
-rw-r--r-- 1 user user 3874 Feb 22 04:56 .bashrc
drwx------ 2 user user 4096 Feb 22 04:57 .cache
lrwxrwxrwx 1 root root    9 Feb 22 04:56 .lesshst -> /dev/null
-rw-r--r-- 1 user user  807 Jan  7  2022 .profile
drwx------ 2 user user 4096 Feb 22 04:49 .ssh
-rw-r--r-- 1 user user    0 Mar 15 16:10 .sudo_as_admin_successful
lrwxrwxrwx 1 root root    9 Feb 22 04:56 .viminfo -> /dev/null
---------- 1 root root   75 Mar 15 14:17 memo.txt
```

問題に644にしろとあるので権限を変更する

```
user@problem-nle-vm:~$ sudo chmod 644 memo.txt
chmod: changing permissions of 'memo.txt': Operation not permitted
```

attributeを確認するために以下のコマンドを実行したところ、immutable属性があることがわかる。

```
user@problem-nle-vm:~$ sudo chmod 755 /usr/bin/lsattr
user@problem-nle-vm:~$ sudo lsattr /home/user/memo.txt
----i---------e------- /home/user/memo.txt
```

chattrを使ってimmutable属性を削除する

```
user@problem-nle-vm:~$ sudo chmod 755 /usr/bin/chattr
user@problem-nle-vm:~$ sudo chattr -i memo.txt
```

memo.txtを指定通り644にしてcatで中身を見ることが出来る

```
user@problem-nle-vm:~$ sudo chmod 644 /home/user/memo.txt

user@problem-nle-vm:~$ cat memo.txt
-bash: /usr/bin/cat: Permission denied

user@problem-nle-vm:~$ sudo chmod 755 /usr/bin/cat

user@problem-nle-vm:~$ sudo cat /home/user/memo.txt
Japanese Energy Okashi“Red Fuku" 美味しかった。また食べたい
```

別解として`sudo debugfs /dev/sda1 -w`でも解決出来ます。

## 採点基準

1. chmodを755に出来ている 75点
2. chattrとchmodで/home/user/memo.txtを664にする 65点
3. catを実行出来るようにしている 5点
4. 報告書に不備がない 5点
