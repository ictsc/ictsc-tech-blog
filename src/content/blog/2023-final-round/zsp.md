---
title: "ICTSC2023 本戦 問題解説: [ZSP] Dockerよ、返事して！"
description: "ICTSC2023 本戦 問題解説: Dockerよ、返事して！"
tags: [ICTSC2023,問題解説,サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/zsp"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

開発リーダーAさんは、複数人の開発者が単一のDockerデーモンを操作できるDockerの開発環境を構築しようと考えた。
Dockerクライアントからデーモンへの通信はHTTPソケットを使用する。  
Dockerデーモンが動作する`Server`とDocker CLIを用いてAPI経由で操作を行う`Client`を構築したが、うまくいかない。  
トラブルシュートを依頼されたため、解決してほしい。  
以下のコマンドでコンテナを実行し、解決したか確認してください。

```bash
user@Client$ docker run -dp 80:80 nginx
```

```bash
user@Client$ curl -Im 5 http://192.168.20.1/
```

## 前提条件

- Server, Client で適切な設定を行うことで本トラブルは解決する
  - Dockerデーモン：192.168.20.1
  - Dockerクライアント：192.168.20.2

## 制約

- インストール済みのソフトウェアをアンインストールしてはいけない

## 初期状態

クライアントPCから以下の実行結果が得られる

```bash
user@Client:~$ docker ps
Cannot connect to the Docker daemon at tcp://192.168.20.1:2375. Is the docker daemon running?
```

## 終了状態

クライアントPCから `curl -m 5 -I http://192.168.20.1/` をするとステータスコード200のレスポンスが返ってくる。

---

## 解説

### 原因

この問題は、以下２点の原因によりトラブルが発生しています。

- Dockerデーモンが動作する`Server`でオーバーライドされたユニットファイルの設定に間違いがある
- `Client`で作成されたコンテキストの設定が間違っている

これらの原因は以下に記すコマンド結果により確認することができます。

#### Dockerデーモンが動作する`Server`でオーバーライドされたユニットファイルの設定が間違っている

```bash
user@Server:~$ sudo systemctl status docker.service 
Warning: The unit file, source configuration file or drop-ins of docker.service changed on disk. Run 'systemctl daemon-reload' to reload units.
○ docker.service - Docker Application Container Engine
     Loaded: bad-setting (Reason: Unit docker.service has a bad unit file setting.)
    Drop-In: /etc/systemd/system/docker.service.d
             └─override.conf
     Active: inactive (dead)
TriggeredBy: ○ docker.socket
       Docs: https://docs.docker.com
```

#### `Client`で作成されたコンテキストの設定が間違っている

以下のコマンドにより、デフォルトで選択されているdockerコンテキストの内容を確認することができます。

```bash
user@Client:~$ docker context inspect ictsc 
[
    {
        "Name": "ictsc",
        "Metadata": {},
        "Endpoints": {
            "docker": {
                "Host": "tcp://192.168.20.1:2375",
                "SkipTLSVerify": true
            }
        },
        "TLSMaterial": {},
        "Storage": {
            "MetadataPath": "/home/user/.docker/contexts/meta/9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
            "TLSPath": "/home/user/.docker/contexts/tls/9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
        }
    }
]
```

問題文の初期状態でも記載されているが、`Server`でdockerデーモンが動作していないため以下の実行結果が得られます。

```bash
user@Client:~$ docker ps
Cannot connect to the Docker daemon at tcp://192.168.20.1:2375. Is the docker daemon running?
```

また、dockerデーモンを解決したとしてもTLSの検証を行う設定になっているため、以下の実行結果が得られます。

```bash
user@Client:~$ docker ps
error during connect: Get "https://192.168.20.1:2375/v1.24/containers/json": http: server gave HTTP response to HTTPS client
```

### 解決方法

#### Server

##### オーバーライドされたユニットファイルの修正

`/etc/systemd/system/docker.service.d/override.conf`にオーバーライドされたファイルが存在します。  
これを直接編集することも可能ですが、`systemctl edit`コマンドを使用することで編集完了後に`systemctl daemon-reload`相当の処理を自動で行ってくれるため、回答例ではこれを使用します。

```bash
user@Server:~$ sudo systemctl edit docker.service
```

```diff
  [Service]
+ ExecStart=
- ExecStart=/usr/bin/dockerd -H tcp://127.0.0.1:2376 --containerd=/run/containerd/containerd.sock
+ ExecStart=/usr/bin/dockerd -H tcp://192.168.20.1:2375 --containerd=/run/containerd/containerd.sock
```

編集完了後はデーモンを起動します。

```bash
user@Server:~$ sudo systemctl start docker.service
user@Server:~$ sudo systemctl status docker.service
● docker.service - Docker Application Container Engine
     Loaded: loaded (/lib/systemd/system/docker.service; enabled; vendor preset: enabled)
    Drop-In: /etc/systemd/system/docker.service.d
             └─override.conf
     Active: active (running) since Wed 2024-03-20 13:36:24 JST; 15s ago
TriggeredBy: ● docker.socket
       Docs: https://docs.docker.com
   Main PID: 1365 (dockerd)
      Tasks: 10
     Memory: 99.6M
        CPU: 318ms
     CGroup: /system.slice/docker.service
             └─1365 /usr/bin/dockerd -H tcp://192.168.20.1:2375 --containerd=/run/containerd/containerd
```

#### Client

##### dockerコンテキストの修正

`skip-tls-verify=false`に変更します。

```bash
docker context update ictsc --docker "host=tcp://192.168.20.1:2375,skip-tls-verify=false"
```

## 結果

以下のように、`Server`でnginxのコンテナイメージをプルし実行していることが分かります。

```bash
user@Client:~$ docker run -dp 80:80 nginx
Unable to find image 'nginx:latest' locally
latest: Pulling from library/nginx
8a1e25ce7c4f: Pull complete
e78b137be355: Pull complete
39fc875bd2b2: Pull complete
035788421403: Pull complete
87c3fb37cbf2: Pull complete
c5cdd1ce752d: Pull complete
33952c599532: Pull complete
Digest: sha256:6db391d1c0cfb30588ba0bf72ea999404f2764febf0f1f196acd5867ac7efa7e
Status: Downloaded newer image for nginx:latest
0683892d5b8544df2ade37b499da0701d609f4b7d8de2a7dc7070ed9bcf65e1b
```

また、`Client`からcurlを実行することで、ステータスコード200のレスポンスを確認することができます。

```
user@Client:~$ curl -Im 5 http://192.168.20.1/
HTTP/1.1 200 OK
Server: nginx/1.25.4
Date: Wed, 20 Mar 2024 05:41:57 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Wed, 14 Feb 2024 16:03:00 GMT
Connection: keep-alive
ETag: "65cce434-267"
Accept-Ranges: bytes
```

## 採点基準

- TLSへの対応は採点基準には含めない
- dockerの正常起動と200ステータスコードの確認：100点
- 報告書の記述漏れによる再現不可能：各-10点
  - 編集箇所
  - 実行コマンド
  - 実行結果
