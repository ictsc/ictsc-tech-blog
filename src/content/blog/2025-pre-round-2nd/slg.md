---
title: "ICTSC2025 二次予選 問題解説: ログが保存されない"
description: "ICTSC2025 二次予選 問題解説: ログが保存されない"
tags: ["ICTSC2025", "問題解説"]
pubDate: 2025-12-27T08:46:11.428Z
slug: "2025/12/27/ictsc2025pr2/slg"
draft: false
renderer: "md"
sticky: false
---

## 概要

あなたは、syslogサーバーの状態がおかしいからsyslogサーバーを調査してほしいとお願いされました。
調査をお願いしてきた人から話を聞くと以下の問題が発生しているようです。

- router01からのsyslogメッセージを受け取った際にはsyslog-server内の/var/log/rsyslog/router01/router01.logに書き込まれる。
- router02からのsyslogメッセージを受け取った際にはsyslog-server内の/var/log/rsyslog/router02/router02.logに書き込まれない。

原因を特定してsyslogサーバーがrouter01とrouter02からsyslogメッセージを受け取った際に
所定のファイルにログが書き込まれるようにしましょう。

## 構成概要

- syslog-serverはrsyslogを利用してrouter01およびrouter02からのメッセージを受け取っている。
  - router01から送信されるメッセージは/var/log/rsyslog/router01/router01.logに書き込まれる想定となっている。
  - router02から送信されるメッセージは/var/log/rsyslog/router02/router02.logに書き込まれる想定となっている。
- 大まかな構成・配線は下図の通りとなる。

![](/images/2025-pre-round-2nd/slg.jpg)

## 制約条件

- syslog-server、router01およびrouter02のIPアドレスを変更してはいけない。

## 初期状態

- router01からのsyslogメッセージがserver01内の/var/log/rsyslog/router01/router01.logに書き込まれる。
- router02からのsyslogメッセージがserver01内の/var/log/rsyslog/router02/router02.logに書き込まれない。

## 終了状態

- syslog-serverが以下を満たすこと。
  - router01からメッセージを受け取った際に/var/log/rsyslog/router01/router01.logに書き込まれること。
  - router02からメッセージを受け取った際に/var/log/rsyslog/router02/router02.logに書き込まれること。
- サーバーが再起動しても終了状態を維持されていること。

## 動作確認方法

### テストメッセージの送信方法

router01/router02で以下を実行

```
$logger -p local7.info "Remote Server Test Mssage"
```

## 接続情報

| ホスト名 | IP アドレス  | ユーザ | パスワード |
| -------- | ------------ | ------ | ---------- |
| syslog-server | 192.168.255.20 | user   | ictsc2025  |
| router01 | 192.168.255.21 | user   | ictsc2025  |
| router02 | 192.168.255.22 | user   | ictsc2025  |

----

## 解説

この問題に関しては部分点を 0 にするかわりに

あえて制約を緩くして firewalld の設定を吹き飛ばしても、

本解説とはまったく別の設定を入れても終了条件をすべて満たしていれば満点の 50 点で採点しています。

問題解説は以下からとなります。

### 問題解説概要

本問題は firewalld の初期状態の抜粋が以下となっており、

firewalldの設定不備による問題となっていました。

```
[user@syslog-server ~]$ sudo firewall-cmd --list-all
public (active)
  target: default
  interfaces: eth0
  rich rules:
        rule family="ipv4" source address="192.168.255.21/32" port port="514" protocol="udp" accept
[user@syslog-server ~]$
```

上記設定を見ると syslog パケットである udp 514 番ポート宛てとなるパケットに関しては

router01 の IP アドレス（192.168.255.21/32）のみを accept する設定がされていました。

そのため router02 からの syslog パケットに関してはfirewalld により drop されていたため、

所定のファイルにログが書き込まれなかったという内容となります。

### 問題解説詳細

初期状態の確認のためにとりあえずログを送信してみます。

router01

``` sss
user@router01:~\$ logger -p local7.info "Router01 Remote Server Test Mssage"
user@router01:~\$
```

router02

```
user@router02:~\$ logger -p local7.info "Router02 Remote Server Test Mssage"
user@router02:~\$
```

syslog-server

```
[user@syslog-server ~]$ sudo tail -n 5 /var/log/rsyslog/router01/router01.log
Dec 14 06:38:42 router01 user: Router01 Remote Server Test Mssage
Dec 14 06:38:42 router01 user[2753]: Router01 Remote Server Test Mssage
Dec 14 06:40:45 router01 user: Router01 Remote Server Test Mssage
Dec 14 06:40:45 router01 user[2755]: Router01 Remote Server Test Mssage
[user@syslog-server ~]$
[user@syslog-server ~]$ sudo tail -n 5 /var/log/rsyslog/router02/router02.log
tail: cannot open '/var/log/rsyslog/router02/router02.log' for reading: No such file or directory
[user@syslog-server ~]$
```

上記の結果を見るとrouter02に関してはログファイルが存在しないようです。

次に rsyslog の状態を見てみましょう

```
[user@syslog-server ~]$ sudo systemctl status rsyslog
● rsyslog.service - System Logging Service
     Loaded: loaded (/usr/lib/systemd/system/rsyslog.service; enabled; preset: enabled)
     Active: active (running) since Sun 2025-12-14 06:37:30 JST; 23min ago
（省略）

[user@syslog-server ~]$ cat /etc/rsyslog.conf
（省略）
### ADD
$AllowedSender UDP, 127.0.0.1, 192.168.255.20/28

[user@syslog-server ~]$ ls /etc/rsyslog.d/
50-router01.conf  60-router02.conf

[user@syslog-server ~]$ cat /etc/rsyslog.d/50-router01.conf
if ($fromhost-ip == '192.168.255.21') then {
    local7.* action(type="omfile" file="/var/log/rsyslog/router01/router01.log" fileCreateMode="0755" dirCreateMode="0755")
    stop
}

[user@syslog-server ~]$ cat /etc/rsyslog.d/60-router02.conf
if ($fromhost-ip == '192.168.255.22') then {
    local7.* action(type="omfile" file="/var/log/rsyslog/router02/router02.log" fileCreateMode="0755" dirCreateMode="0755")
    stop
}
[user@syslog-server ~]$
```

router01 からのログは書き込まれていることもあり、

systemctl statusでサービスを見ても `Active: active (running)` になっていて、

その他設定ファイルの `$AllowedSender`、`fromhost-ip` あたりを見ても

正しい値が入っていて軽く見た程度では原因となりそうな設定は見られないと思います。

次にパケットが届いているかポートが開いているかを確認してみます。

```
[user@syslog-server ~]$ sudo tcpdump -i eth0 -nnn port 514
dropped privs to tcpdump
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
07:37:10.989788 IP 192.168.255.21.50621 > 192.168.255.20.514: SYSLOG local7.info, length: 70
07:37:11.427918 IP 192.168.255.21.50621 > 192.168.255.20.514: SYSLOG local7.info, length: 76
07:37:16.802570 IP 192.168.255.22.49324 > 192.168.255.20.514: SYSLOG local7.info, length: 70
07:37:16.873122 IP 192.168.255.22.49324 > 192.168.255.20.514: SYSLOG local7.info, length: 76
^C
4 packets captured
6 packets received by filter
0 packets dropped by kernel

[user@syslog-server ~]$ ss -an | grep 514
udp   UNCONN 0      0                                         0.0.0.0:514                 0.0.0.0:*
udp   UNCONN 0      0                                            [::]:514                    [::]:*
[user@syslog-server ~]$
```

router01からのログは正常に書き込まれていることもあり

router01/router02両方からのパケットが届いていて、

udp の 514 番ポートがあいているため、

ここでも特に原因となりそうな情報は見つからないと思います。

上記の結果から軽く見た限り L3 以下と rsyslog の設定に関しては問題がないように見えます。

次に L4 の確認のため nc(netcat) を使用してみます。

```
[user@syslog-server ~]$ sudo nc -l 514 -u
router01
router01
^C
[user@syslog-server ~]$

user@router01:~$ nc 192.168.255.20 514 -u
router01
router01
^C
user@router01:~$

user@router02:~$ nc 192.168.255.20 514 -u
router02
user@router02:~$ nc 192.168.255.20 514 -u
router02
user@router02:~$
```

nc の結果を見てみると router01 からのみメッセージを受信できているので、

router02 と syslog-server 間で L4 レベルの通信ができていないことがわかります。

今回は OS に AlmaLinux が利用されているため、

firewall（firewalld）の状態を確認してみると以下のようになっていて、

あいているように見えていた udp の 514 番ポートが router01 のアドレスからのみ空いていることが確認できると思います。

```
[user@syslog-server ~]$ sudo firewall-cmd --state
running

[user@syslog-server ~]$ sudo firewall-cmd --list-all
（省略）
public (active)
  target: default
  interfaces: eth0
  rich rules:
        rule family="ipv4" source address="192.168.255.21/32" port port="514" protocol="udp" accept
[user@syslog-server ~]$
```

終了状態に以下とあるため、

再起動しても設定が保存されるように router02 のアドレスをあける設定を入れます。
> サーバーが再起動しても終了状態を維持されていること。

想定解コマンドとしては以下になります。

```
[user@syslog-server ~]$ sudo firewall-cmd --add-rich-rule='rule family=ipv4 source address="192.168.255.22/32" port port="514" protocol="udp" accept' --zone=public  --permanent
success

[user@syslog-server ~]$ sudo firewall-cmd --reload
success

[user@syslog-server ~]$ sudo firewall-cmd --list-all
（省略）
public (active)
  target: default
  interfaces: eth0
  rich rules:
        rule family="ipv4" source address="192.168.255.22/32" port port="514" protocol="udp" accept
        rule family="ipv4" source address="192.168.255.21/32" port port="514" protocol="udp" accept
[user@syslog-server ~]$

```

上記想定解を入れた後に動作確認を行うと終了条件を満たしていることが確認できます。

```
user@router01:~$ logger -p local7.info "Router01 Remote Server Test Mssage"
user@router01:~$

user@router02:~$ logger -p local7.info "Router02 Remote Server Test Mssage"
user@router02:~$

[user@syslog-server ~]$ sudo tail -n 5 /var/log/rsyslog/router01/router01.log
Dec 14 07:37:09 router01 user[2951]: Router01 Remote Server Test Mssage
Dec 14 07:51:10 router01 user: Router01 Remote Server Test Mssage
Dec 14 07:51:10 router01 user[2958]: Router01 Remote Server Test Mssage
Dec 14 08:28:03 router01 user: Router01 Remote Server Test Mssage
Dec 14 08:28:03 router01 user[3144]: Router01 Remote Server Test Mssage

[user@syslog-server ~]$ sudo tail -n 5 /var/log/rsyslog/router02/router02.log
Dec 14 08:28:34 router02 user: Router02 Remote Server Test Mssage
Dec 14 08:28:34 router02 user[3204]: Router02 Remote Server Test Mssage
[user@syslog-server ~]$
```

想定回答の問題解説は以上となります。

tcpdump で router02 からのパケットが届いていることは確認していたものの

router01 からのログは正常に書き込まれていたためか firewalld の状態を確認しておらず、

ポートがすべて開いていると思い込んで firewalld でパケットが drop されていることに気が付かずに惜しくも問題解決に至らなかった回答が数件見られました。

また、firewalld に気が付かなかったのか rsyslog 側の設定変更で終了条件を満たした回答も 1 件だけあり

興味深く採点させていただきました。
