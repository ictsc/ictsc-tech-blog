---
title: "ICTSC2023 本戦 問題解説: [WOL] 届かぬPodのラブコール"
description: "ICTSC2023 本戦 問題解説: 届かぬPodのラブコール"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/wol"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

「初めてKubernetesのクラスタを構築してみたので、ちゃんと構築できたか確認するために、トラコン先輩に作ってもらった簡易的な通信確認のマニフェストをデプロイしてみた。PodとかServiceとかちゃんと立ったから大丈夫かなと思っていたら、Podが再起動を繰り返してしまった」という報告が後輩からあった。  
トラコン先輩にちょっと聞いてみても「いや俺の手元のクラスタではちゃんと動いたけどなぁ」と首をかしげるばかり。卒論発表で忙しいらしく、これ以上頼るのは難しそうだ。  
K8s初心者の後輩のため、ここは僕がトラコン先輩の代わりに威厳を見せてやらないと！

あと、トラコン先輩のクラスタでそのマニフェストが動いたのも謎だ…。  
トラコン先輩にお願いしてクラスタの情報を出力してもらったから、これを使って何とか原因を突き止めなくては！

## 前提条件

- 回答内で許可されるアクション
  - userユーザーのホームディレクトリ直下にある `manifests` フォルダ内のファイル群の編集
  - 同ファイル群の `kubectl apply` コマンドによる適用
- 回答内で許可されないアクション
  - 上記以外の全てのアクション
  - **各deploymentのconainers以下のspecの編集**
  - **client-configmap.yamlの編集**

(太字部分は競技中に追加した条件です。)

## 初期状態

`kubectl get pods` で得られるPod一覧で、`client-deployment` というprefixがついたPod3台が以下のいずれかの状態になっている

- 再起動を繰り返している
- `CrashLoopBackOff` 状態になっている

## 終了状態

`kubectl get pods` で得られるPod一覧で、`client-deployment` というprefixがついたPod3台が全て正常に起動している  
(1分以上起動し続けていれば、正常に起動しているという扱いとする)

## 回答に関して

- トラブルへの対処に関する回答は、2通りの方法を記入してください
  - 同じkindのリソースを変更する回答は、同じ方法とみなします
- 回答では、上記2通りの方法を記入した続きに、なぜトラコン先輩のクラスタでこのマニフェストが正常に動いたのか考察し、記入してください
  - クラスタのKubernetesバージョンについて、必ず回答中で触れて下さい
  - トラコン先輩からもらったクラスタ情報は以下の通りです。

```
tracon@tracon-control-plane:~$ kubectl version
Client Version: v1.29.0
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.29.0

tracon@tracon-control-plane:~$ kubectl get nodes --show-labels
NAME                   STATUS   ROLES           AGE   VERSION   LABELS
tracon-control-plane   Ready    control-plane   26d   v1.29.0   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=tracon-control-plane,kubernetes.io/os=linux,node-role.kubernetes.io/control-plane=,node.kubernetes.io/exclude-from-external-load-balancers=
tracon-worker-01       Ready    <none>          26d   v1.29.0   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=tracon-worker-01,kubernetes.io/os=linux,worker-id=1
tracon-worker-02       Ready    <none>          26d   v1.29.0   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,kubernetes.io/arch=amd64,kubernetes.io/hostname=tracon-worker-02,kubernetes.io/os=linux,worker-id=2

tracon@tracon-control-plane:~$ kubectl get pods -n default -o wide
NAME                                 READY   STATUS    RESTARTS   AGE     IP           NODE               NOMINATED NODE   READINESS GATES
client-deployment-64fd5596b7-5vhxk   1/1     Running   0          7m      10.0.1.53    tracon-worker-02   <none>           <none>
client-deployment-64fd5596b7-c55xm   1/1     Running   0          5m59s   10.0.1.251   tracon-worker-02   <none>           <none>
client-deployment-64fd5596b7-xc9fd   1/1     Running   0          6m30s   10.0.1.85    tracon-worker-02   <none>           <none>
server-deployment-64d98cddbf-444lg   1/1     Running   0          5m25s   10.0.2.107   tracon-worker-01   <none>           <none>
server-deployment-64d98cddbf-8s2lf   1/1     Running   0          5m28s   10.0.2.225   tracon-worker-01   <none>           <none>
server-deployment-64d98cddbf-bng7s   1/1     Running   0          5m26s   10.0.2.170   tracon-worker-01   <none>           <none>

tracon@tracon-control-plane:~$ kubectl get pod -A -o 'custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,PHASE:.status.phase,IMAGE:.spec.containers[*].image'
NAMESPACE     NAME                                           PHASE     IMAGE
default       client-deployment-64fd5596b7-5vhxk             Running   curlimages/curl:8.5.0
default       client-deployment-64fd5596b7-c55xm             Running   curlimages/curl:8.5.0
default       client-deployment-64fd5596b7-xc9fd             Running   curlimages/curl:8.5.0
default       server-deployment-64d98cddbf-444lg             Running   caddy:2.7.6
default       server-deployment-64d98cddbf-8s2lf             Running   caddy:2.7.6
default       server-deployment-64d98cddbf-bng7s             Running   caddy:2.7.6
kube-system   cilium-j9j89                                   Running   quay.io/cilium/cilium:v1.12.17@sha256:323e5762a2412e4f274c34ffb655d57b439d3c057ada48167f8aa038729c1661
kube-system   cilium-operator-68757d4d44-jf2th               Running   quay.io/cilium/operator-generic:v1.12.17@sha256:17a1b1cbc38bcce00fd4d793c7b6ab630fdaaa464d53e05967625c7b7306730d
kube-system   cilium-operator-68757d4d44-jnxwn               Running   quay.io/cilium/operator-generic:v1.12.17@sha256:17a1b1cbc38bcce00fd4d793c7b6ab630fdaaa464d53e05967625c7b7306730d
kube-system   cilium-r2npg                                   Running   quay.io/cilium/cilium:v1.12.17@sha256:323e5762a2412e4f274c34ffb655d57b439d3c057ada48167f8aa038729c1661
kube-system   cilium-rvm4h                                   Running   quay.io/cilium/cilium:v1.12.17@sha256:323e5762a2412e4f274c34ffb655d57b439d3c057ada48167f8aa038729c1661
kube-system   coredns-76f75df574-8l5h2                       Running   registry.k8s.io/coredns/coredns:v1.11.1
kube-system   coredns-76f75df574-pzmdz                       Running   registry.k8s.io/coredns/coredns:v1.11.1
kube-system   etcd-tracon-control-plane                      Running   registry.k8s.io/etcd:3.5.10-0
kube-system   kube-apiserver-tracon-control-plane            Running   registry.k8s.io/kube-apiserver:v1.29.0
kube-system   kube-controller-manager-tracon-control-plane   Running   registry.k8s.io/kube-controller-manager:v1.29.0
kube-system   kube-scheduler-tracon-control-plane            Running   registry.k8s.io/kube-scheduler:v1.29.0
```

## 接続情報

| ホスト名       | IPアドレス   | ユーザ | パスワード |
| -------------- | ------------ | ------ | ---------- |
| problem-wol-vm | 192.168.14.1 | user   | ictsc      |

---

## 解説

原因はService Internal Traffic Policy  
<https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/>

これをLocalにするとServiceにアクセスするとき、同じNode内のPodしかアクセス先の候補に入らなくなる  
今回はnodeSelectorでclientとserverのPodを別のNodeに配置していたため、`internalTrafficPolicy: Local` と設定されたserviceはどのserverのPodのIPアドレスも返さなくなる

## 想定解法

### 1つ目の方法

- Serviceの `internalTrafficPolicy: Local` を消す もしくは `Cluster` にする

### 2つ目の方法

以下のいずれか

- nodeSelectorを変更し、片方に全てのPodを寄せる
- nodeSelectorを消し、Pod Topology Spread Constraintsを使ってPodをばらけさせる
  - Selectorを消すだけだと運任せなので減点

なお、上記二つ以外でも解けるが、実際にそうしてみて動いたらOKとして良い

### 先輩のクラスタで動いた原因

- CNIとしてCiliumを使用していた
- Ciliumのkube-proxy置き換えデプロイ (Kuberenetes without kube-proxy) をしていた
  - Ciliumにはkube-proxyとの共存モードもあるので、ここに言及していないと正確な説明にはならない
- Cliliumのバージョンが1.13未満だった

`internalTrafficPolicy` はkube-proxyに実装された機能なので、Kubernetesのバージョンが `internalTrafficPolicy` 実装後のバージョンでも、kube-proxyを使わければ回避できる

<https://isovalent.com/videos/cilium-internal-traffic-policy/>  
Ciliumは1.13で `internalTrafficPolicy` に対応した  
Ciliumでkube-proxy置き換えデプロイをしている場合、Cilium 1.13未満だと `internalTrafficPolicy: Local` は無効として扱われる

Kubernetesのバージョンに触れて欲しいと書いたのは、Kuberentesがv1.29.0 (Service Internal Traffic Policyが有効なバージョン) なのにそれが効いていないという事に注目してほしいという思惑だが、恐らく↑がわかっている人ならわかっている。

## 採点基準

300点満点  
前提条件を破っていたら問答無用で0点

### 1つ目の方法

50点

### 2つ目の方法

50点

### 先輩のクラスタで動いた原因

200点満点  
Kubernetesのバージョンについて一言も入っていなければ0点

- **Ciliumのkube-proxy置き換えデプロイ (Kuberenetes without kube-proxy) をしている**(ため、kube-proxyが消えその役割をCiliumが担っている)　ことについて言及している
  - 100点
- **Cliliumのバージョンが1.13未満だったため、Service Internal Traffic Policyが実装されていない**(ことでService Internal Traffic Policy設定が無視された)　ことについて言及している
  - 100点

## 講評

かなり意地悪な問題だったかもしれませんが、完全回答は2チームのみとサーバー側のボス問題 (300点問題) の役割は果たせたかなと思います。

この問題、Kubernetesを少し勉強した人であれば、ServiceのManifestを見て違和感を覚えたり、なんとなく理解したりするのは意外と簡単だったと思います。  
実技部分だけ取ろうと思えばサッと取れますが、その後の文章題に関してはService Internal Traffic PolicyとKubernetesのネットワークをきちんと理解していないと完答が難しい、というICTSCの中では異様な問題だったのではないでしょうか。

「Cilium Service Internal Traffic Policy」と調べるとCilium v1.13でのInternal Traffic Policy対応についてかなり上の方で出てくるため、そちらは答えられていたチームが完答チーム以外に3チームほどありました。  
これらのチームはkube-proxyの置き換えについて触れておらず部分点となってしまっており、もったいない...と思いながら採点しておりました。

Cilium、技術的に面白い試みを多くしているCNIですので、是非皆さんも調べてみて下さい！
