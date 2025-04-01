---
title: "ICTSC2024 本戦 問題解説: [dnb] アイデンティティの喪失"
description: "ICTSC2024 本戦 問題解説: アイデンティティの喪失"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/dnb"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要
新人のT君はLDAPの構築を任されましたが、どうやらうまく設定ができていないようです。正常に設定を完了させ、ユーザーがログインできるようにしてください。

## 前提条件

- OpenLDAPを用いてLDAPサーバーを構築しています。
- OpenLDAP以外のLDAPサーバーをインストールし構築することは禁止です。
- LDAPを使わずに当該ユーザーがログインできるようにすることも禁止です。（useraddや/etc/passwd変更など）
- サーバーとクライアントを同居させていることに特段意味はありません。

## 初期状態

* `ssh alice@localhost`や`su alice`が失敗する
    * 具体的には、`user alice does not exist (以下略)`や`Permission denied, please try again.`などと表示される。

## 終了状態

* `ssh alice@localhost`や`su alice`でログインができる (部分点 100点)
* `ssh alice@localhost`や`su alice`した際にグループが存在しないエラーメッセージが出ない (部分点 50点)

---

## 解説

この問題には2つのミスがある。

1. 参照するBASE dnが間違っている

    - 誤: `BASE dc=example, dc=com`
    - 正: `BASE dc=ictsc, dc=net`

`/etc/nlscd.conf`内部の`BASE dc=example, dc=com`を正しく後者に修正できていたら満点。
もしくは裏回答として、逆にサーバー側のdnをクライアントに合わせていじる方法もあるが、かなり修正量が多く現実的ではない。

2. `nsswitch.conf` が未変更

`/etc/nsswitch.conf` が以下のようになっている。

```
passwd:         files systemd ldap
group:          files systemd
shadow:         files systemd ldap
gshadow:        files systemd
(略)
```

groupにldapを書いていないのでログインはできるもののグループが存在しない警告が出る。
よって、`group:          files systemd ldap`に変更したら満点。

## 採点基準

- dnを修正できている: 100点
- nsswitchを修正できている: 50点

## 講評

LDAPを触ったことがない方も多く、思わず腰が引きがちですが、内容としては単なる設定ファイルミスとなります。
DNとは何か、またpamやnssの存在を知っているかといった中級的なレベルの知識が求められます。
