---
title: "ICTSC2023 予選 問題解説: [ULG] なんか通信できない(´・ω・｀)"
description: "ICTSC2023 予選 問題解説: なんか通信できない(´・ω・｀)"
tags: [ICTSC2023,ネットワーク関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ictsc2023pr/ulg"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

とある企業ではネットワーク機能を含めlinuxで構築しており、あなたは`department-A`、及び`router`の管理者である。
ある日、電源トラブルによってサーバ群の再起動が発生したところ、`department-A`から`department-B`に対して通信ができなくなってしまった。  
過去の`router`管理者に確認すると、`department-A`から`department-B`の通信は「IPアドレスを変換」して通信を行っていたようだ。  
あなたには`department-A`から`department-B`へ通信を出来るようにしてほしい。  
また、今後このようなことが起きないように再起動しても通信できるとありがたい。

## ネットワーク図

![](../../../../public/images/2023-pre-round/ulg01.jpeg)

## 前提条件

* 特になし

## 制約

* `department-A`、及び`router`にログイン可能
* `department-B`にログイン不可
* ネットワークを制御するプロトコルの一部または全ての機能に関する無効化の禁止

## 初期状態

* `department-A`と`router`間のpingによる通信が可能
  * 表示例 ※`X.XXX`、及び`XXXX` の`X`には0~9の数字

    ```
    [user@department-A ~]$ ping 192.168.50.2 -I 192.168.50.1 -c 5
    PING 192.168.50.2 (192.168.50.2) from 192.168.50.1 : 56(84) bytes of data.
    64 bytes from 192.168.50.2: icmp_seq=1 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.2: icmp_seq=2 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.2: icmp_seq=3 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.2: icmp_seq=4 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.2: icmp_seq=5 ttl=64 time=X.XXX ms

    --- 192.168.50.2 ping statistics ---
    5 packets transmitted, 5 received, 0% packet loss, time XXXXms
    rtt min/avg/max/mdev = X.XXX/X.XXX/X.XXX/X.XXX ms
    ```

* routerとdepartment-B間のpingによる通信が可能
  * 表示例 ※`X.XXX`、及び`XXXX` の`X`には0~9の数字

    ```
    [user@router ~]$ ping 192.168.50.5 -I 192.168.50.6 -c 5
    PING 192.168.50.5 (192.168.50.5) from 192.168.50.6 : 56(84) bytes of data.
    64 bytes from 192.168.50.5: icmp_seq=1 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=2 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=3 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=4 ttl=64 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=5 ttl=64 time=X.XXX ms

    --- 192.168.50.5 ping statistics ---
    5 packets transmitted, 5 received, 0% packet loss, time XXXXms
    rtt min/avg/max/mdev = X.XXX/X.XXX/X.XXX/X.XXX ms
    ```

## 終了状態

  `department-A`から`department-B`へping通信が可能

* 表示例 ※`X.XXX`、及び`XXXX` の`X`には0~9の数字

    ```
    [user@department-A ~]$ ping 192.168.50.5 -I 192.168.50.1 -c 5
    PING 192.168.50.5 (192.168.50.5) from 192.168.50.1 : 56(84) bytes of data.
    64 bytes from 192.168.50.5: icmp_seq=1 ttl=63 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=2 ttl=63 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=3 ttl=63 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=4 ttl=63 time=X.XXX ms
    64 bytes from 192.168.50.5: icmp_seq=5 ttl=63 time=X.XXX ms

    --- 192.168.50.5 ping statistics ---
    5 packets transmitted, 5 received, 0% packet loss, time XXXXms
    rtt min/avg/max/mdev = X.XXX/X.XXX/X.XXX/X.XXX ms
    ```

# 解説

NAPT routerの役割をしていたrouter（linux）が再起動して、NAPTの設定をしていたfirewalldが吹き飛んで疎通不可になったトラブル

## 採点基準

* ping送信用のdepartment-Aから宛先のdepartment-Bにpingが飛ぶようになれば60%（基準点）
* 再起動後にも設定が保持できており、 department-A から department-B へping通信可能なら100%
  * 想定: firewall-cmdの--permanent など

なお、iptablesなどfirewalld以外の回答も許容し、pingによる結果のみで採点する。
