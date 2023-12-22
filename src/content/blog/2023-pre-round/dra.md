---
title: "ICTSC2023 予選 問題解説: [DRA] 半径と直径"
description: "ICTSC2023 予選 問題解説: 半径と直径"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ictsc2023pr/dra"
draft: false
renderer: "md"
sticky: false
---

ICTSC2023 予選 問題解説: 半径と直径

# 問題文

半径と直径

## 概要

貴方は辺境令和ぽくぽく大学の大学院生です。大変かわいそうですがラボのボスから仕事を丸投げされました。

ボスは以下のように言って立ち去りました。

「新しく入る学生のためにSIerをしばいて、LANに入るための認証システムを納入してもらおうと思うんだ。ただ学科長に言われて技術仕様を自分達である程度決めないといけないんだよね...困ったなぁ...

調べたら802.1x認証で使われてるRADIUSっていうプロトコルには後継があるらしいんだよね。

モバイルでも使われてるらしいし、せっかくなのでそれを使って認証サーバーとシステムを作りたいと考えているのだけど、暇だったらそのPoCを行ってくれるかな？後最終的にはクラウドでも動かしたいなーとか色々考えてるんだよね。

あ、僕が途中までやった環境はあるからそれはあげるよ。クラウドでありがちな環境とか模してあるからそのまま使ってね。まぁ肝心のシステムは全然うまく動かないけど...僕は講義があるから行くね！じゃあよろ！」

ボスからもらった環境のトポロジー図は以下の通りです。

## ネットワーク図

![](/images/2023-pre-round/dra01.jpeg)

## 前提条件

- 特になし

## 制約

- Middleサーバーに入って書き換えることは禁止とする
- ネットワークトポロジーの変更などは禁止する

## 初期状態

client nodeから以下のものが通らない

- `wpa_supplicant -c /etc/wpa_supplicant.conf -D wired -i client-hostapd`
- `ping 192.168.100.102`

sshでclient サーバーに接続した後、client node への接続方法は以下のように行う
`ip netns exec client bash`

`ip netns` をすると `hostapd`, `app`, `client` の3つのノードがある。その中のnetnsのclientが `client node` に該当する。

通らないと記述してあるモノに関しては client サーバーにおいて systemdで管理されており、以下のコマンドで状態を見ることが可能である。このコマンドは client node で制御されているリソースである。

- `sudo systemctl status wpa_supplicant_ns.service`
- `sudo systemctl status hostapd_ns.service`

## 終了状態

client nodeから以下のものが通る

- `wpa_supplicant -c /etc/wpa_supplicant.conf -D wired -i client-hostapd` 
- `ping 192.168.100.102`

# 解説

この問題では 3 つの引っ掛かりポイントを用意しました。以下に解説を書きます。

- hostapd の node に 802.1X 認証を受けても受け取れない問題
- SCTP プロトコルが通らないミドルボックスの問題
- Diameter サーバー間のピア設定不備の問題

### hostapdのnodeに802.1X認証を受けても受け取れない問題

hostapd_cli に `-a `option と shellscript を渡すと, hostapd のイベントが起きるごとに shellscript の引数に `event status` と `mac addr` を渡してくれます。これを利用して 802.1X 認証に合わせたトラヒック制御を実現できます。

では実際にこの問題を発見するところまで一緒に見て行きましょう。一般に問題を探すときは `/var/log/` 配下を眺めたりしますが、`uname -a` をすると ubuntu だと言うことがわかるので、おそらく systemd を見てみるかと当たりがつくはずです。

まずは `systemctl status` をして眺めて見ると、`802-1x-tr-mgmt@hostapd-client.service` と描かれたあやしいモノが出てくるので定義ファイル眺めてみます。`/etc/systemd/system/802-1x-tr-mgmt@.service` にあるようです。

```shell=
[Unit]
Description=Example 802.1x traffic management for hostapd
After=netsetup.service
After=sys-devices-virtual-net-%i.device

[Service]
Type=simple
User=root
Group=root
CapabilityBoundingSet=CAP_NET_ADMIN
NetworkNamespacePath=/var/run/netns/hostapd
ExecStartPre=/usr/local/bin/802-1x-tr-mgmt-initer %i
ExecStart=/usr/sbin/hostapd_cli -i %i -a /usr/local/bin/802-1x-tr-mgmt

[Install]
WantedBy=multi-user.target
```

では実際にこれを実行してる　`ExecStart` にある `/usr/local/bin/802-1x-tr-mgmt` を見ると  nftables  を使ってることがわかります。これは `event status` に応じてどの `mac addr` を許可するかどうかをしてることがなんとなく分かります。ですがこれには基本的なパケットの処理をする定義設定がありません。

```shell=
#!/bin/bash

INTERFACE="$1"
EVENT="$2"
MAC="$3"

echo "First Argument: $INTERFACE"
echo "Second Argument: $EVENT"
echo "Third Argument: $MAC"

case ${EVENT:-NOTANEVENT} in
    AP-STA-CONNECTED | CTRL-EVENT-EAP-SUCCESS | CTRL-EVENT-EAP-SUCCESS2)
        nft add element netdev tr-mgmt-$INTERFACE allowed_macs { $MAC }
        echo "$INTERFACE: Allowed ingress traffic from $MAC"
        ;;

    AP-STA-DISCONNECTED | CTRL-EVENT-EAP-FAILURE)
        nft delete element netdev tr-mgmt-$INTERFACE allowed_macs { $MAC }
        echo "802-1x-tr-mgmt $INTERFACE: Denied ingress traffic from $MAC"
        ;;

    *)
        echo "802-1x-tr-mgmt $INTERFACE: Unknown event $EVENT for MAC $MAC"
        ;;
esac
```

では `ExecStartPre` にある `/usr/local/bin/802-1x-tr-mgmt-initer` を眺めてみると、そちらにはやはり nftables の定義がありました。

nftables の定義を見てみると一見良さそうに見えますが、802.1X 認証では EAPOL フレームと呼ばれるものでやり取りを最初に行うので、残念ながら client からの通信が失敗します。

具体的には EAPOL フレームは `01:80:c2:00:00:03` というマルチキャストアドレスを付けてクライアントが送ってくると言うのがスタートで、初めは認証されておらずパケットが落とされてしまうところが問題になります。

```shell=
table netdev tr-mgmt-$INTERFACE {
    set allowed_macs {
        type ether_addr
    }
    chain accesscontrol {
        ether saddr @allowed_macs counter accept
        ether daddr @allowed_macs counter accept
        counter drop
    }
    chain ingress {
        type filter hook ingress device $INTERFACE priority 0; policy drop;
        meta iifname $INTERFACE jump accesscontrol
    }
}
```

なのでこれをまずは通るようにするのが 1 つ目の想定回答でした。

```shell=
# netdev table and rules
table netdev tr-mgmt-$INTERFACE {
    set allowed_macs {
        type ether_addr
    }
    chain accesscontrol {
        ether type 0x888e counter accept
        ether saddr @allowed_macs counter accept
        ether daddr @allowed_macs counter accept
        counter drop
    }
    chain ingress {
        type filter hook ingress device $INTERFACE priority 0; policy drop;
        meta iifname $INTERFACE jump accesscontrol
    }
}
```

### SCTPプロトコルが通らないミドルボックスの問題

先ほどの問題を解いた結果 hostapd まで 802.1X 認証のリクエストが通るようになりました。その結果 RADIUS というプロトコルで Trans サーバーに対してリクエストが飛んできました。ですが Trans サーバーから先に行けてないようです。

まずは問題文の画像を見ると「TCP/UDP/ICMP が通る」との旨を書いていますね。

次に対象の認証サーバーまで届いているかを確認しましょう。diameter サーバーで tcpdump をすると diameter のパケットが着弾してないのわかります。では送り出してるパケットの L4 はどういうものかというと `SCTP` と呼ばれるプロトコルでした。

問題の制約上 middle サーバーへの変更は許容されていないので SCTP を通るようにするなどの変更は不可能です。ですが、もしも L4 が TCP か UDP に変えられたら解決しそうですよね？

ここで Diameter に関する RFC を眺めてみると SCTP と TCP が対応していると書いています。つまり TCP に書き換えることは可能ということがわかりました。では対象のソフトウェアである freediameter ではどのように行うのか調べましょう。 
<https://datatracker.ietf.org/doc/html/rfc6733>

```
Diameter Peer
  Two Diameter nodes sharing a direct TCP or SCTP transport
  connection are called Diameter peers.
```

実際に眺めると `No_SCTP`, `Prefer_TCP` という TCP を利用させ、SCTP を使わないというのが明示的にできることがわかりました。
<https://github.com/freeDiameter/freeDiameter/blob/dc2455bf2f7f051a0af838c4810369a0513110fd/doc/freediameter.conf.sample#L49>

設定を眺めるために `systemctl status`　をすると `freeDiameterd` といういかにもなソフトウェアが動いているのでそいつが読んでる設定ファイルに書き加えます。忘れずに対抗のノードにも書き加えましょう。その後 `systemctl restart freeDiameterd` をします。

答えとしては trans, diameter サーバーの freeDiameter のコンフィグに次の設定を入れることが想定されます。

```
No_SCTP;
Prefer_TCP;
```

### Diameterサーバー間のピア設定不備の問題

到達性はありますが残念ながらまだ繋がりません。trans, diameter サーバーに入って `systemctl status freeDiameterd`　をしてログを見ましょう。

各種サーバーではこのように出ていました。

```
# trans サーバー
freeDiameterd[1473]: 13:13:16  ERROR  example.com: Going to ZOMBIE state (no more activity) after abnormal shutdown

# diameter サーバー
freeDiameterd[1489]: 13:13:23  ERROR  translator.example.com: Going to ZOMBIE state (no more activity) after abnormal shutdown
```

コンフィグを眺めてみると、trans, diameter のサーバーコンフィグを見比べると trans サーバーの `ConnectPeer` が diameter サーバーの `Identity` とミスマッチしていることが確認できました。つまりこれでピアが失敗してるということがわかります。

```
# trans サーバー
Identity = "translator.example.com";
（中略）
ConnectPeer = "example.com"{No_TLS;};
```

```
# diameter サーバー
Identity = "diameter.example.com";
（中略）
ConnectPeer = "translator.example.com"{No_TLS;};
```

答えとしては trans サーバーの方を次のように変更することが想定されます。

```
ConnectPeer = "diameter.example.com"{No_TLS;};
```

最後に一通り対象のサーバープロセス(e.g. wpa_supplicant)をリスタートしたらきっと通ることでしょう。

### 後書き

余談です。読み飛ばして OK。

題名にもあるように「半径と直径」つまり「RADIUS と Diameter」というプロトコルを使った話でした。このプロトコル名聞いたことありましたか？初めましての人が多いかもしれないですね。そうだと思っていました。

（ちなみに余談ですが今回問題で使った freeDiameter はなんと国産のソフトウェアなんですね、ryu, gobgp, zebra などネットワークに関する重要なソフトは日本発が多くて嬉しいなと思いました。）

実はこの問題は高難易度問題を作って欲しいということで作りました。どっちかと言うとめんどくさい問になってしまいましたが...

最近の若者はなんでもわかってることが多いので多少ニッチだけど実用性のありそうな問題（と作者は思ってる）を考えるのが大変でした.
インフラと言うと「BGP」「SRv6」「k8s」みたいなちょっとかっこいい感じの技術をどうしても最初に思いつきがちですが、どれもできる人だとやってるようなイメージがあります。ですが情シス感あるユーザーのコントロールみたいなところはあまり勉強する機会がないかもなーと思ってこの題材を選びました。むしろどっちかと言うとネスペの勉強とか大学のラボで運用してた人の方が分かるかもしれませんね。

なお出題意図はざっくりこんな感じです。

- `hostapdのnodeに802.1X認証を受けても受け取れない問題` の出題意図は nftables あんまり触ったことない人がいそうと思って選びました。iptables は ip ですし、docker で触ったことあるとかありそうですが、L2 を制御するみたいなのは出来ないという点があります。
- `SCTPプロトコルが通らないミドルボックスの問題` の出題意図はよくあるクラウドのロードバランサーなどのミドルウェアではでは TCP/UDP しか対応していないと言うところに着目して用意してみた問題でした。身近なところだとモバイルの世界でも Diameter は使われていますが、これが原因の 1 つとなって LB を通すことができずオレオレ Diameter 終端装置を作って gRPC 詰め替えの刑に処して LB を実現しています
    - facebook の magma と呼ばれる OSS ではこの手法で頑張っていたりしています
- `Diameterサーバー間のピア設定不備の問題` の出題意図は Diameter 本体の挙動をせっかくなので理解してもらおうと言うことで行いました。

たまには、このように足がついた(?)お家でもやりやすい問題も勉強になって良いのかなーと思っています。無事みなさん解けましたでしょうか。学びになったら嬉しいです。

## 採点基準

基本的には各項目で完全に回答できている場合に点数をあげます。

- hostapd の node に 802.1X 認証を受けても受け取れない 40%
    - `EAPOL` が落とされていることを言及して 20%(部分点)
- SCTP プロトコルが通らないミドルボックスの問題　30%
    - `SCTP` が落とされていることを言及して 15%(部分点)
- Diameter サーバー間のピア設定不備の問題 30%