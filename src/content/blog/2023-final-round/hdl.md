---
title: "ICTSC2023 本戦 問題解説: [HDL] Kubernetesクラスタを建てよう！"
description: "ICTSC2023 本戦 問題解説: Kubernetesクラスタを建てよう！"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/hdl"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

サークル内で、古のKubernetes構築スクリプトを発見した。  
「Docker入れたマシンでこれを動かせ」とあったが、DockerのCRIサポートは切れている。Containerdを入れるスクリプトは自分で書いて動かしてみたところ、エラーを吐いて止まってしまった。  
原因に心当たりが無いので、助けてほしい。

## 前提条件

- 回答内で許可されるアクション
  - userユーザーのホームディレクトリ直下にある`k8s_install.sh`の編集・実行
- 回答内で許可されないアクション
  - 上記以外の全てのアクション
- `k8s_install.sh`内で許可されないアクション
  - apt以外からのkubernetesコンポーネントのインストール
  - kubeadm以外のディストリビューションを使用したKubernetesクラスタ構築
- その他
  - できるだけ編集距離が少ない解答をして下さい
    - 想定解法の編集行数・ファイル数を大きく超えた編集を行っている場合、編集量に応じた減点をします

## 初期状態

userユーザーのホームディレクトリ直下にある `k8s_install.sh` を実行しても、失敗する もしくは 下記の終了状態を満たしたクラスタが起動しない。

## 終了状態

userユーザーのホームディレクトリ直下にある `k8s_install.sh` を実行すると正常に終了し、以下の条件を満たしたクラスタが起動する。

- Kubernetesの最新マイナーバージョン (1.29) が使用されている
- Kubeadmによって作成された基本リソースと、Flannelに必要なリソースが過不足なく存在している
- 作成された全てのPodが、再起動を繰り返さず安定して起動している
- userユーザーによるkubectlのあらゆる操作が可能である
- **Tolerationを設定していない任意のPodを追加し、起動することができる**

(太字部分は競技中に追加した条件です。)

## 接続情報

| ホスト名       | IPアドレス   | ユーザ | パスワード |
| -------------- | ------------ | ------ | ---------- |
| problem-hdl-vm | 192.168.13.1 | user   | ictsc      |

---

## 解説

4箇所の修正が必要

### Answer 1: Kubernetes aptリポジトリの変更

<https://kubernetes.io/blog/2023/08/31/legacy-package-repository-deprecation/#can-i-continue-to-use-the-legacy-package-repositories>

最近Kubernetesのaptリポジトリがコミュニティ運営のものに移行された。  
その過程でGoogleがホストしていたレガシーリポジトリは2023年9月に凍結 (アップデートの提供無し)、2024年2月末で削除されたので、aptリポジトリがNot Foundと出る。

新しく設置された、コミュニティ運営のリポジトリ (`https://pkgs.k8s.io/`) に置き換えれば解決する。  
<https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#installing-kubeadm-kubelet-and-kubectl>

### Answer 2: taintの修正

Kubernetes v1.20で `node-role.kubernetes.io/master` は非推奨となり (現在は削除)、代わりに `node-role.kubernetes.io/control-plane`が使われるようになった。

外すtaintを書き換えるだけ。  
<https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#control-plane-node-isolation>

### Answer 3: cgroupの設定

cgroupドライバーにはv1 (cgroupfs) とv2 (systemd) が存在しており、kubeadmはv2を使ってコンテナを建てようとするがcontainerdはデフォルトでv1を使う。  
詳しい仕組みはわからないが結果としてKubernetesに関連する全てのコンテナが不安定に再起動を繰り返すことになる。  
このせいでkube-api-serverすらも再起動を繰り返すため、kubectlによるリクエストも通ったり通らなかったりを繰り返してしまい、これが混乱の原因になっている。

下記ページに従ってcontainerdのcgroupをv2に書き換えると解決する。  
<https://kubernetes.io/docs/setup/production-environment/container-runtimes/#containerd-systemd>  

### Answer 4: Pod CIDRの割り当て

<https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md>  
kubeadmで建てたクラスタ上でFlannelを使うためには、Pod CIDRをkubeadmに対して指定しないといけない。  
`NOTE: If kubeadm is used, then pass --pod-network-cidr=10.244.0.0/16 to kubeadm init to ensure that the podCIDR is set.` の通り。  
ログにもPod CIDRを設定しろと出るのでわかるはず。

`kubeadm init` 時にフラグで渡すことによって解決。

### 任意回答: sandbox_imageのバージョンを変更

kubeadmのドキュメントによって推奨されている操作  
<https://kubernetes.io/docs/setup/production-environment/container-runtimes/#override-pause-image-containerd>  
containerdのpause imageのバージョンを最新バージョンにするというもの。

推奨されている操作ではあるが無くても動くため、これに関してはあっても無くても正解とする。

## 想定解法

`/home/user/k8s_install.sh`を以下のように変更

```sh
#!/bin/sh -e

sudo swapoff -a

cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf >/dev/null
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf >/dev/null
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system

sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu jammy stable" |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y containerd.io

mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml >/dev/null

# Answer 3: cgroupの設定
sudo sed -i -e 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

# 任意回答: sandbox_imageのバージョンを変更
sudo sed -i -e 's/sandbox_image = "registry.k8s.io\/pause:3.6/sandbox_image = "registry.k8s.io\/pause:3.9/g' /etc/containerd/config.toml

sudo systemctl restart containerd

curl -LO https://github.com/containerd/nerdctl/releases/download/v1.7.2/nerdctl-1.7.2-linux-amd64.tar.gz
sudo tar Cxzf /usr/local/bin nerdctl-1.7.2-linux-amd64.tar.gz
rm nerdctl-1.7.2-linux-amd64.tar.gz

# Answer 1: Kubernetes aptリポジトリの変更
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' |
  sudo tee /etc/apt/sources.list.d/kubernetes.list >/dev/null

sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

sudo kubeadm reset -f
# Answer 4: Pod CIDRの割り当て
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

mkdir -p "$HOME"/.kube
sudo cp -f /etc/kubernetes/admin.conf "$HOME"/.kube/config
sudo chown user:user "$HOME"/.kube/config

# Answer 2: taintの修正
kubectl --request-timeout 10s taint nodes --all node-role.kubernetes.io/control-plane-

kubectl --request-timeout 10s apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

## 採点基準

250点満点  
前提条件を破っていたら問答無用で0点

### Answer 1: Kubernetes aptリポジトリの変更

50点

### Answer 2: taintの修正

50点

### Answer 3: cgroupの設定

100点

### Answer 4: Pod CIDRの割り当て

50点

### 具体的な採点の流れ

- とりあえずAnswer1〜4があるかどうかを確認し、部分点を足して仮合計点を出す
  - この時、それぞれ模範解答 + 2行までの編集距離であれば正答とする。それ以上の編集距離の場合そこの部分点は獲得できない。
- 仮の合計点を出した後、余計な編集操作を何個書いているかで%の減点処理をする
  - 余計な編集操作 = Answer1〜4と任意回答以外の編集操作
  - 編集内容が間違っていても、Answer1～4・任意解答に該当する部分を編集していたらそのAnswer・任意解答にかかわる編集操作とカウントし、減点対象とはしない
  - sleepなど、直接作用を与えないコマンドは余計な編集操作とはみなさないこととする
  - 0個
    - 獲得点の100%
  - 1個
    - 獲得点の50%
  - 2個以上
    - 獲得点の20%

## 講評

Kubernetes問題なのに、Kubernetesを扱うのではなくKubernetesを建てるという中々面白い問題になったのではと思います。  
元々は、旧Kubernetes aptリポジトリの削除が2024年の2月末に行われてとてもタイムリーな話題だったので、出したいな～という思いから始まった問題です。

cgroupの設定に関しては、そもそも問題が起こっていることに気づけてないチームが多く、非常に共感しながら採点をしておりました。  
コンテナの状態が不安定になるだけなので、一瞬を切り取ったら正常に建ってるように見えるんですよね...  
kube-apiserverに断続的に繋がらなくなることや、異常にPodのRestart数が多いことなどで判別して欲しかったところです。  
ここの部分に関しては完全に経験値が問われる問題だったと思います。
