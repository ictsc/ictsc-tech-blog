---
title: "ICTSC2024 二次予選 問題解説: [ISI] Welcome to Kubernetes"
description: "ICTSC2024 二次予選 問題解説: Welcome to Kubernetes"
tags: [ICTSC2024,問題解説]
pubDate: 2024-12-14T12:00:00
slug: "2024/12/14/ictsc2024pr/isi"
draft: false
renderer: "md"
sticky: false
---

# 問題文

あなたは、新卒でとあるプロジェクトに配属されてしまいました。
このプロジェクトでは、Kubernetesを導入を試みていますが苦戦している様です。
- 社員Aからは、Kubernetesクラスタはデプロイできたものの、社内レジストリからイメージをpullすることができないとのことです。
- 社員Bからは、KubernetesクラスタにPodをデプロイできたものの、podから社内サービス（docker-registry）に疎通ができないそうです。

このことを踏まえ、社内のDocker Registryに検証用のimageが作成されました。
状況を整理し、検証imageが正しく利用できるようなKubernetesクラスタを構成してください。

- **補足: 検証image（`docker-registry.hideichi.as.a.service.com/someapp:latest`）**
  - 社内サービス（docker-registry）に疎通が取れないとの問い合わせを元に作成された検証用イメージです。
  - クラスタにデプロイされると、社内サービス（docker-registry）に疎通できるか、確認ための簡単な検証を実行します。
  - クラスタ構成が正しく行われれば、正常に終了します。

### **社内のコンポーネント構成図**

社内は、このような環境になっています:

![](/images/2024-pre-round-2nd/isi.png)

| Name            | IP            | Domain                                    |
| --------------- | ------------- | ----------------------------------------- |
| CoreDNS         | 10.244.10.130 | coredns.hideichi.as.a.service.com         |
| Docker Registry | 10.233.90.120 | docker-registry.hideichi.as.a.service.com |

- 各コンポーネントの説明
  - Docker Registry: 社内で動作するプライベートなDocker Registryです。以下のコマンドで確認することができます。
    ```
    curl -X GET http://docker-registry.hideichi.as.a.service.com/v2/_catalog
    ```
  - CoreDNS: 社内のDNSサーバです。
  - 検証用VM: 検証用VM == node1です。貴方のプロジェクト先で唯一自由に操作できる検証環境です。

### **検証VMについて**
- 検証用VMには、userユーザからKubesprayでクラスタがデプロイ済みです。
  - userユーザに共通パスワードで入れます。
  - `/home/user/kubespray/`にKubesprayが用意されています。
  - `/home/user/kubespray/inventory/mycluster`が検証のクラスタ設定です。
  - クラスタを作った先駆者のメモが用意されています
    ```
    # めも

    ## kubesprayを使うために
    cd /home/user/kubespray && \
    python3 -m venv venv && \
    source venv/bin/activate

    ## kubesprayを流す
    ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root --ask-pass --ask-become-pass cluster.yml

    たまーにこけるが一回やり直すとよき

    ## kubectlはこれを使うと良き
    /home/user/kubespray/inventory/mycluster/artifacts/kubectl.sh

    ## 作成したクラスタがうまくいくか簡単なチェック
    ./kubectl.sh create deployment nginx --image=nginx:latest
    これは普通にうごく

    ## 検証用image。これは動くようなクラスタに構成できれば解決する
    ./kubectl.sh create job someapp --image=docker-registry.hideichi.as.a.service.com/someapp:latest
    こいつは動かない

    ## 一旦クラスタresetする？
    ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root --ask-pass --ask-become-pass reset.yml

      ```

## 前提条件
- 検証用VM(node1)しか操作してはいけません。
- Kubernetesの構築には、[Kubespray](https://github.com/kubernetes-sigs/kubespray)を利用する必要があります。
  - 最終成果物として`/home/user/kubespray/`のマニフェストのみを変更する必要があります。

## 初期状態
- docker-registry.hideichi.as.a.service.comからimageをpullする事ができない。
  - `./kubectl.sh create job someapp --image=docker-registry.hideichi.as.a.service.com/someapp:latest`をした際にJobが完了しない
    ```
    ./kubectl.sh get jobs
    NAME      STATUS    COMPLETIONS   DURATION   AGE
    someapp   Running   0/1           36s        36s
    ```
    - Podが`ErrImagePull` or `ImagePullBackOff`である
      ```
      ./kubectl.sh get pods
      NAME            READY   STATUS         RESTARTS   AGE
      someapp-d79qq   0/1     ErrImagePull   0          62s
      ```

## 終了状態
- `docker-registry.hideichi.as.a.service.com/someapp:latest`をpullできて、正常に動作させる事ができる
  - `./kubectl.sh create job someapp --image=docker-registry.hideichi.as.a.service.com/someapp:latest`をした際に、imageをpullしてPodが動作して、正常に完了する(exitCodeは0である)。
    ```
    ./kubectl.sh get job
    NAME      STATUS     COMPLETIONS   DURATION   AGE
    someapp   Complete   1/1           4s         14s
    ```

    ```
    ./kubectl.sh get pods <someapp_pods_name> -oyaml | yq ".status.containerStatuses[].state.terminated.exitCode"
    0
    ```


# 解説

この問題は三つの課題から成り立っています。

* KubernetesのPodが割り当てられているCIDRと社内サービスのIPが衝突していて、Podから疎通ができない。
  * k8s-cluster.ymlの`kube_service_addresses`と`kube_pods_subnet`を設定し直す事で解決します。
* PodがImagePullBackOffになる。
  * 社内DockerRegistryはhttpでしか対応していません。一方でkubesprayはデフォルトでcontainerdを使用していて、httpsを利用するので別途設定をする必要があります。containerd.ymlのcontainerd_registries_mirrorsに設定を追記する事で解消できます。
* Kubernetes上に構築したPodが社内のDNSを参照しません。
  * Kubesprayのupstream_dns_serversを設定する事で解決します。
