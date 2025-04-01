---
title: "ICTSC2024 本戦 問題解説: [OMV] おきのどくですが　Webサーバーの証明書は　切れてしまいました"
description: "ICTSC2024 本戦 問題解説: おきのどくですが　Webサーバーの証明書は　切れてしまいました"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/omv"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

上司「おお　証明書基盤運用部門よ　証明書の期限を切らしてしまうとは　なにごとじゃ！」

ある日　Webサーバーの証明書が　切れていることが　発覚した…。

証明書は　定期的に更新されるように　していたはずだ。

先日　上司による命令で　無理くりWebサーバーのシステムを　dockerコンテナシステムへ移行したことぐらいしか　心当たりがない。

上司「コンテナについては　再起動するのはいいが　dockerのコンフィグファイルなどに　変更は入れないでくれ！」

## 前提条件

- CAサーバーはstep-caをデーモン化して常駐
- ACMEクライアントはacme.sh

### 制約
- `docker-compose.yml`ファイルについて、追加、変更をしてはならない

## 初期状態

webサーバーの証明書が切れている

## 終了状態

- Webサイトの証明書が更新、もしくは新しいものが登録され、TLS通信を行うことができる
    - その旨をopenssl s_clientコマンドで発行した証明書が確認できる
        - 確認した内容を報告書に記載すること

---

## 解説

CAサーバーとACMEクライアントサーバーの`/etc/hosts`にFQDNが追加されていないため名前解決ができていないので両サーバーの`/etc/hosts`にFQDNを追記

```
user@OMV-1:~$ cat /etc/hosts
# Your system has configured 'manage_etc_hosts' as True.
# As a result, if you wish for changes to this file to persist
# then you will need to either
# a.) make changes to the master file in /etc/cloud/templates/hosts.debian.tmpl
# b.) change or remove the value of 'manage_etc_hosts' in
#     /etc/cloud/cloud.cfg or cloud-config from user-data
#
#127.0.1.1 OMV-1 OMV-1
127.0.0.1 localhost OMV-1

192.168.135.1 ca.internal
192.168.135.2 bob.internal

# The following lines are desirable for IPv6 capable hosts
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters



user@OMV-2:~$ cat /etc/hosts
# Your system has configured 'manage_etc_hosts' as True.
# As a result, if you wish for changes to this file to persist
# then you will need to either
# a.) make changes to the master file in /etc/cloud/templates/hosts.debian.tmpl
# b.) change or remove the value of 'manage_etc_hosts' in
#     /etc/cloud/cloud.cfg or cloud-config from user-data
#
#127.0.1.1 OMV-2 OMV-2
127.0.0.1 localhost OMV-2

192.168.135.1 ca.internal
192.168.135.2 bob.internal

# The following lines are desirable for IPv6 capable hosts
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters

user@OMV-2:~$
```

dockerとシステム上で共有しているディレクトリで適したパーミッションのディレクトリに証明書を配置してコンテナを再起動

今回の場合だと、`docker-compose.yaml`でバインドマウントされている記述がある`/usr/local/share/ca-certificates/`の配下に配置する

nginxのコンフィグにも`/usr/local/share/ca-certificates/`の中を参照するようにしてありここで気付くこともできる

## 採点基準

- 証明書が新しく発行されている
    - 50点
- Webサイトが証明書が付与された状態で表示できる
    - 100点
- dockerのコンフィグファイルについて追加、変更をしている
    - -50点

150点満点

## 講評

こちらの問題では、既存のWebサーバーのシステムをコンテナ環境へ移行した時に発生するかもしれない(した)問題をまとめました＿φ_:(´ཀ`」 ∠):

証明書は正しく発行できているのに、それをnginx側にしっかり読み込ませられておらず、50点と採点される解答が多かったのを覚えており、内心で(惜しい！)と思っていました(＞ ^ ＜;)

これから遭遇してもおかしくないケースだと思いますので、ぜひ参考にしていただけると幸いです！
