---
code: sif
title: "ログが転送できない！"
point: 50
solvedCriterion: 50
type: normal
connectInfo:
  - hostname: server01
    command: ssh user@192.168.255.11 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh
  - hostname: server02
    command: ssh user@192.168.255.12 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh
---

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
