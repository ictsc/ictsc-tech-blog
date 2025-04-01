---
title: "ICTSC2024 本戦 問題解説: [EDS] インフラ勉強中・・・"
description: "ICTSC2024 本戦 問題解説: インフラ勉強中・・・"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/eds"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

多誤君は、友人Aから譲り受けたサーバーを研究室に設置し、勉強用のサーバーとして活用しています。 そして、dockerとiptablesを使用して自分しか見れないwebサーバをで作成しました。しかし、サーバーにアクセスすると、意図しないページが表示される現象が発生しました。さらに、そのサーバーには他の研究室の端末からもアクセスできてしまい、意図したセキュリティ設定が反映されていないことが判明しました。

あなたは優しい友人Aです。

多誤君が抱えている問題を解決してあげましょう。

## 前提条件

- `192.168.36.0/24`の中で`eds-client1`(IPアドレス：`192.168.36.2`）以外からの`8080 ポート`へのTCPトラフィックをDROPすること。
- `/home/user/app/Dockerfile`を使用し、`8080 ポート`に対するリクエストには`Welcome to ITSC2024!!`という内容の応答を返すこと。
- **報告書では発生していたトラブル、解決方法、解決理由などを明確に記載すること。**

### 制約

- Dockerfileは変更不可。
- Dockerネットワークを壊さないこと。
- サーバー再起動後も終了状態が維持されること。
- nginxなどでリバースプロキシを行ってはいけません。
  - つまり、特定のDocker コンテナが `8080 ポート`で直接応答できるようにすることが求められています。

## 初期状態

- eds-client1`192.168.36.2`から`$ curl http://192.168.36.1:8080`を実行すると`Welcome to ITSC2024?`という内容が返却される
- eds-client2`192.168.36.3`から`$ curl http://192.168.36.1:8080`を実行すると`Welcome to ITSC2024?`という内容が返却される

## 終了状態

- eds-client1`192.168.36.2`から`$ curl http://192.168.36.1:8080`を実行すると`Welcome to ITSC2024!!`という内容が返却される
- eds-client2`192.168.36.3`から`$ curl http://192.168.36.1:8080`を実行すると`Couldn't connect to server`となる

### 減点

- iptablesを変更した場合、冗長なルールや不要なルールは排除すること。

<!-- ## ネットワーク図 -->

---

## 解説

全体の流れとしては、Docker コンテナの正しい起動と、iptables のルール変更によるアクセス制御の２本柱となります。

---

### 1. nginxの停止、無効化、Docker コンテナの再ビルドと起動

- **問題点:**
  - 現在、コンテナが誤った応答（"Welcome to ITSC2024?"）を返しているのは、ソース内のタイポ（例: `node serve.js` になっている、`、'のタイポ）や以前の設定（nginx とのポート競合）の影響です。

- **対策:**
  - nginxを停止、無効化する。
    - 無効化は`サーバー再起動後も終了状態が維持されること。`という制約を満たすため必要。
  - ソースコード内(`package.json`)のタイポを修正し、正しいファイル（例: `server.js`）が使用されるようにする。
  - `server.js`内の '->` のタイポを修正する。
  - Dockerfile は変更不可ですが、コンテナ内の実行ファイルが正しいかを確認した上で、再ビルドを行う。
  - もし既存コンテナが残っている場合は、削除してから新たに起動すること。

- **実施例:**
  ```bash
  sudo systemctl stop nginx
  sudo systemctl disable nginx
  ```

  ```bash
  sudo docker build -t my-node-app .
  sudo docker run -d --restart unless-stopped --name my-node-app -p 8080:8080 my-node-app
  ```

  -（必要に応じて `sudo docker rm <old-container>` で古いコンテナを削除）

  - `サーバー再起動後も終了状態が維持されること。`という制約を満たすため
  `--restart unless-stopped`を指定すること。サーバー再起動後もコンテナが自動的に起動します。[docs.docker.jp.onthefly](https://matsuand.github.io/docs.docker.jp.onthefly/config/containers/start-containers-automatically/)
  `docker update --restart=always my-container`などでも変更可能

---

### 2. iptables のルール変更

- **目的:**
  - `192.168.36.0/24` 内のアドレスのうち、`192.168.36.2` 以外からの TCP 8080 へのアクセスを遮断し、かつ Docker の iptables ルールと競合しないように設定する。

- **改善ポイント:**
  - 現在、既存ルールが **INPUT** チェーンに設定されているため、Docker の内部処理と干渉する。
  - Docker の起動時に適用される iptables ルールは **DOCKER-USER** チェーンで処理されるので、ここに適切なルールを挿入する。

- **手順:**

  1. **既存ルールの削除:**
     ※初期状態では、INPUT チェーンに以下のようなルールが設定されているので、削除しておきます。

     ```bash
     sudo iptables -D INPUT -s 192.168.36.2 -p tcp --dport 8080 -j ACCEPT
     sudo iptables -D INPUT -s 192.168.36.0 -p tcp --dport 8080 -j DROP
     ```

  2. **DOCKER-USER チェーンにルール追加:**
     - まず、eds-client1（192.168.36.2）からのアクセスを明示的に許可し、
     - 次に、192.168.36.0/24 からのアクセスを拒否するルールを挿入します。

     ```bash
     sudo iptables -I DOCKER-USER 1 -s 192.168.36.2 -p tcp --dport 8080 -j ACCEPT
     sudo iptables -I DOCKER-USER 2 -s 192.168.36.0/24 -p tcp --dport 8080 -j DROP
     ```

- **確認:**
  ルールが正しく設定されたかは、以下のコマンドで確認できます。

  ```bash
  sudo iptables -L -n --line-numbers
  ```

  DOCKER-USER チェーン内で、1番目に「ACCEPT 192.168.36.2」、2番目に「DROP 192.168.36.0/24」があることを確認してください。
  DROPではなくREJECTを使うのは、採点には影響しない。

    ```
    user@eds-server:/etc/docker$ sudo iptables -L -n --line-numbers
    Chain INPUT (policy ACCEPT)
    num  target     prot opt source               destination

    Chain FORWARD (policy DROP)
    num  target     prot opt source               destination
    1    DOCKER-USER  0    --  0.0.0.0/0            0.0.0.0/0
    2    DOCKER-ISOLATION-STAGE-1  0    --  0.0.0.0/0            0.0.0.0/0
    3    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
    4    DOCKER     0    --  0.0.0.0/0            0.0.0.0/0
    5    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0
    6    ACCEPT     0    --  0.0.0.0/0            0.0.0.0/0

    Chain OUTPUT (policy ACCEPT)
    num  target     prot opt source               destination

    Chain DOCKER (1 references)
    num  target     prot opt source               destination
    1    ACCEPT     6    --  0.0.0.0/0            172.17.0.2           tcp dpt:8080

    Chain DOCKER-ISOLATION-STAGE-1 (1 references)
    num  target     prot opt source               destination
    1    DOCKER-ISOLATION-STAGE-2  0    --  0.0.0.0/0            0.0.0.0/0
    2    RETURN     0    --  0.0.0.0/0            0.0.0.0/0

    Chain DOCKER-ISOLATION-STAGE-2 (1 references)
    num  target     prot opt source               destination
    1    DROP       0    --  0.0.0.0/0            0.0.0.0/0
    2    RETURN     0    --  0.0.0.0/0            0.0.0.0/0

    Chain DOCKER-USER (1 references)
    num  target     prot opt source               destination
    1    ACCEPT     6    --  192.168.36.2         0.0.0.0/0            tcp dpt:8080
    2    DROP       6    --  192.168.36.0/24      0.0.0.0/0            tcp dpt:8080
    3    RETURN     0    --  0.0.0.0/0            0.0.0.0/0
    ```

---

### 3. ルールの永続化

- **背景:**
  - サーバー再起動後も設定が維持される必要があります。
  - iptables の設定はデフォルトでは再起動時にリセットされるため、永続化の仕組みが必要です。

- **対策例:**
  - 多くのディストリビューションでは、`iptables-save` や `iptables-persistent` などのツールを利用してルールを保存・復元できます。
  - サーバー再起動時に上記ルールが自動で適用されるよう、設定ファイルの保存やサービスの有効化を行いましょう。

    rootで`iptables-save > /etc/iptables/rules.v4`などなど、、、

---

### 4. 動作確認

- **実施方法:**
  - **eds-client1 (192.168.36.2)**
    実行例:
    ```bash
    curl http://192.168.36.1:8080
    ```
    → 正しい応答 `"Welcome to ITSC2024!!"` という内容が返ることを確認。

  - **eds-client2 (192.168.36.3)**
    実行例:
    ```bash
    curl http://192.168.36.1:8080
    ```
    → 接続が拒否され、 `"Couldn't connect to server"` と表示されることを確認。

## 採点基準

満点は`100点`です。

報告書を重視した採点をする。

- 制約を満たして、終了条件を満たしている
    - `50点`
    - `DOCKER Chain`のiptablesが変更されていない
    - 特定のDocker コンテナが 8080 ポートで直接応答している。
    - Dockerfileは変更されていない。
    - サーバー再起動後も設定が維持される
    - などなど

- 報告書に、原因究明に至るまでの過程と原因が明確に記述されている
    - `50点`
    - この報告書を書かせる理由は`なんか知らんけどiptablesリセットして、Dockerリスタートしたらいけた。`を防ぐためなので、DOCKER-USERなどの記載があるかをしっかりと確認する。その他の報告は緩くても良い
    - 報告書例
        ```
        # 前置き(略
        # 本題
        ## 発生していたトラブル
        - nginxとDockerのポート競合
        - タイポ2種
            - `~/app/package.json`の`serve.js`->`server.js`
            - `~/app/server.js`の ' -> `
        - Dockerとiptablesの問題
        ## 解決方法
        - `systemctl stop nginx`をした or nginxのポート設定を変更した
        - タイポ修正
        - https://docs.docker.jp/network/iptables.html
        ## 解決理由
        - ポート競合を解決したため。
        - タイポ修正したため。
        - `DOCKER-USER`、`https://docs.docker.jp/network/iptables.html`などの記載があれば良い。
        ```
    - 想定解法でなければこの限りではない。

- iptablesの冗長なルールや不要なルールが排除されていない。
    - １行につき `-30点`

## 講評

今回の問題は、**Docker と iptables、さらにタイピングミスによるエラーの解消**という、複数の要素が絡み合った内容でした。

- **Docker と iptables に関して：**
  「Docker iptables」で検索すればドキュメントが見つかるものの、実際に正しく解決できている回答は少なかった印象です。

- **タイピングミスによるエラーの解消について：**
  単純なタイピングミスが複数あり、１つ１つ解決していけばそこまで難しくなく、コンテナを起動させられるはずです。

- **全体の評価：**
  解決策自体はシンプルなものであるにもかかわらず、複数の原因があることでミスに繋がりやすい問題設定でした。配点は100点としましたが、実際に満点回答を出す参加者は少なく、100点問題だと油断しついつい気が緩むケースが目立った印象です。

想定よりも正解回答が少なかったため、150点問題にしても良かったかもと感じます。
また、部分点を細かく設定することで、参加者の努力を評価できるよう考慮すべきでした。
