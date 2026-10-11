---
title: "ICTSC2026 一次予選 問題解説: 問43"
description: "ICTSC2026 一次予選 問題解説: 問43"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/emo"
draft: false
renderer: "md"
sticky: false
---

## 問43

次のような DNS レコードが登録されているとする

```
example.com.		IN	TXT	"v=spf1 redirect=_spf.example.com"
_spf.example.com.	IN	TXT	"v=spf1 exists:%{ir}.%{l1r-}._spf.%{d} ~all"
123.100.51.198.user-ictsc2026._spf.example.com	IN	A	127.0.0.1
```

送信者が `user-ictsc2026@example.com` の場合、最終的な SPF 評価結果はどれでしょう？  
なお、 SMTP クライアントのアドレスは `198.51.100.123` とします

### 選択肢（択一選択）

1. `pass`
2. `softfail`
3. `fail`
4. `neutral`

### 正解

2

### 解説

SPF レコードのマクロ展開を含む仕様理解を問う問題でした  

まず、 `exists` は指定した DNS レコードを解決可能であるか (A レコードが存在するか) を確認するディレクティブです  
そしてマクロ展開は送信元アドレスやメールアドレスといった情報を元にを動的に文字列を組み立てる仕組みで、よく exists と組み合わせて利用されます

> RFC7208#7.4 の拡張表現テーブル (抜粋)
> ```
> The <sender> is strong-bad@email.example.com.
> ...
>
> macro                       expansion
> -------  ----------------------------
> ...
> %{l1r-}                        strong
> 
> ...
> 
> macro-string                        expansion
> ---------------------------------------------
> ...
> %{ir}.%{v}.%{l1r-}.lp._spf.%{d2}    3.2.0.192.in-addr.strong.lp._spf.example.com
> ```

に倣うと `%{ir}` で期待されるのは逆順の送信元アドレス `23.100.51.198` となり、 `%{l1r-}` は `user` です  
つまり `23.100.51.198.user._spf.example.com` の A レコードの存在が `pass` の条件となり、 SPF レコードの `~all` に従って `softfail` が正解となります
