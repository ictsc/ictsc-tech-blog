---
title: "ICTSC2026 一次予選 問題解説: 問38"
description: "ICTSC2026 一次予選 問題解説: 問38"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/cqn"
draft: false
renderer: "md"
sticky: false
---

## 問38

Ansibleで以下のように `hosts.yml` が設定されています。

```yaml
all:
  vars:
    VAR_A: "all"

  children:
    webservers:
      vars:
        VAR_A: "webservers"

      hosts:
        web01:
          ansible_host: 192.168.10.10

        web02:
          ansible_host: 192.168.10.20
          VAR_A: "web02"
```

以下のコマンドを実行しました。

```bash
ansible -i hosts.yml all -m debug -a "var=VAR_A"
```

このとき表示される `VAR_A` の値の組み合わせとして、最も適切なものを1つ選びなさい。

|     | web01        | web02        |
| --- | ------------ | ------------ |
| A   | `all`        | `web02`      |
| B   | `webservers` | `webservers` |
| C   | `webservers` | `web02`      |
| D   | `all`        | `webservers` |

### 選択肢（択一選択）

1. A
2. B
3. C
4. D

### 正解

3

### 解説

Ansibleにおいて今回のように同じインベントリファイル内で同名の変数が定義されている場合、より具体的な対象に定義された変数が優先される。
つまり子グループの変数は親グループの変数より優先され、ホストに直接定義された変数はグループ変数より優先されることになる。

この`hosts.yml`での`VAR_A`の優先順位は、以下の通りである。左側ほど優先順位が高い。

```text
ホストに直接定義された変数 > webserversのグループ変数 > allのグループ変数
```

`webservers`は`all`の子グループであり、`web01`と`web02`はどちらも`webservers`に所属している。それぞれのホストで採用される値は以下の通りである。

| ホスト | 値の決定過程 | 表示される`VAR_A` |
| --- | --- | --- |
| `web01` | `all`グループの値`"all"`より、子グループ`webservers`の値`"webservers"`が優先される。 | `webservers` |
| `web02` | グループ変数より、ホスト自身に定義された値`"web02"`が優先される。 | `web02` |

なお、実行コマンドの`all`は実行対象のホストを指定することを意味する引数であり、インベントリ内での変数評価には関係がない。
`-m debug -a "var=VAR_A"`によって、各ホストで上記の優先順位に従って決定された`VAR_A`の値が表示される。

したがって、`web01`は`webservers`、`web02`は`web02`となり、組み合わせはCである。正答は **3** である。
