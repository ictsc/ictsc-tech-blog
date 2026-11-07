---
title: "ICTSC2026 一次予選 問題解説: 問45"
description: "ICTSC2026 一次予選 問題解説: 問45"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/fya"
draft: false
renderer: "md"
sticky: false
---

## 問45

フルサービスリゾルバが、キャッシュに情報がない状態で `www.example.com` のAAAAレコードを反復問い合わせする。QNAME minimisationを行う場合の動作として正しいものはどれか。

### 選択肢（択一選択）

1. すべての権威DNSサーバへ `www.example.com` を問い合わせる
2. 委任をたどる途中では、必要な部分だけをQNAMEとして問い合わせる
3. QNAMEをハッシュ化してから権威DNSサーバへ問い合わせる
4. 権威DNSサーバとの通信を必ずTLSで暗号化する

### 正解

2

### 解説

QNAME minimisationは、名前解決の途中で問い合わせる権威DNSサーバに対し、元のQNAME全体を必要以上に送信しないための仕組みです。問い合わせ先が元のQNAMEに対する権威を持つと分かっていない段階では、次の委任先を特定するために必要な部分だけをQNAMEとして送信します。

例えば、キャッシュがない状態で`www.example.com`を名前解決する場合、概念的には次のようにQNAMEを段階的に増やしながら委任をたどります。

1. ルートサーバには`com`
2. `com`の権威DNSサーバには`example.com`
3. `example.com`の権威DNSサーバには`www.example.com`

なお、委任をたどる途中のQTYPEは、元の問い合わせのAAAAとは独立に選択されます。

これにより、ルートサーバや`com`の権威DNSサーバへ`www.example.com`という完全なQNAMEを開示せずに名前解決できます。したがって、正解は **2** です。詳細なアルゴリズムと例は[RFC 9156](https://www.rfc-editor.org/rfc/rfc9156.html#section-2)で定義されています。

選択肢1はQNAME minimisationを行わない従来の問い合わせ方法です。QNAMEのハッシュ化や、権威DNSサーバとの通信を必ずTLSで暗号化することは、QNAME minimisationの動作には含まれません。
