---
title: "ICTSC2024 本戦 問題解説: [LHM] SSHの番犬"
description: "ICTSC2024 本戦 問題解説: SSHの番犬"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/lhm"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要
SSHでKerberos認証を使おうとしていますが、何度試してもチケットが正しく発行されず、SSHの認証がうまくいきません。
Kerberos認証を用いてSSH接続ができるようにしてください。

## 前提条件
- KDCサーバーの`/etc/krb5.conf`と`/etc/krb5kdc/`のファイルを変更しない
- SSHサーバーに変更を加えない
- Kerberos認証を使用する

## 初期状態
- Userサーバーから `$ ssh ssh@ssh.example.com` を実行しても、SSH接続が確立できない

## 終了状態
- Userサーバーで`$ klist`を実行した時に、有効期限内のチケットが発行されている

例
```
user@user:~$ klist
Ticket cache: FILE:/tmp/krb5cc_1001
Default principal: ssh@EXAMPLE.COM

Valid starting     Expires            Service principal
02/09/25 22:32:30  02/10/25 22:32:25  krbtgt/EXAMPLE.COM@EXAMPLE.COM
```

- Userサーバーから`$ ssh ssh@ssh.example.com`を実行して、パスワード無しでSSH接続ができる

## ネットワーク図
![](/images/2024-final-round/lhm.png)

---

## 解説
この問題では、主に3つのトラブルを解決する必要がありました。

1つ目は、`$ klist`や`$ kinit`を実行した際に、`Permission denied`が表示され、コマンドが正常に動作しないというものでした。
これは、Kerberosの設定ファイル`/etc/krb5.conf`に適切な権限が設定されておらず、ファイルを読み取れないことが原因です。
以下のように権限を確認すると、アクセス権限がない状態であることがわかります。
```
user@user:~$ ls -l /etc/krb5.conf
---------- 1 root root 2296 Mar  4 21:31 /etc/krb5.conf
```
そのため、`$ sudo chmod 644 /etc/krb5.conf`のように権限を付与することで解決します。

2つ目は、`$ ssh ssh@example.com`のように接続しようとした際に、ホスト名とIPアドレスが結びついておらず、名前解決ができないというものでした。
問題概要に記載されていた各サーバーのIPアドレスをもとに、`/etc/hosts`に追記することで解決します。
```
192.168.109.1 kdc.example.com
192.168.109.2 ssh.example.com
192.168.109.3 user.example.com
```

別解として、接続先情報に記載されていたIPアドレスでも大丈夫でした。
```
192.168.9.1 kdc.example.com
192.168.9.2 ssh.example.com
192.168.9.3 user.example.com
```

3つ目は`$ kinit ssh`を実行した際に
```
kinit: Client 'ssh@example.com' not found in Kerberos database while getting initial credentials
```
というエラーが出ることでした。
このエラーからKDCサーバーにユーザープリンシパルが存在しないか、レルムが一致していないことが原因だと考えられます。
KDCサーバーとUserサーバーで`/etc/krb5.conf`を確認すると、レルムの設定が異なっていることがわかりました。

- KDCサーバーでは : `EXAMPLE.COM`
- Userサーバーでは : `example.com`

今回はKDCサーバー側の`/etc/krb5.conf`は触れないという制約があったため、User側のレルムを`EXAMPLE.COM`に修正し、レルムを一致させます。
```
[libdefaults]
        default_realm = EXAMPLE.COM
```

```
[realms]
        EXAMPLE.COM = {
                kdc = kdc.example.com
                admin_server = kdc.example.com
        }
```

以上3つのトラブルを解決した後、`$ kinit ssh`を実行し、ユーザープリンシパルのパスワードを入力するとTGTが取得できました。
```
user@user:~$ kinit ssh
Password for ssh@EXAMPLE.COM:
```
```
user@user:~$ klist
Ticket cache: FILE:/tmp/krb5cc_1001
Default principal: ssh@EXAMPLE.COM

Valid starting     Expires            Service principal
02/09/25 22:32:30  02/10/25 22:32:25  krbtgt/EXAMPLE.COM@EXAMPLE.COM
```

この状態で`$ ssh ssh@ssh.example.com`を実行すると、Kerberos認証を使用してSSHサーバーにログインができます。

## 採点基準
合計150点満点

- Userサーバーの`/etc/krb5.conf`に読み取り権限が付与されている
    - 30点
- Userサーバーのホスト名とIPアドレスの結び付けができている
    - 50点
- レルム名が適切に設定されている
    - 70点

## 講評
Kerberos認証の問題はいかがでしたでしょうか。
名前は聞いたことがあっても、実際に構築した経験がある方はあまり多くないかもしれません。
今回の問題自体はさほど難しくなく、全体の半数以上のチームが解けました。

これを機に、ぜひKerberos認証に興味を持っていただければと思います。
