---
title: "ICTSC2025 二次予選 問題解説: 新オフィスを救え！！"
description: "ICTSC2025 二次予選 問題解説: 新オフィスを救え！！"
tags: ["ICTSC2025", "問題解説"]
pubDate: 2025-12-25T12:00:00.000Z
slug: "2025/12/25/ictsc2025pr2/rvt"
draft: false
renderer: "md"
sticky: false
---

### 問題
#### 概要

あなたは、とある通信サービスを提供する会社のネットワークエンジニアです。

今年、会社は諸事情により新しいオフィスへ移転することになりました。 
そのため、本日は新オフィスのバックボーン周りの作業を行っています。

あなたが、担当する作業は問題なく完了したのですが、  
新オフィスを担当しているチームから旧オフィスとDC＆インターネットへの疎通性が取れないとエスカレーションを受けました。

明日には、疎通性があることを前提とした作業が実施されるため、対応をお願いします。

#### 前提条件

- 操作可能な機器はR3のみ
- R1、R2の設定変更は不可
- 下記の手段での経路の追加を禁止
  - static route
  - OSPF以外のダイナミックルーティングプロトコル
  - interfaceの追加
- 下記の設定の追加を禁止
  - OSPFでの広報プレフィックスの追加
#### ネットワーク図

![rvt.png](/images/2025-pre-round-2nd/rvt.png)

IPsec over IPv6間は専用機器を設置  

#### 初期状態

`ping 192.168.40.2 count 3`と`ping 192.168.40.252 count 3`両方にpingが通らない


`traceroute 192.168.40.252`で失敗する
```
R3:~$ traceroute 192.168.40.252
traceroute to 192.168.40.252 (192.168.40.252), 30 hops max, 60 byte packets
connect: Network is unreachable
```
#### 終了状態

`ping 192.168.40.2 count 3`と`ping 192.168.40.252 count 3`両方にpingが通る


`traceroute 192.168.40.252`の結果が下記の通りになる
```
R3:~$ traceroute 192.168.40.252
traceroute to 192.168.40.252 (192.168.40.252), 30 hops max, 60 byte packets
 1  192.168.40.252 (192.168.40.252)  0.500 ms  0.473 ms  0.459 ms
```
#### 解答
解答には、追加で入れたコンフィグと下記の結果を乗せること
- traceroute 192.168.40.252
- show ip ospf neighbor
- show ip route

#### 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
|  R3 | 192.168.255.41 | user | ictsc2025 |

#### note
```
パスワードは2つある。
パスワード1:g9WMnex4と、パスワード2:sS6uZbikです。
どちらも必要なんです。
Aだけじゃダメ。Bだけでもダメ。
2つ揃って初めて動くんです。
```
```
おぼろげながら浮かんできたんです　hello:60,dead:90という数字が
```

---

### 解説
#### 解答解説 & 想定解答
本問題には、
1. md5認証の設定が漏れている
2. R3-R1間の{hello/dead}インターバルが間違っている
3. R3-R2間のMTU値が不一致となっている

３つの問題がありました。
1. md5認証の設定が漏れている

    このOSPFには、``Area, Authentication Type: MD5 (2)``(パケットキャプチャより)とmd5による認証がかかっていました。

    そのため、各IFにmd5の設定を行う必要があります。

    md5 keyは、noteのパスワードは2つある。～に書いてあった、パスワード1/パスワード2を利用します。

    想定している解答手順は、下記の 2. {hello/dead}インターバルが間違っているや 3. R3-R2間のMTU値が不一致となっているを解いた後に、本問題に着手すると思っています。


    - 想定解答
        ```
        set protocols ospf area 0 authentication 'md5'
        set protocols ospf interface eth1 authentication md5 key-id 1 md5-key 'g9WMnex4'
        set protocols ospf interface eth2 authentication md5 key-id 1 md5-key 'sS6uZbik'
        ```

2. R3-R1間の{hello/dead}インターバルが間違っている

    OSPFのネゴシエート中に、HelloインターバルとDeadインターバルを確認します。

    そのため、デフォルトの値(hello:10/Dead:40)から変更する場合は、明示的に値を入力する必要があります。

    想定では、tcpdumpでのパケットキャプチャによるHelloパケットから、noteのおぼろげながら～から変更後の値を取得するのいずれかで解答ができると思っていました。

    - 想定解答
        ```
        set protocols ospf interface eth1 dead-interval '90'
        set protocols ospf interface eth1 hello-interval '60'
        ```
3. R3-R2間のMTU値が不一致となっている

    OSPFでは、上記の{hello/dead}インターバルと合わせて、IFのMTU値も一致させる必要があります。

    今回のように、中間にMTU:1500から減る要因がある場合は、MTU値を変更する必要があります。

    今回の問題は、問題文には変更後のMTU値については載せませんでした。

    では、どこでMTU値を確認すれば？？と思われるかと思いますが、今回の問題では、tcpdumpでのパケットキャプチャにてMTU値を確認するを想定していました。

    ※ 別の方法としてsyslogによるMTU値不一致と正解の値を取得するを考えていましたが、MTU値が小さい方でしかsyslogが吐かれないという仕様を忘れておりました。 ごめんなさい...

    - 想定解答
        ```
        set interfaces ethernet eth1 mtu '1410'
        ```

#### その他
