---
title: "ICTSC2026 一次予選 問題解説: 問11"
description: "ICTSC2026 一次予選 問題解説: 問11"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/vtl"
draft: false
renderer: "md"
sticky: false
---

## 問11

BIND 9を使用したDNSサーバにおいて、`example.com` ゾーンを管理している。
`example.com` 宛てのメールの配送先を `mail.example.com` に設定したい。

ゾーンファイルに追加する設定として、正しいものを次からすべて選べ。

### 選択肢（複数選択）

1. `@ IN A 10 mail.example.com.`
2. `mail IN MX 10 example.com.`
3. `@ IN MX 10 mail`
4. `@ IN MX 10 mail.example.com`
5. `@ IN MX 10 192.168.1.20`
6. `mail IN A example.com.`

### 正解

3

### 解説

MXレコードは、メールの配送先となるメールサーバを指定するためのレコードである。
基本的な書式は以下のとおりである。
<名前> IN MX <優先度> <メールサーバ名>
今回、example.com 宛てのメールを mail.example.com に配送したいため、
`@ IN MX 10 mail`
と設定する。
@ はゾーン自身である example.com. を表し、mail は相対名のため mail.example.com. として解釈される。
そのため、正解は3となる。

以下が各選択の解説である。

1. 不正解：Aレコードは、ホスト名とIPv4アドレスを対応付けるためのレコードなので不正解。また、AレコードにはMXレコードのような優先度 10 は指定しない。
2. 不正解：この設定では、mail.example.com 宛てのメール配送先を example.com. に指定することになり、目的と逆になる。
3. 正解：mail は相対名であり、example.com ゾーンでは mail.example.com. として解釈される。そのため、example.com のメール配送先として mail.example.com を指定できる。
4. 不正解：mail.example.com の末尾に . がないので相対名になる。そのため、ゾーン名が追加され、mail.example.com.example.com. として扱われる。なので不正解。
5. 不正解：MXレコードの配送先には、IPアドレスではなくメールサーバのホスト名を指定する。
6. 不正解：Aレコードの値にはIPv4アドレスを指定する必要がある。example.com. のようなホスト名は指定できない。
