---
title: "ICTSC2024 本戦 問題解説: [JKI] 証明書を、二つも使っちゃいます！"
description: "ICTSC2024 本戦 問題解説: 証明書を、二つも使っちゃいます！"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/jki"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

社内ではプライベート認証局による自己証明書を用いた証明書基盤が構築されていました。

ある日、新しく社内の"carol.internal"というドメインに証明書を発行することになりました。

「あーあ、上司が新しいドメインに証明書発行しろしろってうるさいからコマンド打ってみるか」

「うちの証明書基盤がエラー出すわけねーよな」

「異常ねえや」

"Pending. The CA is processing your order, please wait."

## 前提条件

- CAサーバーはstep-caをデーモン化したものが常駐
- ACMEクライアントはacme.sh

## 初期状態

"carol.internal"に対して新しい証明書を発行できない

## 終了状態

- "carol.internal"に対して新しい証明書を発行できる
- opensslコマンドで発行した証明書が確認できる
    - 確認した内容を報告書に記載すること

---

## 解説

CAサーバーとACMEクライアントサーバーの`/etc/hosts`にFQDNが追加されていないため名前解決ができていないので両サーバーの`/etc/hosts`に"carol.internal"のFQDNを追記

```
user@JKI-1:~$ cat /etc/hosts
# Your system has configured 'manage_etc_hosts' as True.
# As a result, if you wish for changes to this file to persist
# then you will need to either
# a.) make changes to the master file in /etc/cloud/templates/hosts.debian.tmpl
# b.) change or remove the value of 'manage_etc_hosts' in
#     /etc/cloud/cloud.cfg or cloud-config from user-data
#
#127.0.1.1 JKI-1 JKI-1
127.0.0.1 localhost
#127.0.0.1 ca.internal

192.168.113.1 ca.internal
192.168.113.2 bob.internal carol.internal

# The following lines are desirable for IPv6 capable hosts
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters




user@JKI-2:~$ cat /etc/hosts
# Your system has configured 'manage_etc_hosts' as True.
# As a result, if you wish for changes to this file to persist
# then you will need to either
# a.) make changes to the master file in /etc/cloud/templates/hosts.debian.tmpl
# b.) change or remove the value of 'manage_etc_hosts' in
#     /etc/cloud/cloud.cfg or cloud-config from user-data
#
#127.0.1.1 JKI-2 JKI-2
127.0.0.1 localhost JKI-2
#127.0.0.1 bob.internal

192.168.113.1 ca.internal
192.168.113.2 bob.internal carol.internal

# The following lines are desirable for IPv6 capable hosts
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```

コマンド例

- sudoで無理くり発行する場合(非推奨)
```
user@JKI-2:~$ sudo .acme.sh/acme.sh --issue -d carol.internal --standalone --force --server https://ca.internal:8443/acme/acme/directory
```

- 80番ポートに来たアクセスを適当なポートへリダイレクトする場合

```
user@JKI-2:~$ cat /etc/ufw/before.rules

*nat
:PREROUTING ACCEPT [0:0]
-A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
COMMIT
```

```
user@JKI-2:~$ sudo ufw enable && sudo ufw reload
```

```
user@JKI-2:~$ acme.sh --issue -d carol.internal --standalone --server https://ca.internal:8443/acme/acme/directory --httpport 8080
```

## 採点基準

- 証明書が新しく発行されている
    - 50点
- "carol.internal"のドメインに対して`/usr/local/share/ca-certificates/root-ca.crt`とは別に２つ目の証明書として発行されている
    - 50点
- 発行された証明書にSubjectが無いなどの不備がない
    - 50点

150点満点

## 講評

こちらの問題はHTTP-01 challengeにてstandalone状態で証明書発行を行う際にぶつかりがちな問題をまとめました。

ほとんどが私の実体験で起こった問題で、FQDNが解決できていないだけで何時間も机に齧り付いたのは今でもいい思い出です…(/ _ ; )

今回問題環境にも使われているstep-caやacme.shは色々なACMEクライアントなどを使った中でもとても使いやすいものですので、pki構築などの機会がありましたら、ぜひ使ってみてください！（・ω・）ノシ
