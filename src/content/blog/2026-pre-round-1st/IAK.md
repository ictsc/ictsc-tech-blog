---
title: "ICTSC2026 一次予選 問題解説: 問14"
description: "ICTSC2026 一次予選 問題解説: 問14"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/iak"
draft: false
renderer: "md"
sticky: false
---

## 問14

### 状況

社内の権威 DNS サーバ（BIND 9.18）が内部専用ゾーン **corp.internal** を配信している。外部のセキュリティ研究者から「内部ホスト一覧が取得できる」と報告があり、調査したところ外部 IP **198.51.100.77** からゾーン転送（AXFR）が成功しているログが見つかった。運用者は TSIG を使った認証付き転送を導入したつもりだが、設定ミスが疑われる。

### 前提条件

- ゾーンのマスターは **10.0.0.10**、セカンダリは **10.0.0.11**。
- OS：Linux（例：Ubuntu 20.04 / RHEL 8 系）を想定。
- BINDバージョン：BIND 9 系（例：9.18）を想定。

### 資料

いずれもマスターのログ

#### /etc/bind/named.conf 抜粋

```
include "/etc/bind/acl.conf";
include "/etc/bind/extra.conf";
include "/etc/bind/zones.conf";

key "axfr-key" {
 algorithm hmac-sha256;
 secret "BASE64SECRET==";
};
```

#### /etc/bind/acl.conf 抜粋

```
acl "trusted" {
  10.0.0.11;
};
```

#### /etc/bind/zones.conf 抜粋

```
zone "corp.internal" {
 type master;
 file "zones/db.corp.internal";
 allow-transfer { secondary-dns; };
 allow-update { none; };
};
```

#### /etc/bind/extra.conf 抜粋

```
acl "secondary-dns" {
  any;
};
```

#### /var/log/named/queries.log 抜粋

```
2026-08-12T04:19:58 named[1234]: client 198.51.100.77#54321: transfer of 'corp.internal' from 10.0.0.10#53: AXFR started
2026-08-12T04:19:59 named[1234]: client 198.51.100.77#54321: transfer of 'corp.internal' from 10.0.0.10#53: AXFR completed
2026-08-12T04:20:05 named[1234]: client 10.0.0.11#12345: transfer of 'corp.internal' from 10.0.0.10#53: AXFR started (TSIG verified)
2026-08-12T04:20:06 named[1234]: client 10.0.0.11#12345: transfer of 'corp.internal' from 10.0.0.10#53: AXFR completed
```

### 設問

以下の三点について答えよ。

### 小問(1)

外部 198.51.100.77 からの AXFR が許可された理由について説明しなさい。

#### 正解（想定解答）

(1)外部からの AXFR が成功した直接の原因は、extra.conf に定義された ACL「secondary-dns」が any になっていたためである。

### 小問(2)

TSIG が定義されているにもかかわらず外部転送で TSIG が使われなかった理由を、10.0.0.11 の転送で "TSIG verified" が出ている点と対比して説明しなさい。

#### 正解（想定解答）

(2)TSIG キーは named.conf に定義されていたが、ゾーン設定のallow-transferにkey設定が行われていなかった。
そのため転送先は接続元IPアドレスのみで判断され、TSIGを持たないクライアントからもAXFRが実行可能であった。

### 小問(3)

外部転送でTSIG を使用するために、「named.conf」を更新します。この場合、「named.conf」に追記する内容を示しなさい。

※内容の説明をするのではなく、実際に想定される追記内容を直接記述すること。

#### 正解（想定解答）

(3)

```text
zone "corp.internal" {
    type master;
    file "zones/db.corp.internal";
    allow-transfer { key axfr-key; };
    allow-update { none; };
};
```
※zones.conf に記載された同じゾーンは削除する。

### 解説

#### 要点：AXFR許可の原因
  - 外部からの AXFR が成功した原因は、allow-transfer が参照している ACL「secondary-dns」が any で定義されていたためである。
```text
acl "secondary-dns" {
  any;
};
```

  - zones.conf では以下のように設定されている。

```text
allow-transfer { secondary-dns; };
```

  - その結果、実質 allow-transfer { any; }; と同じ意味になり、外部 IP 198.51.100.77 を含むすべてのホストからの AXFR を許可してしまった。


※問題文では説明のために　secret "BASE64SECRET==";　という値を使用しているが、これは実際のTSIGシークレットではなく、伏字化されたサンプル値である。


#### 要点：TSIG の挙動
  - TSIG キーは named.conf に定義されているが、TSIG を必須化する設定（allow-transfer に key を指定する）が行われていなかったため、TSIG を使わない AXFR も許可されてしまった。

  - 一方、ログには以下のように 10.0.0.11 からの転送では TSIG verified が出ている。

```text
AXFR started (TSIG verified)
```

  - これは セカンダリ側（10.0.0.11）が TSIG を使って転送要求を送っているためであり、マスター側は TSIG を受け入れているだけで、TSIG を必須化しているわけではない。

  - したがって、
    - セカンダリ（10.0.0.11）は TSIG を使うため TSIG verified が出る
    - 外部（198.51.100.77）は TSIG を使わないが、allow-transfer が any のため許可される

という挙動になった。

※問題文に記載されたログはAXFRの流れを説明するために簡略化した例です。実際のBIND9.18ログをそのまま転記したものではありません。


#### 要点：設定ファイルの記述

解答例が複数あるので、以下に示す。

**案①：named.conf に zone を追記し zones.conf の既存定義を削除**

目的：既存の誤設定（allow-transfer { secondary-dns; } が any を参照）を上書きして TSIG 必須化する。

手順（例）

zones.conf の zone "corp.internal" ブロックを削除またはコメントアウト。

named.conf に以下を追記（key 定義の下、または適切な位置に）：

※zones.conf に記載された同じゾーンは削除する。

```text
zone "corp.internal" {
    type master;
    file "zones/db.corp.internal";
    allow-transfer { key axfr-key; };
    allow-update { none; };
};

```

※zones.conf の corp.internal ブロックを次のように編集してもよい

```text
zone "corp.internal" {
    type master;
    file "zones/db.corp.internal";
    allow-transfer { key "axfr-key"; };
    allow-update { none; };
};
```

**案②：allow-transfer をセカンダリ IP に限定し、server ブロックで鍵を明示**

目的：IP ベースでの制限と TSIG を組み合わせて二重化する。

手順（例）

①zones.conf の zone ブロックを次のように変更：

```text
zone "corp.internal" {
    type master;
    file "zones/db.corp.internal";
    allow-transfer { 10.0.0.11; };
    allow-update { none; };
};
```

②named.conf（または include 先）に server ブロックを追加（任意だが推奨）：

```text
server 10.0.0.11 {
    keys { axfr-key; };
};
```

**案③：acl "secondary-dns"の定義を修正する**

要旨：extra.conf の acl "secondary-dns" を any からセカンダリの IP に変更し、zones.conf の allow-transfer { secondary-dns; }; をそのまま使う。



設定（extra.conf）：

```text
acl "secondary-dns" {
    10.0.0.11;
};
```

鍵の使用についても明示する

```text
server 10.0.0.11 {
    keys { "axfr-key"; };
};
```


