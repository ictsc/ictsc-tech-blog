---
title: "ICTSC2023 本戦 問題解説: [ZGT] だいなみっく・あんしぶる"
description: "ICTSC2023 本戦 問題解説: だいなみっく・あんしぶる"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/zgt"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

トラコン先輩が「TerraformとAnsibleを繋げて、仮想マシンの構築とそのプロビジョニングを同時に行う」という面白そうなことをやっていたので、真似してやってみることにした。  
Terraformのマシンの構築までは完璧にできたんだけど、Ansibleがどうしても上手く動かない。ホストがマッチしないってどういうこと？

## 前提条件

- 回答内で許可されるアクション
  - userユーザーのホームディレクトリにあるファイルの編集
    - ただし、`/home/user/ansible/playbook.yaml` を除く
  - `/home/user/ansible` ディレクトリでの `ansible-playbook playbook.yaml` の実行
- 回答内で許可されないアクション
  - 上記以外の全てのアクション
- その他
  - できるだけ編集距離が少ない解答をして下さい
    - 想定解法の編集行数・ファイル数を大きく超えた編集を行っている場合、編集量に応じた減点をします
  - tfstateの値を参照しない方針の解答は無効とします
  - 「Terraformで建てた」と問題中に書かれている仮想マシンは、問題VM中ではSSHでログイン可能なDockerコンテナの形で再現されています

## 初期状態

`/home/user/ansible` ディレクトリで `ansible-playbook playbook.yaml` を実行しても、エラーが起こって失敗する。

## 終了状態

`/home/user/ansible` ディレクトリで `ansible-playbook playbook.yaml` を実行すると、成功する。  
また実行したことによって、`problem-zgt-vm` 上からアクセスできる以下の仮想マシンの`/ips` ファイルに、それぞれ以下の書き込みがされている。

- `192.168.255.164`

  - ```
    Current Empty IP Address: 192.168.255.169
    ```

- `192.168.255.165`

  - ```
    My IP Address: 192.168.255.165
    Another Member IP Address: 192.168.255.166
    ```

- `192.168.255.166`

  - ```
    My IP Address: 192.168.255.166
    Another Member IP Address: 192.168.255.165
    ```

- `192.168.255.167`

  - ```
      My IP Address: 192.168.255.167
      Another Member IP Address: 192.168.255.168
      ```

- `192.168.255.168`

  - ```
      My IP Address: 192.168.255.168
      Another Member IP Address: 192.168.255.167
      ```

## 接続情報

| ホスト名       | IPアドレス   | ユーザ | パスワード |
| -------------- | ------------ | ------ | ---------- |
| problem-zgt-vm | 192.168.25.1 | user   | ictsc      |

--- 

## 解説

AnsibleのDynamic Inventoryを利用した問題。  
<https://docs.ansible.com/ansible/2.9_ja/user_guide/intro_dynamic_inventory.html>

Dynamic Inventoryは、定められた形式のJSONデータを吐く実行可能ファイルをインベントリファイルとして指定できるという機能。  
今回は `/home/user/ansible/inventory.js` にJavaScriptで書いている。  
これを、正しい形式かつ値の抜けが無いJSONを吐くように修正すればOK。

一応想定解法は以下の通りだが、これ以外にもとりあえず正しいJSONを吐けば正解とする。  
目的のJSONは以下 (`ansible_ssh_private_key_file` は違くても、キーを参照できれば良い)

```json
{
  "_meta": {
    "hostvars": {
      "192.168.255.164": {
        "empty_address": "192.168.255.169"
      },
      "192.168.255.165": {
        "self_address": "192.168.255.165",
        "another_address": "192.168.255.166"
      },
      "192.168.255.166": {
        "self_address": "192.168.255.166",
        "another_address": "192.168.255.165"
      },
      "192.168.255.167": {
        "self_address": "192.168.255.167",
        "another_address": "192.168.255.168"
      },
      "192.168.255.168": {
        "self_address": "192.168.255.168",
        "another_address": "192.168.255.167"
      }
    }
  },
  "central": {
    "hosts": [
      "192.168.255.164"
    ]
  },
  "group_a": {
    "hosts": [
      "192.168.255.165",
      "192.168.255.166"
    ]
  },
  "group_b": {
    "hosts": [
      "192.168.255.167",
      "192.168.255.168"
    ]
  },
  "all": {
    "vars": {
      "ansible_user": "ubuntu",
      "ansible_ssh_private_key_file": "../id_rsa"
    }
  }
}
```

## 想定解法

### switchでbreakしていない

JavaScriptのswitchはbreakしないとその後の評価式がすべて評価されてしまう。
今回の場合は、全てdefaultに当たってreturnされる。

breakを全てのcaseに書く。

```diff
    switch (key) {
      case "central_ip_address":
        hostGroup = "central"
+       break

      case "group_a_ip_address":
        hostGroup = "group_a"
+       break

      case "group_b_ip_address":
        hostGroup = "group_b"
+       break

      default:
        return
    }
```

### 変数名のフィールド参照が正しくできていない

`object.変数名` ではなく、`object[変数名]` としないと、変数の中身が展開されない。  
3箇所修正する。

```diff
26c29
-   inventory.hostGroup = { host: [] }
---
+   inventory[hostGroup] = { hosts: [] }
30c33
-     inventory.hostGroup.host.push(ip)
---
+     inventory[hostGroup].hosts.push(ip)
35c38
-           ip: {
---
+           [ip]: {
```

### inventory._meta.hostvars が上書きされている

`inventory._meta` に対して、別オブジェクトを浅いマージ (shallow merge) しているため、`hostvars` のフィールドが完全に上書きされてしまっている。  
他のバグに比べて気づきにくいと思う。

deep mergeするか、`inventory._meta.hostvars` をマージすればよい。

```diff
44,53c47,54
-     inventory._meta = Object.assign(inventory._meta, {
-       hostvars: {
-         [ipAddresses[0]]: {
-           self_address: ipAddresses[0],
-           another_address: ipAddresses[1],
-         },
-         [ipAddresses[1]]: {
-           self_address: ipAddresses[1],
-           another_address: ipAddresses[0],
-         },
---
+     inventory._meta.hostvars = Object.assign(inventory._meta.hostvars, {
+       [ipAddresses[0]]: {
+         self_address: ipAddresses[0],
+         another_address: ipAddresses[1],
+       },
+       [ipAddresses[1]]: {
+         self_address: ipAddresses[1],
+         another_address: ipAddresses[0],
```

### ansible_ssh_private_key_fileの指定が違う

`home/user/id_rsa` を指定する必要アリ。  

何らかの形でパスを指定するか、`home/user/id_rsa` を `home/user/ansible` に移せばOK (ファイル移動は減点アリ)。

```diff
-   vars: { ansible_user: "ubuntu", ansible_ssh_private_key_file: "id_rsa" },
+   vars: { ansible_user: "ubuntu", ansible_ssh_private_key_file: "../id_rsa" },
```

## 採点基準

150点満点  
前提条件を破っていたら問答無用で0点

inventoryスクリプトがtfstateを参照した上で上記のJSONを正しく吐き、Ansibleが実行ができればOKとする

### 減点

最短編集距離は-10行、+8行 (フォーマッティングなし) なことを踏まえ

- 1ファイル、+-20行まで
  - 獲得点の100%
- 2ファイル or +-どちらかもしくはどちらもが20～40行
  - 獲得点の50%
- 3ファイル以上 or +-どちらかもしくはどちらもが40行以上
  - 獲得点の20%

## 講評

TerraformとAnsibleが出て来るのに、蓋を開けてみればただのJavaScript問題という、ちょっとしたひっかけ要素を入れてみた問題です。  
「最少編集距離」という言葉に対してかなり厳しい減点方式を取り入れており、ここまでやる必要あるかな...と自分ながら思っておりましたが、ほとんどのチームがほぼ想定解法と同じような修正を送ってきてくれました。

Dynamic Inventoryは、ICTSCのKubernetesクラスタ構築でかなり重宝している機能ですので、皆さんも是非使ってみてはいかがでしょうか。  
<https://github.com/ictsc/ictsc-drove/blob/main/ansible/inventory/inventory_handler.py>
