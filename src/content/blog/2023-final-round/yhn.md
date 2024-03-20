---
title: "ICTSC2023 本戦 問題解説: [YHN] xへ繋がりたい！"
description: "ICTSC2023 本戦 問題解説: xへ繋がりたい！"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/yhn"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

x.comへpingを打とうとすると`Name or service not known`と言われてしまうので名前解決できるよう直して欲しいです。

また`x` userを作成して`x`というパスワードでログインできるようにしてください。



## 初期状態

x.comへpingを打とうとすると`Name or service not known`と言われてしまう。
```
user@yhn:~$ ping x.com
ping: x.com: Name or service not known
```

また`x` userは存在しない。
```
user@yhn:~$ ls /home
ictsc  ubuntu  user
```

## 終了状態

- `ping x.com` でpingが問題なく通る。
- 他のドメイン(google.com, twitter.comなど)に対しても正しく名前解決できる。　（すいません追記しました。3/16 16:20)
- `x` ユーザがあり`ssh x@192.168.37.1` パスワード `x`でログインできる。

---

## 解説

### pingが通らない

`sytemd-resolved.service` が動いていない。
```
$ systemctl status systemd-resolved.service 
○ systemd-resolved.service - Network Name Resolution
     Loaded: loaded (/lib/systemd/system/systemd-resolved.service; disabled; vendor preset: enabled)
     Active: inactive (dead)
       Docs: man:systemd-resolved.service(8)
             man:org.freedesktop.resolve1(5)
```

`systemctl restart` によって再起動する。
```
$ systemctl restart systemd-resolved.service 
```

/etc/netplan/02-dns-server.yaml にDNSサーバを設定する。
```
network:
  version: 2
  ethernets:
    eth0:
      nameservers:
        addresses: [1.1.1.1, 1.0.0.1]
```

これによりdigで名前解決はできるようになったが、pingはまだ通らない。
/etc/nsswitch.conf の hosts に files しか記載されていなかったため，dns を追記し dns でも問い合わせが行われるようにする必要がある。

これを行うと無事名前解決が行われpingが通るようになる。

### xユーザの作成

x user の作成とパスワードの設定は`useradd` と `passwd` コマンドを使用する。

しかし、外部から ssh x@192.168.37.1 でログインを試みたところログインできなかった。

sshd_configに以下の記述があったためそれを削除する。
```
Match User x
    PasswordAuthentication no
```

これによりパスワード認証ができるようになったが、パスワードが間違っていると言われてしまう。

/etc/ssh/sshd_config.d/10-ictsc-passwordauth.conf　に以下の記述があったためそれを削除する。
```
DenyUsers x
```
こちらの記述によりxユーザがログインできないようになっていた。


最後にユーザーxが使用できるプロセス数が0に制限されていたため、その制限を緩めます。
/etc/security/limits.confの以下の行を削除します。
```
 x                hard    nproc           0
```

## 採点基準

前半のDNS部分のみできて53点
ただし /etc/hosts の書き換えによる回答は10点のみ。

後半のxでsshのみできた場合47点

両方できて150点

## 講評

DNS,ユーザ作成,sshの問題 の三つの簡単なトラブルの複合問題でした。
