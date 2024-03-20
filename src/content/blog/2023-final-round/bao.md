---
title: "ICTSC2023 本戦 問題解説: [BAO] あなたは誰？"
description: "ICTSC2023 本戦 問題解説: あなたは誰？"
tags: [ICTSC2023,問題解説,ネットワーク関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/bao"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

あなたは、A大学の学部生です。  
所属しているゼミの教授からコンピュータのホスト名を使用してリモート接続などができるようにネットワークとPCをセットアップしてくれと頼まれました。  
下のネットワーク図のようにIPアドレスの設定は済ませているらしいです。  
とりあえず、StuPCで`ping ProfPC.local`が成功できるようにしてください。

## 前提条件

- StuPC, Router で適切な設定を行うことで本トラブルは解決する
- ProfPCは正しく設定されている

## 制約

- /etc/hosts ファイルを編集してはいけない
- DNSサーバーを構築してはいけない
- ファイアウォールの無効化・既存のルールの削除を行ってはいけない
    - ルールの追加は可能とする
- ソフトウェアを追加でインストールしてはいけない
- 以下の情報は既存の設定に従う
    - 各端末のIPアドレス
- ProfPCの第4オクテッドのIPアドレスは変化する可能性があり、変化した場合でも名前解決ができる設定を行う必要がある
- StuPC, Routerを再起動しても、終了状態が維持される

## 初期状態

- StuPCから`ping ProfPC.local`が失敗する

## 終了状態

- StuPCから`ping ProfPC.local`が成功する

## ネットワーク図

![](/images/2023-final-round/bao01.png)

---

## 解説

この問題は、[RFC 6762（3章）](https://datatracker.ietf.org/doc/html/rfc6762#section-3)で定義されているマルチキャストDNS名前解決プロトコルを利用して解決できる、ローカルリンク上のホスト名である`.local`を使用します。  
そのため、文章中には記載はありませんがｍDNSに関するトラブルを解決する必要がありました。

### 原因

この問題は、主に以下4点の原因によりトラブルが発生しています。

- `Router`でmDNSのマルチキャストパケットを転送する設定がされていない
- `StuPC`でufwによりｍDNSのパケットをドロップしてしまっている
- `StuPC`で名前解決を行う処理過程が誤った設定になっている
- `StuPC`でｍDNSのリゾルバ・レスポンダの設定不足

これらの原因は以下に記すコマンド結果により確認することができます。

#### `Router`でmDNSのマルチキャストパケットを転送する設定がされていない

mDNSは予約済みアドレス`224.0.0.251`もしくは`ff02::fb`のUDPポート5353を使用し、サブネット内にマルチキャストパケットを送受信します。  
したがって、別サブネットに存在する`StuPC`と`ProfPC`にｍDNSパケットを届けるには[mDNS Repeater](https://docs.vyos.io/ja/latest/configuration/service/mdns.html)の設定をする必要があります。

#### `StuPC`でufwによりｍDNSのパケットをドロップしてしまっている

初期状態では、`deny (outgoing)`と確認することができ、mDNSの送信パケットをドロップしている状態にある。

```bash
user@StuPC:~$ sudo ufw status verbose
Status: active
Logging: on (low)
Default: deny (incoming), deny (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
22/tcp (v6)                ALLOW IN    Anywhere (v6)
```

#### `StuPC`で名前解決を行う処理過程が誤った設定になっている

`StuPC`には`avahi-daemon`などが代表される`nss-mdns`パッケージがインストールされていません。  
デフォルトでは、検索したデータベースから応答が返ってこなかった場合`continue`として次の検索処理を呼び出します。  
ただし、本問題環境では`UNAVAIL=return`とアクションが指定されており、`mdns4_minimal`からの応答がないため`systemd-resolved`に検索が移行されません。

```
user@StuPC:~$ cat /etc/nsswitch.conf
...
hosts:          files mdns4_minimal [UNAVAIL=return] dns
...
```

#### `StuPC`でｍDNSのリゾルバ・レスポンダの設定不足

「StuPCから`ping ProfPC.local`が成功する」を終了状態としているため、最低限`StuPC`をリゾルバとして機能させるため、グローバルオプションと各インタフェースでmDNSのモードを有効にする必要があります。  
以下のコマンドにより、初期状態を確認することができます。

```bash
user@StuPC:~$ sudo resolvectl status
Global
       Protocols: -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
resolv.conf mode: stub

Link 2 (eth0)
    Current Scopes: DNS
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8
        DNS Domain: local

Link 3 (eth1)
    Current Scopes: DNS mDNS/IPv4 mDNS/IPv6
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8
        DNS Domain: local
```

### 解決方法

#### Router

以下のコマンドを実行し、mDNSパケットを`StuPC`と`ProfPC`のサブネットにお互い転送できるよう設定し、永続化のための保存を行います。

```
configure
set service mdns repeater interface eth1
set service mdns repeater interface eth2
commit
save
```

#### StuPC

##### スタティックルートを適用

`StuPC`には、`10.10.2.0/24`のネットワークの経路情報が存在しません。  
そのため、netplanにより設定を行い永続化を行います。

```bash
sudo vim /etc/netplan/99-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth1:
      routes:
      - to: 10.10.2.0/24
        via: 10.10.1.254
```

以下のコマンドにより適用することで`ping 10.10.2.1`が成功します。

```bash
sudo netplan apply
```

##### ufwでmDNSの5353/udpを許可

制約の通り、mDNSが使用する5353のoutgoingを許可する設定を追加します。

```bash
sudo ufw allow out on eth1 proto udp to any port 5353
```

また、ufwの設定を行った全チームは以下のコマンドを実行していました。

```bash
sudo ufw allow out mdns
```

これにより、以下の結果を確認することができます。

```bash
user@StuPC:~$ sudo ufw status
Status: active

To                         Action      From
--                         ------      ----
22                         ALLOW       Anywhere                  
22 (v6)                    ALLOW       Anywhere (v6)             

5353/udp                   ALLOW OUT   Anywhere                  
5353/udp (v6)              ALLOW OUT   Anywhere (v6)
```

##### nsswitch.confの修正

以下のdiffの通り`mdns4_minimal`の項目を削除します。

```bash
sudo vim /etc/nsswitch.conf
```

```diff
- hosts:          files mdns4_minimal [UNAVAIL=return] dns
+ hosts:          files dns
```

##### systemd-resolvedでグローバルのmdnsを有効化

以下のdiffの通り`MulticastDNS=yes`に変更します。

```
sudo vim /etc/systemd/resolved.conf
```

```diff
[Resolve]
...
- #MulticastDNS=no
+ MulticastDNS=yes
...
```

設定ファイルの再読み込みを行い、Unitを再起動します。

```bash
sudo systemctl restart systemd-resolved.service
```

これにより、グローバルのmDNSが有効になりました。

```bash
user@StuPC:~$ sudo resolvectl status
Global
       Protocols: -LLMNR +mDNS -DNSOverTLS DNSSEC=no/unsupported
resolv.conf mode: stub

Link 2 (eth0)
    Current Scopes: DNS
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8
        DNS Domain: local

Link 3 (eth1)
    Current Scopes: DNS mDNS/IPv4 mDNS/IPv6
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8
        DNS Domain: local
```

##### インタフェースのmDNSを有効化

netplanはmDNSの設定を[サポートしていません](https://bugs.launchpad.net/ubuntu/+source/netplan.io/+bug/2003026)。  
そのため、生成されるsystemd-networkの設定を上書きする必要があります。  
直接netplanの生成する`/run/systemd/network/10-netplan-eth1.network`を更新しても上書きされるため、overrideファイルを用います。  

```bash
sudo mkdir /etc/systemd/network/10-netplan-eth1.network.d/
sudo vim /etc/systemd/network/10-netplan-eth1.network.d/override.conf
```

以下の項目を追加します。

```
[Network]
MulticastDNS=yes
```

設定ファイルの再読み込みを行い、Unitを再起動します。

```bash
sudo systemctl restart systemd-networkd
```

これにより、インタフェースのmDNSが有効になりました。

```bash
user@StuPC:~$ sudo resolvectl status
Global
       Protocols: -LLMNR +mDNS -DNSOverTLS DNSSEC=no/unsupported
resolv.conf mode: stub

Link 2 (eth0)
    Current Scopes: DNS
         Protocols: +DefaultRoute +LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8
        DNS Domain: local

Link 3 (eth1)
    Current Scopes: DNS mDNS/IPv4 mDNS/IPv6
         Protocols: +DefaultRoute +LLMNR +mDNS -DNSOverTLS DNSSEC=no/unsupported
Current DNS Server: 8.8.8.8
       DNS Servers: 8.8.8.8
        DNS Domain: local
```

###### 別解

以下のコマンドにより、インタフェースごとのmDNSを有効にすることができます。  
ただし、設定の永続化はされないため永続化の処理を別途行う必要があります。

```bash
sudo resolvectl mdns eth1 yes
```

### 結果

以下のようにpingが成功していることが分かります。

```bash
user@StuPC:~$ ping ProfPC.local
PING ProfPC.local (10.10.2.1) 56(84) bytes of data.
64 bytes from ProfPC.local (10.10.2.1): icmp_seq=1 ttl=63 time=0.581 ms
64 bytes from ProfPC.local (10.10.2.1): icmp_seq=2 ttl=63 time=0.905 ms
64 bytes from ProfPC.local (10.10.2.1): icmp_seq=3 ttl=63 time=0.795 ms
64 bytes from ProfPC.local (10.10.2.1): icmp_seq=4 ttl=63 time=1.02 ms
64 bytes from ProfPC.local (10.10.2.1): icmp_seq=5 ttl=63 time=1.03 ms
^C
--- ProfPC.local ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4006ms
rtt min/avg/max/mdev = 0.581/0.865/1.028/0.165 ms
```

```bash
user@StuPC:~$ resolvectl query ProfPC.local
ProfPC.local: 10.10.2.1                        -- link: eth1

-- Information acquired via protocol mDNS/IPv4 in 38.0ms.
-- Data is authenticated: no; Data was acquired via local or encrypted transport: no
-- Data from: network
```

## 採点基準

- (制約をクリア and 問題サーバでping実行成功)した上で`ping ProfPC.local`が成功する：135点
    - Router: 30点
    - StuPC: 105点
- Router, StuPCの永続化：15点
    - `resolvectl mdns eth1 yes`を使用した場合注意
- 制約の違反：各-30点
    - StuPC
        - `sudo ufw default allow outgoing`の実行
