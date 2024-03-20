---
title: "ICTSC2023 本戦 問題解説: [WQF] 設定が保存できない"
description: "ICTSC2023 本戦 問題解説: 設定が保存できない"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/wqf"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

`router` の設定ファイルをTFTPで `server` に保存したい。
しかし、何故か分からないが `server` に保存しようとするとエラーが発生する。
`router` から `server` にTFTPで設定ファイルを送信し、その方法を教えてほしい。

## 前提条件

- 設定はTFTPで転送しなければならない
- 設定内容をターミナルに出力することは認められる
- 報告書は操作内容や状況を逐一詳細に記さなければならない
    - 特に、制約に反していないこと、終了状態が満たせていることを明確に示すこと

### 制約

- `router` の設定をTFTP以外の手段で転送してはならない
- ターミナルに出力した設定内容を、設定内容の確認以外に用いてはならない
    - 確認した内容をファイルに書き込むなどの回答は認められない
- TFTPで転送したファイルに対して、移動、名前変更その他の改変を加えてはならない

## 初期状態

- `router` のconfiguration modeで `save tftp://192.168.96.2/config` としても `server` に設定ファイルを保存できない

## 終了状態

- `router` のconfiguration modeで `save tftp://192.168.96.2/config` とすると `server` に設定ファイルを保存できる
- `server` に保存された設定ファイルが回答時点での `router` の設定と同一であること
    - 設定ファイルの内容が初期状態と異なっていても問題ない

## 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
| `router` | 192.168.96.1 | user | ictsc |
| `server` | 192.168.96.2 | user | ictsc |
| `server` | 192.168.52.128 | worker |  |

## 問題環境構築用 Ansible

https://github.com/Crow314/ictsc2023-wqf

## 解説

この問題は誤った設定が行われているなどではなく、単にTFTPサーバーの仕様に関する問題です。
(このため、問題環境の構築が非常に簡単でした。)
実際の運用時でも、設定ファイルをTFTPでバックアップしようとした場合や、ファームウェアの入れ替え時などに古いファームウェアをバックアップする際に引っかかることが多いのではないでしょうか。

`man tftpd` としたとき、以下のような記述が確認できます。
```
       --create, -c
              Allow  new  files  to be created.  By default, tftpd will only allow upload of files that already exist.  Files are created with default permissions allowing anyone to read or write them, unless the --permissive or --umask
              options are specified.
```

更に抜粋すると次のようにあります。

> By default, tftpd will only allow upload of files that already exist.

即ち、デフォルトではTFTPサーバーへのアップロードは　**既存で、書き込み可能** なファイルに限り、サーバー側に存在しないファイルを新規アップロードすることはできません。
このため、touchコマンドなどで `/var/lib/tftpboot/` に `config` というファイルを作成し、最低限 `nobody` ユーザーに書き込み権限を与えることで解決できます。

別解として、上述の `-c` あるいは `--create` という引数を付けてTFTPサーバーを起動する方法もあります。
この場合、 `/usr/lib/systemd/system/tftp.service` を編集し、その変更を反映させた上で、TFTPサーバーを再起動する必要があります。

## 想定解法

- `router` への設定変更は不要
- 解法1
    - `sudo touch /var/lib/tftpboot/config`
    - `sudo chmod a+w /var/lib/tftpboot/config`
- 解法2
    - `/usr/lib/systemd/system/tftp.service` を編集
        ```diff
          [Unit]
          Description=Tftp Server
          Requires=tftp.socket
          Documentation=man:in.tftpd

          [Service]
        - ExecStart=/usr/sbin/in.tftpd -s /var/lib/tftpboot
        + ExecStart=/usr/sbin/in.tftpd -s -c /var/lib/tftpboot
          StandardInput=socket

          [Install]
          Also=tftp.socket
        ```
    - `sudo systemctl daemon-reload`
        - `systemctl edit` を用いた場合は不要
    - `sudo systemctl restart tftp`
    - `sudo chmod a+w /var/lib/tftpboot/`

## 採点基準

- 部分点はない
- 報告書不備により実施した操作が明記されていない場合は0点
    - serviceファイルの編集方法が明示されていない場合又はテキストエディタ等で直接編集した場合に、報告書において `daemon-reload` の記述がない場合など
- アップロード後の権限変更は減点しない
    - TFTPで転送したファイルに対する改変であるため、厳密には制約に反しているが、非本質的な操作であるため

## 講評

作問者はアイデア出しの時点では予めファイルを作成しておく方法しか知らなかったのですが、引数を与えてサーバーを起動する方法があることを作問を通じて知りました。
この問題では、TFTPサーバーに新規ファイルをアップロードすることは単純にはできないことを知っておいてほしいというだけの問題であったため、どちらの方法で解決しても問題ないこととしました。

作問者としては予めファイルを作成しておく解法が多く提出されると考えていましたが、実際には引数を与えてサーバーを起動する解法の方が多く提出されたように感じます。
