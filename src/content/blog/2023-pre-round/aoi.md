---
title: "ICTSC2023 予選 問題解説: AOI"
description: "ICTSC2023 本戦 問題解説: BGPがEstablishedにならない"
tags: [ICTSC2023,ネットワーク関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ICTSC2023 予選 問題解説: BGPがEstablishedにならない"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

あなたはとある会社で勤務している社会人です。

あなたはあなたのチーム内のとある社員に対して、下記の課題を出していました。

- 「vyos00内に存在する既存のeBGPの設定をdefaultからVRF EBGP-AS65001に移行してほしい」

後日、課題を出していた社員から「BGPの設定変更は完了しているはずなのにeBGPが確立できない」と相談されました。

この問題を解決してあげてください。

vyos00のeBGPに使用する情報は以下となっています
| local as | remote as | local interface | local address | remote address |
| -------- | --------- | --------------- | ------------- | -------------- |
| 65000    | 65001     | dum0            | 1.1.1.1       | 2.2.2.2 |

## ネットワーク図

![](https://i.imgur.com/N6rpmFf.jpg)

## 前提条件

- 特になし

## 制約

- vyos01の設定変更禁止
  - 設定確認等の目的でvyos01にログインしていただくのは問題ありません

## 初期状態

- vyos00の下記コマンド出力にて「Active」と表示されること
  - `show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state`

- 表示例

  ```
  user@vyos00:~$ show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state
    BGP state = Active
  ```

## 終了状態

- vyos00の下記コマンド出力にて「Established」と表示されること
  - `show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state`

- 表示例 ※xには0~9の数字が入ります。

  ```
  user@vyos00:~$ show ip bgp vrf EBGP-AS65001 neighbors 2.2.2.2 | grep state
    BGP state = Established, up for xx:xx:xx
  ```

# 解説
