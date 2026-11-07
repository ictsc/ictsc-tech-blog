---
title: "ICTSC2026 一次予選 問題解説: 問21"
description: "ICTSC2026 一次予選 問題解説: 問21"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/sml"
draft: false
renderer: "md"
sticky: false
---

## 問21

### 概要

自作の SP に SAML Single Logout を実装している。IdP から届く `LogoutRequest` の署名検証が必ず失敗する。

### 提示情報

IdP から届いた URL (改行は便宜上のもの):

```
GET /saml/slo?SAMLRequest=fZFLa8NADIT%2Fitm7n3EbR9iGgikY0h6a0kMvYWPLrcH76EqG%2FPz60UDSQ2
  5i9M2gQTlJNVjYmy8z8hv%2BjEjsndWgCZZNIUanwUjqCbRUSMANHJ5e9pAEEV
  hn2DRmEFeW%2Bw5JhI57o4VXV4U4Zt1Gxk3SpvhwEt4HOpp2hZjQCSAasdbEUv
  MkRcmjH%2B38aPseJRCnEGWfwqume3steXF9M1uCMCQb4FkqO2DQGBXOV4U0GF
  Hm8whLrisvdN%2Fe4Hl4Da2O16lHXXnPxinJ9wvOSt%2F63YKCnQsRo2ZRjn6a
  JfFf%2FJq4xls4IM29a93iuTw2aXzKcNslcrdZ8X%2FERbz5WvkL
  &RelayState=%2fdashboard%20home
  &SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256
  &Signature=Nf8s%2FQ1z（以下省略）%3D
```

`Signature` の値は紙面上 `（以下省略）` と省略しているが、実際には完全な base64 値が入っているものとする。

実装者は次の手順で検証しており、いずれもうまくいかない。`verify(pubkey, sig, data)` は `SigAlg` が示すアルゴリズムで正しく検証する関数、`pubkey` は IdP メタデータの署名用証明書の公開鍵であるものとする。

```python
params = parse_qs(urlparse(url).query)

# 試行1
xml = zlib.decompress(base64.b64decode(params["SAMLRequest"][0]))
# -> zlib.error: incorrect header check

# 試行2（試行1 を修正して xml が取得できたものとする）
sig_el = etree.fromstring(xml).find(".//{http://www.w3.org/2000/09/xmldsig#}Signature")
# -> None（XML 内に Signature 要素が存在しない）

# 試行3
signed = urlencode({k: params[k][0] for k in ("SAMLRequest", "RelayState", "SigAlg")})
verify(pubkey, b64decode(params["Signature"][0]), signed.encode())
# -> 検証 NG
```

以下の4点について述べよ。

### 小問 (1)

HTTP-Redirect binding において、署名の計算対象は何か。根拠を明示して答えよ。

#### 正解 (想定解答)

> HTTP-Redirect binding では、署名は XML の中の `<ds:Signature>` ではなく、URL のクエリ文字列に対して計算する。\
> 具体的には、受信した生のクエリ文字列から `SAMLRequest`、`RelayState` (ある場合のみ)、`SigAlg` をこの順に `&` でつないだ、URL エンコード済みのオクテット列が署名の対象になる。\
> このとき、`Signature` パラメータ自身は署名の対象に含めない。
>
> 根拠は、Redirect binding では `Signature` と `SigAlg` が XML の外に、クエリパラメータとして分けて運ばれる仕様になっていることである (SAML 2.0 Bindings の DEFLATE Encoding の規定)。\
> そのため、XML 署名 (XMLDSig / C14N) の処理は使われない。

#### 得点の条件

以下の条件をすべて満たした回答を正解とした。

- 署名対象が XML 内の `<ds:Signature>` ではなく、URL のクエリ文字列であると書いている
- 連結の順序が `SAMLRequest` → `RelayState` (あれば) → `SigAlg` であると書いている
- 根拠として、`Signature` と `SigAlg` が XML の外にクエリパラメータとして分離されていること、または SAML 2.0 Bindings の規定に触れている
- `Signature` 自身を署名対象に含めていない

### 小問 (2)

試行1 が失敗する理由と、正しい展開方法を答えよ。

#### 正解 (想定解答)

> Redirect binding で送られてくるデータは、zlib のヘッダも gzip のヘッダも持たない raw DEFLATE (RFC 1951) である。\
> `zlib.decompress` を既定の `wbits` のまま呼ぶと zlib のヘッダがあるものとして読むので、base64 をデコードした直後のバイト列の先頭で `incorrect header check` になる。\
> 正しくは、`wbits` に負の値を渡して `zlib.decompress(data, -15)` とするか、`zlib.decompressobj(-15)` を使う。

#### 得点の条件

以下の条件をすべて満たした回答を正解とした。

- zlib ヘッダが無い raw DEFLATE であることを原因として書いている
- 正しい展開方法として、`wbits` に負値を与えること (`zlib.decompress(data, -15)`、`zlib.decompressobj(-15)`、raw DEFLATE として展開する、のいずれか) を示している。ヘッダを前置するだけの方法は認めない

### 小問 (3)

試行3 が失敗する理由を述べよ。

#### 正解 (想定解答)

> `parse_qs` で percent-decode した値を `urlencode` でエンコードし直して署名の対象を組み立てているため、受信したときのバイト列に戻せていないことが原因である。\
> このとき、percent-encoding の書き方は1通りではなく、`%2f` と `%2F` の大文字・小文字や、空白の `%20` と `+` のような違いがあるので、デコードしてエンコードし直しても元のオクテット列に戻るとは限らない。\
> 本問においても、`RelayState=%2fdashboard%20home` は Python の `urlencode` では `%2Fdashboard+home` になり、実際に食い違う。
>
> また、署名の検証はバイト列が完全に一致するかどうかで決まるため、`urlparse(url).query` の生のクエリ文字列から各パラメータの部分を切り出し、デコードせずにそのままつないで署名の対象にする必要がある。

#### 得点の条件

以下の条件をすべて満たした回答を正解とした。

- デコードした値から署名対象を組み立て直してはならず、受信した生のクエリ文字列をそのまま使う必要があると書いている
- 食い違いの具体例として、`%2f` と `%2F` の大文字小文字、または空白の `%20` と `+` の差のいずれかを挙げている

### 小問 (4)

検証に成功した後、SP は IdP へ `LogoutResponse` を HTTP-Redirect binding で返す。この応答に署名を付ける場合、どのように署名するか詳細に述べよ。あわせて、どのセッションを破棄すべきかを `LogoutRequest` のどの要素から決めるかを示せ。

#### 正解 (想定解答)

> **署名の付け方**
>
> `LogoutResponse` も Redirect binding の同じ規則で署名するが、パラメータ名は `SAMLRequest` ではなく `SAMLResponse` になる。\
> このとき、手順は次のとおりである。
> 1. `LogoutResponse` の XML を raw DEFLATE で圧縮し、base64 にしてから URL エンコードする。
> 2. 送信する文字列として、`SAMLResponse=...&RelayState=...&SigAlg=...` をこの順につなぐが、`RelayState` は、受信していれば同じ値をそのまま返し、署名の対象にも含めることに注意する。
> 3. 実際に送信するこのオクテット列に対して、SP の秘密鍵を使い `SigAlg` のアルゴリズムで署名する。結果を base64 にして URL エンコードし、`&Signature=...` として後ろに付ける。
>
> 署名してから URL を組み立てるのではなく、送信する文字列を先に決めてから、それに署名する。
>
> **破棄するセッション**
>
> `LogoutRequest` の `<saml:NameID>` でユーザーを特定する。\
> `<samlp:SessionIndex>` があれば、そこに並んでいるすべての SessionIndex に対応するセッションだけを破棄する (`SessionIndex` は 0 個以上ありうる)。\
> `SessionIndex` が無ければ、その `NameID` に紐づく、その SP のすべてのセッションを破棄する。

#### 得点の条件

以下の条件をすべて満たした回答を正解とした。

- パラメータ名が `SAMLRequest` ではなく `SAMLResponse` になることに触れている
- 署名対象が、実際に送出する URL エンコード済みのクエリ文字列そのものであることを書いている
- 破棄するセッションを `<saml:NameID>` と `<samlp:SessionIndex>` から決め、`SessionIndex` があればそれに対応するセッションだけ、無ければ `NameID` に紐づく全セッションを破棄する、という場合分けを書いている

### 解説

**Redirect binding の署名**

Redirect binding では、XML の中に署名を入れず、`Signature` と `SigAlg` を URL のクエリパラメータとして別に運ぶが、これはDEFLATE した XML に署名を入れると、URL が長くなりすぎるためである。\
このため、XML 署名 (XMLDSig / C14N) の知識はここでは不要。

また、検証はバイト列が完全に一致するかどうかで決まるので、受信した生のクエリ文字列を残していない実装では、そもそも検証できない。\
フレームワークが早い段階で `parse_qs` してしまう作りだと、ここで失敗する。

なお POST binding では DEFLATE せずに base64 にするだけで、署名は XML の中の `<ds:Signature>` に入るので、手順がまったく異なる。

**署名を付ける側の規則**

小問 (4) は、実装する立場ではもっとも重要な点となる。\
検証と生成は必然的に同じ規則によることとなるが、パラメータ名が `SAMLRequest` から `SAMLResponse` に変わる。\
しかしながら、検証のコードをそのまま流用して、`SAMLRequest=` のまま署名してしまう実装は珍しくない。

また、生成する側では、署名してから URL を組み立てるのではなく、送信する URL エンコード済みの文字列を先に決めて、それに署名する。\
検証する側が生のバイト列を見る以上、送信する側も送信するバイト列そのものに署名しないと一致しない。

**破棄するセッションの決め方**

SLO で破棄するセッションは、`LogoutRequest` の `<saml:NameID>` で特定する。\
`<samlp:SessionIndex>` があれば、そこに並んでいるセッションだけを破棄し、無ければその `NameID` に紐づくすべてのセッションを破棄する。\
SP は1人のユーザーについて複数のセッションを持ちうるので、`SessionIndex` を見ずに `NameID` だけですべて破棄すると、仕様 (SAML Core 3.7.3.1) に反するうえ、ログアウトさせるつもりの無いセッションまで切断することになる。

### 講評

各小問の正解チーム数は次のとおり。

| 小問 | 正解チーム数 / 回答チーム数 |
| --- | ---: |
| (1) | 39 / 46 |
| (2) | 43 / 46 |
| (3) | 37 / 46 |
| (4) | 30 / 46 |

(1) ~ (3) は多くのチームが正解に辿り着いた。

(4) は、`SessionIndex` がある場合と無い場合で破棄するセッションを分けて書けているかどうかで差がついた。
