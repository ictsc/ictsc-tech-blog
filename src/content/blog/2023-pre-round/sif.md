---
title: "ICTSC2023 予選 問題解説: SIF"
description: "ICTSC2023 本戦 問題解説: ログが転送できない！"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ICTSC2023 予選 問題解説: ログが転送できない！"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

あなたはとある会社で勤務している社会人です。あなたのチームではサーバの監視システムを構築していますが、上司から「ログが転送できないから、転送できるように設定を修正してくれないか？」と相談されました。この問題を解決してあげてください。

### ログ収集システム構成

今回あなたのチームでは、Grafana, Loki, promtailを用いてログ収集基盤を構築しようとしています。

以下は、上司がくれた今回のログ収集システムの概要図です。

![overview](https://i.imgur.com/2CBU5aU.png)

**Grafana**

- Lokiに収集されたログを可視化するためのダッシュボード

**Loki**

- ログを回収し保管するためのソフトウェア
- 設定ファイル
  - /etc/loki/config.yml：Loki本体の設定

**promtail**

- syslogコレクタとして動作し、転送されたログをLokiにHTTP API経由で再転送するソフトウェア
- 設定ファイル
  - /etc/promtail/config.yml：promtailの設定

**rsyslog**

- サーバのログをsyslogで転送するためのソフトウェア
- 設定ファイル
  - /etc/rsyslog.conf：rsyslogの基本設定
  - /etc/rsyslog.d/80-ictsc.conf：今回の問題用の転送設定

## 前提条件

- Grafanaはログが回収されたかを確認するために構築されたもののため、設定変更は不要です
- server2で動作するrsyslogの設定は変更してはいけません
  - 設定確認等の目的でserver2にログインするのは問題ありません

## 初期状態

- Grafanaのダッシュボードにアクセスしてもログが表示されない
  - <http://192.168.255.11:8000/d/c1019c68-6e45-465d-b295-1e93e3f67f45/sif-dashboard?orgId=1>
- Lokiに収集されたログ件数を確認しても件数が0と表示される
  - 踏み台サーバーにはjqがインストールされていないため、インストールする必要があります

```bash
user@team100-bastion:~$ curl -s 192.168.255.11:30001/loki/api/v1/query_range --data-urlencode 'query={hostname=~"server01"}' | jq .data.stats.summary.totalEntriesReturned
0
user@team100-bastion:~$ curl -s 192.168.255.11:30001/loki/api/v1/query_range --data-urlencode 'query={hostname=~"server02"}' | jq .data.stats.summary.totalEntriesReturned
0
```

## 終了状態

server1についてのみ達成した場合、部分点となります。

- Grafanaのダッシュボードにアクセスするとログが表示される
  - <http://192.168.255.11:8000/d/c1019c68-6e45-465d-b295-1e93e3f67f45/sif-dashboard?orgId=1>
- Lokiに収集されたログ件数を確認すると件数が0でない数値が表示される

```bash
user@team100-bastion:~$ curl -s 192.168.255.11:30001/loki/api/v1/query_range --data-urlencode 'query={hostname=~"server01"}' | jq .data.stats.summary.totalEntriesReturned
100
user@team100-bastion:~$ curl -s 192.168.255.11:30001/loki/api/v1/query_range --data-urlencode 'query={hostname=~"server02"}' | jq .data.stats.summary.totalEntriesReturned
100
```

# 解説

この問題では、syslogのフォーマットの違いが原因で生じる問題を取り上げています。

- server1: 新しいsyslogフォーマットのみを受け取ることができるシステム
- server2: 古いsyslogフォーマットのみを転送することができるシステム

## syslogの歴史

この問題を解説する前に、まずsyslogの歴史について簡単に説明します。

syslogは、最初はsendmailのログ記録フォーマットとして開発されました。しかし、時間が経つにつれて、様々なシステムにsyslogフォーマットが移植され、ルータやサーバのログの記録や、ログを転送する際のフォーマットとして使われるようになりました。当初、syslogプロトコルは標準化されていなかったため、実装によって差異があったそうです。

そのため、IETFでは、syslogフォーマットを標準化するための取り組みが始まりました。最初に、当時多くの機器に移植されていたBSD syslogプロトコルの実装をまとめたRFC 3164[^1]がInformational RFCとして発行されました。

その後、RFC 3164や他の実装を参考にしながら、より包括的なsyslogプロトコルの標準化を目指してRFC 5424[^2]が発行されました。RFC 5424が発行されたことで、RFC 3164はObsoleteとされ、推奨されなくなりました。

RFC 5424が発行されてから10年以上が経過しましたが、現実の世界ではRFC 5424だけが使われているわけでありません。後方互換性を保つために、古いフォーマットがデフォルトで使用されていたり、古いフォーマットのみに対応していたりするシステムも存在します。また、新しい実装では、RFC 5424だけをサポートするものもあります。

## 問題解説

今回の問題で使用しているpromtailのsyslog collector機能は、RFC 5424だけをサポートしています[^3]。そのため、適切に設定して、rsyslogから転送されるsyslogパケットをLokiに転送してあげれば問題を解くことができます。

## 部分点解法（30%）

server1については自由に設定することができます。そのため、rsyslogで転送する時のsyslogフォーマットをRFC 5424で定義されたフォーマットにすることで問題を解くことができます。

rsyslogでは、ログを出力するフォーマットを次のように指定することができます。 `RSYSLOG_SyslogProtocol23Format` は、RFC 5424の最終ドラフトで定義されたフォーマットを使用するという意味です。

**/etc/rsyslog.d/80-ictsc.conf**

```diff
#
 # Forward log to remote server
 #
-*.* @192.168.255.11:5514
+*.* @192.168.255.11:5514;RSYSLOG_SyslogProtocol23Format
```

この変更を加えた後に、`sudo systemctl restart rsyslog` をすることで部分点を得ることができます。

## 満点解法

部分点解法ではserver1のみを考慮して設定していますが、満点解法ではserver2から送信されたsyslogも収集する必要があります。先述の通り、promtailはRFC 5424のみをサポートしているため、promtailとrsyslogの間でsyslogフォーマットを変換してから転送してあげる必要があります。ここでは、server1にインストールされているrsyslogを利用して、syslogフォーマット変換 + syslogの再転送を実現するような設定を紹介します。

まずはじめに、promtailが使用するポートを5514/udpから55514/udpに変更します。これによって、rsyslog側で5514/udpを使用することができるようになります。

**/etc/promtail/config.yaml**

```diff
 scrape_configs:
 - job_name: server
   syslog:
-    listen_address: 192.168.255.11:5514
+    listen_address: 192.168.255.11:55514
     listen_protocol: udp
```

設定が完了したら、`sudo systemctl restart promtail` を実行し、promtailを再起動します。

次に、rsyslogでsyslogを転送できるようにするために、転送用の設定を行います。設定変更後、`sudo systemctl restart rsyslog` を実行してrsyslogを再起動することで、server1, server2の両方からログを受け取ることができるようになります。

**/etc/rsyslog.conf**

```diff
+module(load="imudp")
+module(load="omfwd")
+input(type="imudp" port="5514" ruleset="servers")
+ruleset(name="servers") {
+  action(type="omfwd" target="192.168.255.11" port="55514" protocol="udp" template="RSYSLOG_SyslogProtocol23Format")
+}
```

最終的なログ収集システムの構成は次のようになります。この構成はpromtailのドキュメント内でも推奨構成とされている構成になります[^3]。

![ICTSC2023 - SIF-解説.webp](/attachment/652a4b69a6fb4a05bfe4edb9)

[^1]: RFC 3164: <https://datatracker.ietf.org/doc/html/rfc3164>
[^2]: RFC 5424: <https://datatracker.ietf.org/doc/html/rfc5424>
[^3]: Promtail configuration: <https://grafana.com/docs/loki/latest/send-data/promtail/configuration/#syslog>

## 採点基準

- 30%：server1のログを収集でき、Grafana等から確認できる
- 70%：server2のログを収集でき、Grafana等から確認できる
