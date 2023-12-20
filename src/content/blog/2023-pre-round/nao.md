---
code: nao
title: 絵文字が入力できない！😭
point: 50
solvedCriterion: 50
type: normal
connectInfo:
  - hostname: redmine
    command: ssh user@192.168.255.21 -p 22
    user: user
    password: rgv8qbaiTVgg
    port: 22
    type: ssh
---

## 概要

「我が社では古の時代から redmine を運用してきたが、最近入社した新卒から絵文字が書き込めないという問い合わせが寄せられるようになった。(;´･ω･｀)  
私はこの通り書き込めているのだが...( -᷄ω-᷅ )  
君にはこの問題を解決してほしい<(￣＾￣)>」

「上司、それは絵文字では無く顔文字です😓」

redmine に絵文字を書き込むことが出来ない事象を解決してください。

## ネットワーク図

* 特になし

## 前提条件

* 特になし

## 制約

* この redmine は社内で利用されている想定となっています。
* そのため redmine に登録されているチケット情報や wiki の内容が消えてしまう方法で解答した場合減点対象となります。

## 初期状態

wiki に絵文字🍣が書き込めない

## 終了状態

wiki に絵文字🍣を書き込んで保存することが出来る。

## 参考情報

redmine を手元のPCで見る方法
* redmine ログイン情報
  * ユーザ名: admin
  * パスワード: `J6vs0N2H21Y07oV5qUn57w`

```bash
# localhost:80 で見る場合
ssh -L 80:192.168.255.21:80 user@<踏み台サーバー> -N
open http://localhost:80

# localhost:8000 で見る場合
ssh -L 8000:192.168.255.21:80 user@<踏み台サーバー> -N
open http://localhost:8000
```

この状態で以下のＵＲＬにアクセスすることで wiki を開くことが出来ます

```http://localhost:<指定したポート>/projects/ictsc/wiki```
