---
title: "ICTSC2023 本戦 問題解説: [JPQ] 初心者プログラマーでもmakeがしたい！"
description: "ICTSC2023 本戦 問題解説: 初心者プログラマーでもmakeがしたい！"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/jpq"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

先輩がどっかのサイトからコピってきたMakefileを用意してくれたんだけど、なんかバグってて動かない！  
エラー文もよくわかんないし、助けてくれ！

## 前提条件

- 回答内で許可されるアクション
  - userユーザーのホームディレクトリ直下にある `make-file` の編集
    - ファイルの中身だけでなく、ファイルのプロパティも変更してかまいません
  - `make` の実行
    - 実行時、optionを付けてはいけません
- 回答内で許可されないアクション
  - 上記以外の全てのアクション
- その他
  - できるだけ編集距離が少ない解答をして下さい
    - 想定解法の編集行数・ファイル数を大きく超えた編集を行っている場合、編集量に応じた減点をします

## 初期状態

userユーザーのホームディレクトリで `make` コマンドを実行しても、エラーが出て終了する。

## 終了状態

userユーザーのホームディレクトリで `make` コマンドを実行すると、以下の通りのコマンドが記入された順に実行される。

1. `gcc src/app.c -o a.out`
    - src/app.c をコンパイルし実行ファイル a.out を作成する
2. `./a.out /tmp/out.txt`
    - コマンド引数として /tmp/out.txt を指定して実行ファイル a.out を実行し /tmp/out.txt に `ICTSC2022` の文字列を出力する
3. `cat /tmp/out.txt | sed "s/2022/2023/" > out.txt`
    - /tmp/out.txt 内に出力された文字列 `ICTSC2022` を、sedコマンドによる置換処理を施した上で、`ICTSC2023` としてout.txtに上書きする

## 接続情報

| ホスト名       | IPアドレス   | ユーザ | パスワード |
| -------------- | ------------ | ------ | ---------- |
| problem-jpq-vm | 192.168.15.1 | user   | ictsc      |

---

## 解説・想定解法

Makefileのミスを見つける問題。

### ファイル名

`make: *** No targets specified and no makefile found.  Stop.` エラー

`make-file` ファイルの名前を `makefile` か `Makefile` にすると修正できる。  
ファイル名はファイルのプロパティ扱いとしている。

```sh
mv make-file Makefile
```

などのコマンドで名称を変更する。

### タブインデント

`Makefile:11: *** missing separator.  Stop.` エラー

Makefileはインデントがタブでなくてはいけない。スペースでインデントをしているとこのエラーが出る。

```diff
-   rm -f a.out /tmp/out.txt out.txt
+         rm -f a.out /tmp/out.txt out.txt
```

(スペース2個をタブにする)

### typo

`make: *** No rule to make target '/tmp/out,txt', needed by 'out.txt'.  Stop.` エラー

`/tmp/out.txt` とすべきところが `/tmp/out,txt` になってしまっているため、修正する。

```diff
- out.txt: /tmp/out,txt
+ out.txt: /tmp/out.txt
```

### 不可視(？)のスペース

`make: *** No rule to make target 'a.​out', needed by '/tmp/out.txt'.  Stop.` エラー

`a.out` に不可視のスペースが入っているというもの。  
(本当は不可視にしたかったが、なぜか問題VMだと空白に見えてしまっていた。)  
スペースを抜くだけ。

```diff
- /tmp/out.txt: a.​out
+ /tmp/out.txt: a.out
```

### ファイルパスの指定ミス

`make: *** No rule to make target 'app.c', needed by 'a.out'.  Stop.` エラー

`src/app.c` がソースコードなのに、その指定が間違っている。
パスを直すだけ。

```diff
- a.out: app.c
+ a.out: src/app.c
```

## 採点基準

全部できて50点  
前提条件を破っていたら問答無用で0点

## 講評

50点の最低点問題として出題しました。  
2日目朝の時点で全チーム完答という結果になったので、50点問題としての役割はきちんと果たせたのかなと思います。

Makefileのエラーってちょっとわかりづらいよね～という問題でした。  
ただ、Makefileは世界中で大変多くの人が使っていますので、かなり検索のヒット率が高く、基本的なサーチ力がある人ならばそこまで苦労しないような問題だったかなと思います。
