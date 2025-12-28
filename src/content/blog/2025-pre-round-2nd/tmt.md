---
title: "ICTSC2025 二次予選 問題解説: 情シスことはじめ"
description: "ICTSC2025 二次予選 問題解説: 情シスことはじめ"
tags: ["ICTSC2025", "問題解説"]
pubDate: 2025-12-27T08:47:11.836Z
slug: "2025/12/27/ictsc2025pr2/tmt"
draft: false
renderer: "md"
sticky: false
---

## 概要

情シス 1日目のあなたは、先輩情シス社員から、情シス検証用の持ち出し ubuntu のクライアント PC を手渡され、
DNS/DHCPサーバ (srv) の設定変更時のトラブルシュートをお願いされました。

早速 PC をもってサーバー室ヘ行き、ルータに接続し、作業にとりかかります。

構成図↓

```
                              +------------------------+
                              |                        |
                           .1 |         ROUTER         |  .1
             +----------------+          (rt)          +----------------+
             |           eth2 |                        | eth1           |
             |                +------------------------+                |
             |                                                          |
10.10.0.0/24 |                                                          |   10.0.0.0/24
             |                                                          |
             |                                                          |
             |                                                          |
        eth1 | dhcp                                               eth1  | .10
 +------------------------+                                +------------------------+
 |                        |                                |                        |
 |       Client PC        |                                |         SERVER         |
 |       (ubuntu)         |                                |          (srv)         |
 |                        |                                |         DNS/DHCP       |
 +------------------------+                                +------------------------+
```

## 小問 1

早速作業をしようと PC を接続したところ、 DHCP で降ってくるはずの正しいセグメント(10.10.0.0/24)のアドレスが降ってきていない様子です。

例:

```
user@ubuntu:~$ ip a
--snip--
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether de:ad:be:ef:ca:fe brd ff:ff:ff:ff:ff:ff
    altname enp0s4
    altname ens4
    inet 169.254.42.132/16 brd 169.254.255.255 scope link eth1 <<< wrong IP
       valid_lft forever preferred_lft forever
    inet6 fe80::9ea3:baff:fe31:bc3b/64 scope link 
       valid_lft forever preferred_lft foreve
```

各マシンの設定を確認し、クライアント(ubuntu)が IP アドレスを DHCP により取得し、そのアドレスを用いて DNS/DHCP サーバ(srv)へ疎通できるように適宜変更し、先輩からお願いされた作業に取りかかれるようにしてください。

## 小問 2

クライアント PC がネットワークに接続できたところで、 DNS の設定をみます。この組織では BIND9 を使用しているようです。

この組織では `ictsc.internal` というドメインを使っており、先輩は `test.ictsc.internal` の A レコードを追加したそうです。

サーバを見直し、先輩のミスを特定し、以下のコマンドで正しく `test.ictsc.internal` の A レコードを引けるように適宜変更を加えること。

```
dig @10.0.0.10 test.ictsc.internal
```

## 条件

* クライアントは DHCP で IP アドレスを取得すること
* DHCP サーバの設定変更はしてはいけない
* この構成上に、 DHCP・DNS サーバを追加してはいけない
  * 既に動いているサーバ上のデーモンを使用すること
* ゾーンファイルの編集を要する場合は適切に編集すること
* クライアント・サーバへの package/app の追加インストールをしてはいけない
* IGP を動かしてはいけない
* ルータの interface IP を変更・追加してはいけない
* セキュリティ上の懸念から、既存ルール・ポリシーがあるときに、変更するときには常識的に小さい範囲とすること
  * 少なくとも全許可などは不可、ということ
* 回答の記述について
  * 回答を示すときには、終了状態に達した根拠となるコマンドの実行結果も回答に含めること
  * 小問 2において、何らかのファイルを変更した場合には、変更したファイルについては、 cat 等で回答に変更内容を含めること

## 初期状態

1. クライアント(ubuntu) が DHCP で `srv: 10.0.0.10` からアドレスが取得できていない
1. クライアント(ubuntu) が `test.ictsc.internal` を `srv: 10.0.0.10` で名前解決できない

## 終了状態

諸条件に満たした状態で

1. クライアント(ubuntu) が DHCP で `srv: 10.0.0.10` からアドレスが取得できる
1. クライアント(ubuntu) が下記のコマンドで `test.ictsc.internal` を `srv: 10.0.0.10` で名前解決でき、正しい A レコードを取得できる

```
dig @10.0.0.10 test.ictsc.internal
```

## 接続情報

| ホスト名 | IPアドレス     | ユーザ | パスワード |
| -------- | -------------- | ------ | ---------- |
| rt       | 192.168.255.10 | user   | ictsc2025  |
| srv      | 192.168.255.11 | user   | ictsc2025  |
| ubuntu   | 192.168.255.12 | user   | ictsc2025  |

----

## 解説

問題設定的には DNS の設定確認(小問 2)を先輩から依頼されていますが、取り掛かろうとしたところで小問 1 に遭遇します。
トラブルシューティングしようとしたら、トラブルシューティングが必要になるの、あるあるですよね。

### 小問1

問題文にもある通り、`169.254.42.132/16` がインターフェースに振られているようです。

察しのよい方はここで、 DHCP でのアドレス取得失敗時に自己生成されるリンクローカルアドレスではないか、と思うとおもいます。
すばらしい推察ですが、今回はそうではなく static に `169.254.0.0/16` を割り当てたようです。
情シスの持ち出しパソコンなので、持ち出し先で突如適当な設定変更をし、ついそのままになっていたようですね。

static IP をけし、 DHCP の設定に有効化、 `sudo netplan apply` します。

```diff
 network:
   ethernets:
     eth1:
-      dhcp4: no
+      dhcp4: true
       dhcp-identifier: mac
       macaddress: de:ad:be:ef:ca:fe
-      addresses:
-        - 169.254.42.132/16
   version: 2
   renderer: networkd
```

これで DHCP が有効になりましたが、まだ IP は振られないようです。
察しのよい方はここで、構成図を見て、 DHCP サーバは別セグメントであることに気づいたのではないでしょうか。お目が高いです。
DHCP はブロードキャストで始まりますので、別セグメントへ到達させるためにはルータが気を利かせて中継する DHCP リレーを使用する必要があります。

`rt` (VyOS) に DHCP リレーの設定がないので、設定を追加します。
VyOS 公式ドキュメントをググり、それらしい設定をいれると動きます。

```
conf
 set service dhcp-relay server 10.0.0.10
 set service dhcp-relay upstream-interface eth1
 set service dhcp-relay listen-interface eth2
commit
save
```

ここまでで DHCP で IP が取得でき、 小問 1は終了です。多分リース範囲の先頭の `10.10.0.128/24` が振られると思います。
採点していると、古いコマンドや、必要以上に `upstream-interface` を有効化している例がありましたが、ここでは動けばとりあえず OK としました。
また、 VyOS の CLI を使わず、rt を単に Linux マシンと捉えて解いている例もありました。本来 CLI があるのでそれを使うべきな気がしますが、禁止していないのでとりあえず OK としました。

### 小問2

ここまでで、トラブルシューティングのためのトラブルシューティングが済んだのでトラブルシューティングに移ります。

症状は DNS でレコードが取れないということです。
コマンドを実行してみると一瞬で host unreachable が 3回きます。

```bash
root@ubuntu:~# dig @10.0.0.10 test.ictsc.internal
;; communications error to 10.0.0.10#53: host unreachable
;; communications error to 10.0.0.10#53: host unreachable
;; communications error to 10.0.0.10#53: host unreachable

; <<>> DiG 9.18.39-0ubuntu0.24.04.2-Ubuntu <<>> @10.0.0.10 test.ictsc.internal
; (1 server found)
;; global options: +cmd
;; no servers could be reached
```

察しのよい方はここで、 Reject の早さを怪しく考え、サーバ側の FW 設定をチェックしようと感じると思います。お目が高いです。
dns 関係がないですので、ルール追加します。

```bash
[user@srv ~]$ sudo firewall-cmd --list-all
public (active)
  target: default
  icmp-block-inversion: no
  interfaces: eth0 eth1
  sources:
  services: cockpit dhcp dhcpv6-client ssh  <<< dns 53/udp がない
  ports:
  protocols:
  forward: yes
  masquerade: no
  forward-ports:
  source-ports:
  icmp-blocks:
  rich rules:
[user@srv ~]$ sudo firewall-cmd --add-service=dns --permanent
success
[user@srv ~]$ sudo firewall-cmd --reload
success
[user@srv ~]$ sudo firewall-cmd --list-all
public (active)
  target: default
  icmp-block-inversion: no
  interfaces: eth0 eth1
  sources:
  services: cockpit dhcp dhcpv6-client dns ssh  <<< added
--snip--
```

採点していたところ、素晴らしい心意気の方は `10.10.0.0/24` セグメントだけを許可していました。素晴らしいと思いましたので、心の中でのみですが加点しました。

さて、これでも解決しません。
もう一度名前を引いてみても、正しい A レコードはとれていません。
察しのよい方はここで、先程とは状況が変わっており、 `status: REFUSED` に目がいくのではないでしょうか。お目が高いです。

```bash
root@ubuntu:~# dig @10.0.0.10 test.ictsc.internal

; <<>> DiG 9.18.39-0ubuntu0.24.04.2-Ubuntu <<>> @10.0.0.10 test.ictsc.internal
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: REFUSED, id: 55000  <<< status 注目
;; flags: qr rd; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; COOKIE: d46bcf4d26cf352401000000694a90870aa386c63ff20f60 (good)
; EDE: 18 (Prohibited)
;; QUESTION SECTION:
;test.ictsc.internal.           IN      A
```

BIND でしたので設定ファイル `/etc/named.conf` を確認します。
すると、BIND で ACL がかけられていること、アドレス範囲をミスっていることに気づきますので、修正します。

```diff
        secroots-file   "/var/named/data/named.secroots";
        recursing-file  "/var/named/data/named.recursing";
        allow-query     {
-               10.10.0.0/25;
+               10.10.0.0/24;
                localhost;
        };
```

次に、ゾーンファイルを確認します。
`$ORIGIN` 設定がありますので、ゾーンファイル内のレコードは `.` で終わらない限り、`$ORIGIN` の `ictsc.internal.` が続くものと解釈されます。
察しの良い方はここで `test.ictsc.internal` の末尾に `.` がないため、 `test.ictsc.internal.ictsc.internal` と解釈されてしまっていることに気づいたことでしょう。
お目が高いので、 `.` を追加するか、 `test` のみにします。
また、ゾーンファイルの内容を変更したので、お行儀よくシリアルをインクリメントします。
`2025110102` から `1` 増やせばいいですが、よくある日付 + 2桁 で運用しているようなので、既存踏襲で `2025121301` とかにするのが気遣い上手ですね。

```diff
[root@srv ~]# cat /var/named/ictsc.internal.zone
$TTL    3600
$ORIGIN ictsc.internal.   <<< origin 設定あり
@               IN      SOA     ns.ictsc.internal.  (
                                        root.ictsc.internal.
-                                        2025110102 ; Serial
+                                        2025121301 ; Serial
                                        28800      ; Refresh
                                        14400      ; Retry
                                        3600000    ; Expire
                                        86400      ; Minimum
                                )
;
ictsc.internal.         IN      NS      ns
ictsc.internal.         IN      MX      0       .
ictsc.internal.         IN      TXT     "v=spf1 -all"
_dmarc.ictsc.internal.          IN      TXT     "v=DMARC1; p=reject"
;
; A RECORDS
;
ns.ictsc.internal.              IN      A       10.0.0.10
-test.ictsc.internal             IN      A       192.0.2.123   <<< 末尾に "." がない
+test             IN      A       192.0.2.123 
hoge            IN      A       192.0.2.1
```

以下の条件がありますので、レコードの編集が適切であっても、シリアルの更新をついうっかり忘れてしまった場合、ちょっと減点としました。
シリアル更新忘れはあるあるミスですが、セカンダリ等が見ていることもあると思いますので、丁寧に仕事をしたいところです。
> ゾーンファイルの編集を要する場合は適切に編集すること

ここで、設定反映のために named デーモンをリスタート/リロードをしましょう。
しかし、 `restart` / `reload` の前には一度 `status` を確認しておくのが基本です。
するとどうでしょう、 `named` デーモンは `inactive` です。

```bash
[user@srv ~]$ systemctl status named
○ named.service - Berkeley Internet Name Domain (DNS)
     Loaded: loaded (/usr/lib/systemd/system/named.service; disabled; preset: disabled)
     Active: inactive (dead)   <<< inactive

Dec 13 13:44:00 srv systemd[1]: named.service: Unit cannot be reloaded because it is inactive.
Dec 14 00:00:30 srv systemd[1]: named.service: Unit cannot be reloaded because it is inactive.
Dec 21 00:00:30 srv systemd[1]: named.service: Unit cannot be reloaded because it is inactive.
```

しかし、さきほどから `dig` には応答するので、別のデーモンが応答していることになります。
任意の手法で確認すると、 `chroot` で動いていることがわかります。

```
[user@srv ~]$ sudo ps -ef | grep named
named        672       1  0 Dec13 ?        00:00:30 /usr/sbin/named -u named -c /etc/named.conf -t /var/named/chroot  <<< chroot 環境であることがわかる
user       12381   12347  0 22:00 pts/0    00:00:00 grep --color=auto named
```

`status` を確認してみましょう。動いているのは `named-chroot` でした。
つまり、リスタート/リロードするならこちらでした。

```bash
[user@srv ~]$ systemctl status named-chroot
● named-chroot.service - Berkeley Internet Name Domain (DNS)
     Loaded: loaded (/usr/lib/systemd/system/named-chroot.service; enabled; preset: disabled)
     Active: active (running) since Sat 2025-12-13 13:44:00 JST; 1 week 3 days ago              <<< こちらが動いていた
    Process: 651 ExecStartPre=/bin/bash -c if [ ! "$DISABLE_ZONE_CHECKING" == "yes" ]; then /usr/bin/named-checkconf -t /var/named/chr>
    Process: 668 ExecStart=/usr/sbin/named -u named -c ${NAMEDCONF} -t /var/named/chroot $OPTIONS (code=exited, status=0/SUCCESS)
    Process: 9245 ExecReload=/bin/sh -c if /usr/sbin/rndc null > /dev/null 2>&1; then /usr/sbin/rndc reload; else /bin/kill -HUP $MAIN>
   Main PID: 672 (named)
      Tasks: 5 (limit: 4644)
     Memory: 12.9M
        CPU: 31.020s
     CGroup: /system.slice/named-chroot.service
             └─672 /usr/sbin/named -u named -c /etc/named.conf -t /var/named/chroot

Dec 23 00:00:31 srv named[672]: network unreachable resolving './DNSKEY/IN': 2801:1b8:10::b#53
Dec 23 00:00:31 srv named[672]: network unreachable resolving './DNSKEY/IN': 2001:7fd::1#53
Dec 23 00:00:31 srv named[672]: network unreachable resolving './DNSKEY/IN': 2001:500:9f::42#53
Dec 23 00:00:31 srv named[672]: managed-keys-zone: Key 20326 for zone . is now trusted (acceptance timer complete)
Dec 23 00:00:31 srv named[672]: managed-keys-zone: Key 38696 for zone . is now trusted (acceptance timer complete)
--snip--
[user@srv ~]$ sudo systemctl restart named-chroot
```

採点していたところ、設定反映しようとし、勢いよく `systemctl restart named` を行う回答が意外と多かったです。
これでは `inactive` であった `named` デーモンを稼働させてしまいますので、不適切です。
問題の条件にも違反してしまい、得点がつきません。
>
> * この構成上に、 DHCP・DNS サーバを追加してはいけない
    * 既に動いているサーバ上のデーモンを使用すること

ここまですることで、正しく A レコードを取得できます！

```bash
user@ubuntu:~$ dig @10.0.0.10 test.ictsc.internal

; <<>> DiG 9.18.39-0ubuntu0.24.04.2-Ubuntu <<>> @10.0.0.10 test.ictsc.internal
; (1 server found)
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 1491
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; COOKIE: bca962a502362e9e01000000694a9b645a790a07f4e6aedd (good)
;; QUESTION SECTION:
;test.ictsc.internal.           IN      A

;; ANSWER SECTION:
test.ictsc.internal.    3600    IN      A       192.0.2.123

;; Query time: 1 msec
;; SERVER: 10.0.0.10#53(10.0.0.10) (UDP)
;; WHEN: Tue Dec 23 22:38:44 JST 2025
;; MSG SIZE  rcvd: 92
```

以上で問題は終わりです。
あえてベアメタルで、 BIND と dhcpd を使うという非常にレガシーな構成にしてみました。
レガシーシステムであれど、突如運用することになるというのもあるあるかなと思ったので問題にしてみました。
ほぼほぼ皆さんに最後まで解いてもらい、意図せず減点になっている方もそこそこいましたが、満点回答の方も何件かあったと思います。
お疲れ様でした。
