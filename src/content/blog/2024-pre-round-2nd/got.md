---
title: "ICTSC2024 二次予選 問題解説: [GOT] 何もかもが繋がらない"
description: "ICTSC2024 二次予選 問題解説: 何もかもが繋がらない"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/got"
draft: false
renderer: "md"
sticky: false
---

# 問題文

新卒で就職したあなたは、データセンターNWの構築するチームに配属されました。既存SWのEoSLに伴い、チームは新しいNWとしてVXLAN/EVPNを用いたL2透過なNWを構築して、クライアント - サーバ間のHTTP通信を通そうと日々励んでいました。しかし、同僚が全員突然退職してしまいました。残された環境を見ると、クライアント・サーバ間の通信がまだ上手くできていなさそうです。全ての問題を特定し、解決に導いて、会社のヒーローになりましょう。

## 前提条件

* アンダーレイのルーティングプロトコルはeBGPを使うこと
* オーバレイのEVPNはLoopbackアドレス同士でネイバーを貼ること
* Static Route含めその他のルーティングプロトコルは使用しないこと
* IPアドレス・AS番号などの設定は構成図に従い、変更しないこと
* RTのbridge/ethernetインタフェースの設定は変更しないこと
* 終了状態②においては、クライアントはsv-1の /home/user/client.pyが、サーバはsv-2で稼働するapacheがそれぞれの役割を担う
* sv-2の/etc/apache2配下のファイルの中身は変更しないこと
* sv-1の/home/user/client.pyはtry句の中身のみを変更すること
* 環境の制約を回避するためにサーバが互いのMACアドレスを静的に学習する設定を入れているので変更しないこと

## 構成図

![](/images/2024-pre-round-2nd/got-1.png)

## 初期状態

* sv-1とsv-2でNWの疎通性が無い = pingが通らない
* sv-1とsv-2がそれぞれクライアント・サーバとして機能すべきだが、HTTP通信が通らない

![](/images/2024-pre-round-2nd/got-2.png)

## 終了状態

* ①sv-1とsv-2でpingを用いた同セグ通信が通る
* ②sv-1のclient.pyを用いてsv-2のapacheからの"Hello ICTSC!!!"というHTTPレスポンスがターミナル上に出力される

![](/images/2024-pre-round-2nd/got-3.png)


## 回答にあたって意識してほしいこと

* 問題を起こしている原因に対する解決策を提示するだけではなく、「そもそもの構成がどういうものか」「問題となっている設定が何をするための設定なのか」「どうして現状の設定だと問題を引き起こすのか」「提示した解決策が問題をどう解決しているのか」など全体像を含めて記述していただきたいです
* 冗長にする必要は無いですが、「こんなところも理解しているよ」というのを回答に盛り込んでいただけると、高得点に繋がります

# 解説

## 回答例

このNWが繋がらない事象は5つの問題によって引き起こされております。

1つ目は、eBGPネイバーを張れていない点です。\
`show ip bgp neighbors`の結果から、eBGPのネイバー確立が失敗していることが分かります。eBGP以外のルーティングプロトコルが使えないという前提条件から、前任者がやろうとしていたLoopbackアドレスをeBGPネイバーとして指定する方法は使わずに、直接接続されているIPアドレス同士でeBGPネイバーを張ることでアンダーレイのネイバーを確立します。また、この設定は、VXLANによってカプセル化されたパケットを転送するためのルーティング設定となります。\
以下が修正内容です。
```bash
rt-1
(誤)
set protocols bgp neighbor 2.2.2.2 address-family ipv4-unicast
(正)
set protocols bgp neighbor 192.168.20.34 address-family ipv4-unicast
set protocols bgp neighbor 192.168.20.34 remote-as '65102'

rt-2
(誤)
set protocols bgp neighbor 1.1.1.1 address-family ipv4-unicast
set protocols bgp neighbor 3.3.3.3 address-family ipv4-unicast

(正)
set protocols bgp neighbor 192.168.20.33 address-family ipv4-unicast
set protocols bgp neighbor 192.168.20.33 remote-as '65101'
set protocols bgp neighbor 192.168.20.66 address-family ipv4-unicast
set protocols bgp neighbor 192.168.20.66 remote-as '65103'

rt-3
(誤)
set protocols bgp neighbor 2.2.2.2 address-family ipv4-unicast
(正)
set protocols bgp neighbor 192.168.20.65 address-family ipv4-unicast
set protocols bgp neighbor 192.168.20.65 remote-as '65102'

```

2つ目は、EVPNのネイバーを貼れていない点です。\
前提条件を見るとLoopbackアドレスを使ってEVPNのネイバーを貼ることが要求されています。1つ目の問題点を解消した結果、eBGPによって、直接接続されているNWのうちLoopbackアドレスのNWが広報されており、各ルータのLoopbackアドレスに到達性を確保できている状態ではあります。ですが、パケットキャプチャをしてみるとEVPNのネイバーを貼るBGPメッセージの送信元IPが物理インタフェースのIPで送信されていることが分かります。従って、EVPNのネイバーを貼るBGPメッセージをLoopbackアドレスによって送付するためのコンフィグを設定する必要があります。\
以下が修正内容です。
```bash
rt-1
(誤)
empty
(正)
set protocols bgp neighbor 2.2.2.2 update-source 'lo'

rt-2
(誤)
empty
(正)
set protocols bgp neighbor 1.1.1.1 update-source 'lo'
set protocols bgp neighbor 3.3.3.3 update-source 'lo'

rt-3
(誤)
empty
(正)
set protocols bgp neighbor 2.2.2.2 update-source 'lo'
```

3つ目は、SV-RT間のタグ有無が異なっている点です。\
rt-1とsv-1が接続されているインタフェースを確認すると、rt-1側はタグ無しのポート、sv-1側はタグ有りのポートとして設定されていることが分かります。ルータのbridge/ethernetインタフェースの設定変更してはいけないという前提条件から、sv-1側をタグ無しのポートに変更することで問題を解消する必要があります。\
以下が修正内容です（sv-1の`/etc/netplan/02-ictsc.yaml`
）。修正をしたのち、`sudo netplan apply` によって変更を反映します。
```bash
(誤)
network:
    version: 2
    ethernets:
        eth1:
            macaddress: 00:00:5e:00:01:01
            dhcp4: false
    vlans:
        vlan.100:
            id: 100
            link: eth1
            addresses: [192.168.20.1/27]
            optional: false

(正)
network:
    version: 2
    ethernets:
        eth1:
            macaddress: 00:00:5e:00:01:01
            addresses: [192.168.20.1/27]
            dhcp4: false
```

ここまでの3点を解消すると、VXLAN/EVPNを通した同セグ通信がSV間で可能になり、終了状態①を満たします。終了条件②を満たすために、HTTP通信の成功を阻んでいる残り2つの問題点を解消します。

4つ目は、GETリクエストのフォーマットが正しくない点です。\
クライアント通信に使われる`/home/user/client.py`の中身とsv-2の`/etc/apache2`配下の設定ファイルを確認すると、実現しようとしているHTTP通信は、Authorizationヘッダを用いて81番ポート向けに行われていることが分かります。さらに、`/home/user/client.py`を実行した結果を確認すると、Bad RequestでありHTTPリクエストのフォーマットが正しくないという状態です。そこで`/home/user/client.py`のGETリクエストの中身を見てみると、HTTP1.1が使われているにもかかわらず、Hostヘッダが存在していないことが分かります。HTTP1.1においてはHostヘッダは必須であり、Hostヘッダが存在していないことで、HTTPリクエストとして成立していないことが分かります。対処方法としては、Hostヘッダを追加するか、Hostヘッダが無くてもAuthorizationヘッダを使うことが出来るHTTP1.0を使う、等の方法が考えられます。\
以下は修正内容の一例です（`/home/user/client.py`）。

```bash
(誤)
http_request = (
    f"GET {request_path} HTTP/1.1\r\n"
    f"Authorization: Basic {auth_base64}\r\n"
    f"\r\n"
)

(正)
http_request = (
    f"GET {request_path} HTTP/1.0\r\n"
    f"Authorization: Basic {auth_base64}\r\n"
    f"\r\n"
)
```

5つ目は、レスポンス表示のバッファサイズが小さい点です。\
4つ目の問題点を解消したことで、HTTP通信自体が成立する状態になりました。しかし、レスポンスが上手く表示されていないのは、`/home/user/client.py`のレスポンス表示のバッファサイズが小さいことが原因です。\
以下は修正内容の一例です（`/home/user/client.py`）。

```bash
(誤)
response = s.recv(16)

(正)
response = s.recv(4096)
```

以上で、全ての問題が解消され、終了状態②を満たします。

## 作問者コメント
本問題はVXLAN/EVPNを題材としつつ、NWの基本的な理解度を試す問題となっております。一見とっつきにくい題材ですが、アンダーレイやオーバーレイといった概念に慣れている人や、BGPに対して抵抗が無い人には、比較的スムーズに解ける問題になっていました。\
VXLAN/EVPNの技術自体は目新しいものではありませんが、複数の技術要素が組み合わさっていることや、使い方によってその言葉が示す中身が大きく異なるため、作問者は理解するのにかなり時間がかかりました。\
初学者の方は、L2の基礎 -> BGP -> アンダーレイ・オーバーレイの概念 -> VXLAN単体 -> EVPNという順番で学習することをお勧めします。\
下記に記した回答例以外にも、BGP Unnumberedを使ってIPv6のリンクローカルアドレスを使用してアンダーレイのBGPを張るという解法や、既存コンフィグのRoute Mapのポリシーを削除して直接接続されたすべてのNWに関する経路を広報しアンダーレイのBGPもLoopbackアドレスで張れるようにする、といった解法も見られました。私にとっても「その手があったか！」という発見であり、とても勉強になりました。\
本問で網羅されていない範囲の概念もまだまだありますが、この問題が皆様の勉強のきっかけや理解の促進に繋がれば幸いです！
