---
title: "ICTSC2024 本戦 問題解説: [RJB] プロも苦す、Proxmox"
description: "ICTSC2024 本戦 問題解説: プロも苦す、Proxmox"
tags: [ICTSC2024,問題解説,サーバー関連]
pubDate: 2025-03-31T00:00:00
slug: "2025/03/31/ictsc2024final/rjb"
draft: false
renderer: "md"
sticky: false
---

# 問題文


## 概要

あなたは Proxmox で多くの Linux Bridge を作成するタスクを与えられました。めんどくさかったので後輩くんにこのタスクを押し付けたところ、後輩くんは手元の機材である`rjb-ubuntu`から Proxmox が動作する`pve`の Web UI にアクセスし、マウスをつかって作成するのもめんどくさいと考え、サッと`rjb-ubuntu`上で Terraform を実行することで、一気に Linux Bridge を作成しようと考えました。

しかし、後輩くんが`$ terraform apply`を実行すると、エラーが大量に出現してしまいます。何回か試してみると、`terraform.tfstate`にきちんと`pve`上にある Linux Bridge の状態が反映されていなかったり、意図した通りにブリッジが作成されていなかったりします。

このトラブルの原因を突き止めて、解決策と共に後輩くんに教えてあげましょう。

## 前提条件

- Terraform Provider`bpg/proxmox`を用いて Proxmox を操作する。
  - `bpg/proxmox`を使わずに Proxmox のリソースを操作することはできない。
  - `bpg/proxmox`以外のプロバイダーで Proxmox を操作してはならない。
- Proxmox を操作するプロバイダー以外は追加可能。
- 使用する.tf ファイルは`~/terraform`に配置されています。

## 初期状態

`rjb-ubuntu`上で`pve`のリソースを操作するため、`~/terraform`に移動、`$ terraform init`を実行した後、`$ terraform apply`を実行した際、以下のような問題が発生する。
- `$ terraform apply`実行後にエラーが出力される。
- `terraform.tfstate`に`pve`上の Linux Bridge の状態が反映されない。
- 作成されないブリッジがある。

## 終了状態

`rjb-ubuntu`上で Terraform を実行することにより、`pve`のリソースをエラーなしで操作できる。

---

## 解説

この問題はProxmoxとTerraformの仕様についての理解を問う問題でした。

TerraformはREST APIまたはSSHを通じてProxmoxを操作しますが、Terraformは高速で変更を反映させるために、デフォルトで10のリクエストを同時に送信します。これにより、並行して変更することが想定されていないようなリソースを操作する際には、トラブルが発生することがあります。

ProxmoxのLinux Bridgeを作成する際の処理に注目してみましょう。ProxmoxがLinux Bridgeを作成する際、/etc/network/interfaces.newに変更する内容を控えておき、ifreload -a を実行して、/etc/network/interfaces.newに書かれた内容を反映させます。

では、TerraformがLinux Bridgeを作成する際、どのような処理を行うのでしょうか。TerraformはLinux Bridgeの情報をProxmoxにPOSTで送った後、Linux Bridgeを作成するためのリクエスト(PUT)をProxmoxに送信します。Proxmoxは、Terraformからのリクエストを受け取った後、/etc/network/interfaces.newに変更する内容を控えますが、ifreload -a を実行する前にTerraformからのリクエストを受け取ってしまうと、TerraformがLinux Bridgeを作成するためのリクエストを送信している最中に、/etc/network/interfaces.newに書かれた内容が変更される現象が発生します。また、送信したLinux Bridgeの情報がすでに反映されてしまい、PUTリクエストを送信しても、ネットワークの変更点がないため、エラーが発生します。

このような現象を回避するため、Terraformが同時に送信するリクエストの数を減らすこととします。方法がいくつかありますが、最も簡単な方法は、`terraform apply`を実行する際に、`-parallelism`オプションを付けて実行することです。これにより、Terraformが同時に送信するリクエストの数を変更することができます。

```bash
$ terraform apply -parallelism=1
```

また、環境変数を設定することでも、同時に送信するリクエストの数を変更することができます。(https://developer.hashicorp.com/terraform/cloud-docs/workspaces/variables#parallelism)

また、作成するLinux Bridgeに依存関係を持たせて、Linux Bridgeを1つ作成してから次のLinux Bridgeを作成するようにすることでも、同時に送信するリクエストの数を減らすことができます。Terraformでは、`depends_on`を使うことで、リソース間の依存関係を定義することができます。

```hcl
resource "proxmox_virtual_environment_network_linux_bridge" "vmbr101" {
  name      = "vmbr101"
  node_name = "pve"
}

resource "proxmox_virtual_environment_network_linux_bridge" "vmbr102" {
  name       = "vmbr102"
  node_name  = "pve"
  depends_on = [proxmox_virtual_environment_network_linux_bridge.vmbr101]
}
# 以下、同様に続く
```

## 採点基準

- 何らかの方法で、並列度を下げ実行することで、エラーを回避しブリッジを作成する/削除することができる
    - 70%
- なぜ単純にTerraform applyを実行するとエラーが出るか書いている かつ 複数同時実行でエラーが出る理由に触れている
    - 30%

## 講評

Terraformの処理の特性を知っていないとなかなか気づけない問題だと思います。また、エラーコードもあまり親切ではないので、解決の糸口を見つけるのが難しかったかもしれません。
