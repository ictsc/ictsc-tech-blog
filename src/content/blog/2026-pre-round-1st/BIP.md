---
title: "ICTSC2026 一次予選 問題解説: 問17"
description: "ICTSC2026 一次予選 問題解説: 問17"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/bip"
draft: false
renderer: "md"
sticky: false
---

## 問17

### 概要

F5 BIG-IP 17.5 (Advanced WAF) で Web アプリを保護している。2026-09-19 に攻撃のテストリクエストを2種類送ったところ、次の結果になった。

```
XSS                  -> HTTP 403（ブロックされた）
SQL インジェクション  -> HTTP 200（バックエンドのアプリに到達した）
```

いずれも ASM のイベントログには記録が残っている。2件のテストは同一の URL・同一のパラメータに対して送信しており、当該パラメータはすでに enforce 済み (`performStaging: false`) である。なお ASM のブロッキング応答ページは HTTP 403 を返すよう変更してある (既定は 200) 。

資料1〜3 と資料5 は iControl REST、資料4 は `tmsh` で取得したものである。

### 提示情報

**資料1: ポリシーの設定**

`GET /mgmt/tm/asm/policies/<policy-id>`

```json
{
  "name": "app_policy",
  "enforcementMode": "blocking",
  "type": "security",
  "createdDatetime": "2026-06-02T04:31:07Z"
}
```

`GET /mgmt/tm/asm/policies/<policy-id>/general`

```json
{
  "enforcementReadinessPeriod": 7,
  "trustXff": false,
  "pathParameterHandling": "as-parameters"
}
```

`GET /mgmt/tm/asm/policies/<policy-id>/signature-settings`

```json
{
  "signatureStaging": true,
  "placeSignaturesInStaging": true,
  "attackSignatureFalsePositiveMode": "disabled",
  "minimumAccuracyForAutoAddedSignatures": "medium"
}
```

**資料2: `GET /mgmt/tm/asm/policies/<policy-id>/blocking-settings/violations`**
```json
{
  "items": [
    { "description": "Attack signature detected",        "learn": true, "alarm": true, "block": true },
    { "description": "Illegal meta character in value",  "learn": true, "alarm": true, "block": true }
  ]
}
```

**資料3: `GET /mgmt/tm/asm/events/requests/<request-id>` (2件)**
```json
{
  "requestStatus": "blocked",
  "responseCode": 403,
  "attackTypes": [ "Cross Site Scripting (XSS)" ],
  "violations": [ "Attack signature detected" ],
  "sigIds": [ 200001475 ],
  "sigNames": [ "XSS script tag end (Parameter)" ]
}
```
```json
{
  "requestStatus": "alerted",
  "responseCode": 200,
  "attackTypes": [ "SQL-Injection" ],
  "violations": [ "Attack signature detected" ],
  "sigIds": [ 200002124 ],
  "sigNames": [ "SQL-INJ expressions like \"or 1=1\" (Parameter)" ]
}
```

**資料4: `tmsh list ltm virtual vs_app_https` (抜粋)**
```
ltm virtual vs_app_https {
    destination 10.0.0.100:https
    policies {
        app_policy_ltm { }
    }
    profiles {
        clientssl { context clientside }
        http { }
        websecurity { }
    }
}
```

**資料5: `GET /mgmt/tm/asm/policies/<policy-id>/policy-builder` (抜粋)**
```json
{
  "learningMode": "automatic"
}
```

**資料6:** 2026-09-18 にアタックシグネチャの更新 (Live Update) を適用した。それ以外にポリシーへの変更は行っていない。本アプリケーションには平日日中を通して多数のクライアントから継続的にトラフィックが流入している。

### 設問
SQL インジェクションがブロックされる条件と、検知されたシグネチャが現在どの状態にあるかを実機で確認する方法を詳細に答えよ。また、ブロックを開始させるための操作方法は何か答えよ。

### 正解 (想定解答) 

> **ブロックされる条件**
>
> ASM / Advanced WAF がリクエストをブロックするには、次の 3 つが同時に成立している必要がある。
>
> 1. ポリシーの `enforcementMode` が `blocking` であること。
> 2. 該当する violation (ここでは `Attack signature detected`) の `block` が `true` であること。
> 3. 検知したシグネチャが enforce 済みであること (staging に入っていないこと) 。
>
> 資料1・資料2 より、本件では 1 と 2 が成立しており、また、同じポリシー・同じ violation で XSS が 403 になっている事実からもこのことが裏付けられる。\
> よって、本機において満たされていないのは 3 である。
>
> staging はポリシー単位ではなくシグネチャ単位で適用されるため、資料6 の 2026-09-18 のシグネチャ更新 (Live Update) で新規に追加されたシグネチャは、設定にかかわらずその時点から staging に入る。\
> また、既存のシグネチャが変更された場合も、`signature-settings` の `placeSignaturesInStaging: true` により変更後のルールが staging に入る (変更前のルールは enforce されたまま残る) 。\
> よって、SQL-INJ シグネチャは、この更新で新規に追加されたか、変更後のルールにだけマッチしたことになる。\
> ここで、テスト実施日の 2026-09-19 は更新から 1 日しか経っておらず、`enforcementReadinessPeriod: 7` の 7 日に満たないため、staging 中のシグネチャは violation としてログに記録される (資料3 の `requestStatus: "alerted"`) ものの、こちらのルールによって enforce されないため、ブロックされずに `HTTP 200` でバックエンドに到達する。\
> その一方、XSS のシグネチャは今回の更新の対象外で、ポリシー作成 (2026-06-02) からの readiness period をとうに経過してenforce 済みであるためブロックされる。
>
> **状態の確認方法**
>
> 資料3 の `sigIds` (SQL-INJ 側は `200002124`) から、そのシグネチャのポリシー内での状態を見ると以下の様になる。
>
> ```
> GET /mgmt/tm/asm/policies/<policy-id>/signatures/<signature-id>
> ```
>
> `<signature-id>` は `sigIds` の値 (`200002124`) ではなく、ポリシー内のシグネチャリソースの `id` であり、先に `GET /mgmt/tm/asm/policies/<policy-id>/signatures?$filter=signature/signatureId eq 200002124` で引いておく (このコレクション取得の結果を直接見てもよい) 。\
> 見るべきフィールドは `performStaging` (このシグネチャに staging が適用されているか) と、`wasUpdatedWithinEnforcementReadinessPeriod` (readiness period 内に更新されたか) である。\
> ここで後者が `true` であれば、まさに今回の更新で staging に入ったことが確認でき、併せて`hasSuggestions` も見るとよい。
>
> **ブロックを開始させる操作**
>
> 当該シグネチャの `performStaging` を `false` に変更し、ポリシーを Apply する。
>
> ```
> PATCH /mgmt/tm/asm/policies/<policy-id>/signatures/<signature-id>   {"performStaging": false}
> POST  /mgmt/tm/asm/tasks/apply-policy                               {"policyReference": {...}}
> ```
>
> これはApply を実行しないと反映されない。\
> また、GUI から同じことを行ってもよい (Traffic Learning / Enforcement Readiness Summary から Enforce可能) 。
>
> なお、`signature-settings` の `signatureStaging` を `false` にする方法もあるが、これは今回の更新で staging に入った他のシグネチャも一斉に enforce されるため、誤検知による正常トラフィックの遮断を招きうる。\
> また、新規に追加されたシグネチャはこの設定にかかわらず staging のまま残るため、個別のシグネチャだけを enforce するほうが副作用が小さい。

### 得点の条件

以下の条件をすべて満たした回答を正解とした。

- staging がポリシー単位ではなくシグネチャ単位で適用されることが原因だと書いている
- 資料6 のシグネチャ更新が契機であることと、2026-09-18 から 09-19 までは 1 日で 7 日に満たないことに触れている
- ブロックされる 3 条件 (ポリシーが `blocking`、`Attack signature detected` の `block` が `true`、検知したシグネチャが enforce 済み) をすべて挙げている
- 確認方法として、エンドポイント (`/mgmt/tm/asm/policies/<policy-id>/signatures/<signature-id>` またはそのコレクション) と、見るフィールド (`performStaging` または `wasUpdatedWithinEnforcementReadinessPeriod`) の両方を示している。GUI や `tmsh` でも、どこを見るかが特定できていればよい
- 当該シグネチャの `performStaging` を `false` にすること (個別に enforce すること) と、ポリシーの Apply の両方を書いている。GUI や `tmsh` での同等の操作でもよい
- `signature-settings` の `signatureStaging` を `false` にして一括で解除する方法との違いとして、今回の更新で staging に入った他のシグネチャも一斉に enforce され、誤検知で正常な通信を止めうることに触れている

---

### 解説

「`enforcementMode`が`blocking`だからブロックされる」は誤り。
F5のASM / Advanced WAFは、Enforcement Mode、violationの`block`フラグ、エンティティのstaging状態という3つの独立した条件のANDで初めてブロックする。

F5 の公式ドキュメント (BIG-IP ASM Implementations, Changing Security Policy Settings) には以下のように記載がある。
> During the enforcement readiness period, the system does not block traffic, even if requests trigger violations against the security policy and the violations are set to Block.

本問の要点は、この staging がポリシー単位ではなくシグネチャ単位で適用されることである。
資料1 のポリシーは 2026-06-02 作成で readiness period 7 日はとうに経過しており、ポリシー全体が staging 期間内という説明は成立しない。
実際、同じポリシー・同じ violation (Attack signature detected) で XSS はブロックされている。

XSSとSQLiの動作差分に対して影響が出たのは資料6 のシグネチャ更新である。更新で新規に追加されたシグネチャは、設定にかかわらずその時点から staging に入るため、既存のシグネチャが変更された場合は、`placeSignaturesInStaging: true` により変更後のルールが staging に入り、変更前のルールは enforce されたまま残る。\
SQL-INJ シグネチャは 2026-09-18 の更新で新規に追加されたか、変更後のルールにだけマッチしており、テスト実施の 2026-09-19 は経過 1 日で 7 日に満たない。

また、XSS がブロックされている事実が資料として決定的である。\
`enforcementMode`、violation の `block`、`websecurity` プロファイル、ポリシーのアタッチはいずれも XSS の側で成立が証明されており、すべて被疑箇所から外れることになり、残るのはシグネチャ単位の差だけになる。

最後に、本設問では問うていないが、運用者が何も操作しなかった場合にどうなるかが実運用上もっとも重要なポイントである。\
`learningMode` が `automatic` である以上、Policy Builder が readiness period 経過後にシグネチャを自動で enforce する経路が開いている状況である。\
ただし、*ready to be enforced* の条件は 「ERP が満了し、かつ staging 期間中に learning suggestion が追加されていないこと」であり、本問ではテストの SQLi が staging 中のシグネチャにマッチしているため、suggestion が付いて自動 enforce が保留される可能性がある。\
また、自動 enforce は時間の経過だけでは起こらず、複数セッション・複数送信元 IP からの十分なトラフィックが処理されていることが条件であるため、「2026-09-25 前後に自動で塞がる」と「手動で enforce するまで塞がらない」のどちらも成立しうる。\
いずれにしても重要なのは、シグネチャ更新のたびに数日単位で無防備になってしまうという性質であり、本問で問われていないものの、実運用においては最も気にすべき項目である。\
この期間を短縮したければ `enforcementReadinessPeriod` を縮めるか、更新後に手動で enforce する手順をチェンジ管理に入れる必要があるが、ここで、安易に`placeSignaturesInStaging` を `false` にすると、変更されたシグネチャは即座に本番トラフィックへ適用されるため、誤検知でサービスを止めるリスクと引き換えになる (新規に追加されたシグネチャはこの設定にかかわらず staging に入る)。

### 講評

回答した 46 チームのうち、正解は 7 チームだった。

多かったのは、ブロックされない原因 (09-18 のシグネチャ更新で staging に入り、7 日経っていない) と確認方法までは書けているものの、開始操作で個別に enforce する理由、つまり `signature-settings` で staging を一括解除した場合との違いに触れていない回答。\
不正解だった回答の半数以上は、この点だけが欠けていた非常に惜しい回答であった。\
また、資料6 の更新日と ERP の 7 日を突き合わせていない回答も散見された。
