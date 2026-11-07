---
title: "ICTSC2026 一次予選 問題解説: 問29"
description: "ICTSC2026 一次予選 問題解説: 問29"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/iyp"
draft: false
renderer: "md"
sticky: false
---

## 問29

クライアントに IPv6 アドレスを割り当てする技術として DHCPv6 / ルータ広告 (RA) がある  
DHCPv6 サーバを利用するステートレス構成としたい場合、 RA で送出すべき適切なフラグの組み合わせはどれでしょう？

| No. | M-flag | O-Flag |
| --- | ------ | ------ |
| ①   | TRUE   | TRUE   |
| ②   | TRUE   | FALSE  |
| ③   | FALSE  | TRUE   |
| ④   | FALSE  | FALSE  |

### 選択肢（択一選択）

1. ①
2. ②
3. ③
4. ④

### 正解

3

### 解説

DHCPv6 / RA 環境においては、 RA で送出する M-Flag (Managed-Flag) と O-Flag (OtherConfig-Flag) によって、クライアントに対して期待する動作を伝える構成となっています  
それぞれが真の場合に M-Flag は「DHCPv6 サーバが割り当てるアドレスを管理する」ことを、 O-Flag は「DNS など、その他の情報を DHCPv6 により取得すべき」ことを意味します  
今回のケースでは、 M=FALSE (0), O=TRUE (1) の組み合わせである ③ が正解です
