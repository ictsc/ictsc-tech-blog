---
title: "ICTSC2025 二次予選 問題解説: 眠れない夜"
description: "ICTSC2025 二次予選 問題解説: 眠れない夜"
tags: ["ICTSC2025", "問題解説"]
pubDate: 2025-12-27T08:40:03.392Z
slug: "2025/12/27/ictsc2025pr2/lil"
draft: false
renderer: "md"
sticky: false
---

## 概要

あなたは、Webサービスのインフラを管理するエンジニアです。

今日も仕事を終え、綺麗な夜空を眺めながら帰路についていると上司から緊急の電話がかかってきました。明日までにデプロイ予定のWebアプリケーションの担当者が急病で作業不能になってしまったとのことです。

前任者の作業メモによると、アプリケーションはKubernetes上で稼働させる予定でしたが、現在は正常に動作していません。  
あなたはこのアプリケーションを稼働させ、利用可能な状態にする必要があります。

調査と復旧対応を行ってください。

## 前提条件

- `kube-system` Namespace内及びCluster-wideなリソースについては変更不可
  - ただし、調査、修正のために一時的に変更を加えることは許可します。
  - また、コントローラ等によって自動で再作成されるリソースは、調査、修正のために削除して構いません。
- 与えられるログイン情報はserver-02のみ
  - server-02からkubectlコマンドでKubernetesに接続できます。
    - `k` にaliasを貼っているので必要であれば使ってください。
  - Kubernetesが動いているserver-01については前任者が接続情報をなくしてしまったためログインできなくなってしまったようです。
- `192.168.255.60:80` に接続するとNodePortの30080番ポートに転送する設定が入っています。

## 初期状態

- `web-server` Namespace内の `web-server` DeploymentのPodが起動しない

## 終了状態

- server-02上で `curl http://192.168.255.60` を実行し、期待されたHTMLが返却される
  - HTMLの内容は `deployment.yaml` 内のConfigMapに記載されています。
  - 与えられたKubernetesクラスタ以外でアプリケーションを動作させてはいけません。
- `web-server` Deploymentを `kubectl rollout restart` しても正しくPodが再起動できる状態になっている

## 接続情報

| ホスト名 | IP アドレス  | ユーザ | パスワード |
| -------- | ------------ | ------ | ---------- |
| server-02  | 192.168.255.61 | user | ictsc2025 |

----

## 解説

### トラブルの原因

この問題では 2つの問題が起きていました。1つ目はValidatingAdmissionPolicyによりPodの作成が制限されている問題、2つ目はkube-schedulerのLeaseオブジェクトが破損しPodのscheduleができなくなっている問題でした。

### 解決方法

#### ValidatingAdmissionPolicy

まずクラスタ内でDeploymentの状態を確認すると適切に作成されていることがわかります。ただ、Podは1つも作成されていないようです。

```bash
user@server-02:~$ kubectl get deploy -n web-server
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
web-server   0/2     0            0           39d
user@server-02:~$ kubectl get pod -n web-server
No resources found in web-server namespace.
```

KubernetesにおいてDeploymentのcontrollerはReplicaSetを作成し、ReplicaSetのcontrollerがPodを作成するのでReplicaSetの状態も確認してみましょう。作成されているようです。

```bash
user@server-02:~$ kubectl get rs -n web-server
NAME                    DESIRED   CURRENT   READY   AGE
web-server-7d5b6cfc77   2         0         0       39d
```

すなわちReplicaSet controllerのreconcile時に問題が起きている可能性が高そうです。describeしてみましょう。

```bash
user@server-02:~$ kubectl describe rs web-server-7d5b6cfc77 -n web-server
Name:           web-server-7d5b6cfc77
Namespace:      web-server
Selector:       app=web-server,pod-template-hash=7d5b6cfc77

...省略...

Conditions:
  Type             Status  Reason
  ----             ------  ------
  ReplicaFailure   True    FailedCreate
Events:
  Type     Reason        Age   From                   Message
  ----     ------        ----  ----                   -------
  Warning  FailedCreate  49m   replicaset-controller  Error creating: pods "web-server-7d5b6cfc77-r7cjz" is forbidden: ValidatingAdmissionPolicy 'require-container-resources' with binding 'bind-require-container-resources' denied request: All containers must have requests/limits
  Warning  FailedCreate  32m   replicaset-controller  Error creating: pods "web-server-7d5b6cfc77-jsx6j" is forbidden: ValidatingAdmissionPolicy 'require-container-resources' with binding 'bind-require-container-resources' denied request: All containers must have requests/limits
  Warning  FailedCreate  16m   replicaset-controller  Error creating: pods "web-server-7d5b6cfc77-v7rzp" is forbidden: ValidatingAdmissionPolicy 'require-container-resources' with binding 'bind-require-container-resources' denied request: All containers must have requests/limits
```

どうやら `require-container-resources` というValidatingAdmissionPolicyが `All containers must have requests/limits` というエラーメッセージを吐いているようです。念の為ValidatingAdmissionPolicyの中身も確認してみます。

```bash
user@server-02:~$ kubectl get validatingadmissionpolicy require-container-resources -o yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  creationTimestamp: "2025-11-03T21:21:26Z"
  generation: 1
  name: require-container-resources
  resourceVersion: "474"
  uid: 265d0ed7-8704-45a8-a268-8e0386b53212
spec:
  failurePolicy: Fail
  matchConstraints:
    matchPolicy: Equivalent
    namespaceSelector: {}
    objectSelector: {}
    resourceRules:
    - apiGroups:
      - ""
      apiVersions:
      - v1
      operations:
      - CREATE
      - UPDATE
      resources:
      - pods
      scope: '*'
  validations:
  - expression: "object.spec.containers.all(container, \n  has(container.resources)
      && \n  has(container.resources.requests) && \n  has(container.resources.limits)
      &&\n  has(container.resources.requests.cpu) &&\n  has(container.resources.requests.memory)
      &&\n  has(container.resources.limits.cpu) &&\n  has(container.resources.limits.memory)\n)\n"
    message: All containers must have requests/limits
...
```

全てのcontainers[]にlimits/requestsを設定すれば良いようです。

ちなみに余談ですがKubernetesのbest practiceとしては常にlimitsを設定すれば良いというわけでもなかったりします。(参考: [Kubernetes best practices: Resource requests and limits](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-resource-requests-and-limits) )

例として以下のようにrequests/limitsを設定してあげてkubectl applyしてみます。

```diff
user@server-02:~$ diff -u deployment.yaml deployment2.yaml
--- deployment.yaml     2025-11-04 06:50:03.044034841 +0900
+++ deployment2.yaml    2025-12-13 15:40:29.512901016 +0900
@@ -78,6 +78,13 @@
       containers:
       - name: nginx
         image: nginx:1.25-alpine
+        resources:
+          requests:
+            cpu: '500m'
+            memory: '256Mi'
+          limits:
+            cpu: '1000m'
+            memory: '512Mi'
         ports:
         - containerPort: 80
           name: http
user@server-02:~$ kubectl apply -f deployment2.yaml
Warning: resource namespaces/web-server is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by kubectl apply. kubectl apply should only be used on resources created declaratively by either kubectl create --save-config or kubectl apply. The missing annotation will be patched automatically.
namespace/web-server configured
Warning: resource configmaps/html-content is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by kubectl apply. kubectl apply should only be used on resources created declaratively by either kubectl create --save-config or kubectl apply. The missing annotation will be patched automatically.
configmap/html-content configured
Warning: resource deployments/web-server is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by kubectl apply. kubectl apply should only be used on resources created declaratively by either kubectl create --save-config or kubectl apply. The missing annotation will be patched automatically.
deployment.apps/web-server configured
Warning: resource services/web-server is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by kubectl apply. kubectl apply should only be used on resources created declaratively by either kubectl create --save-config or kubectl apply. The missing annotation will be patched automatically.
service/web-server configured
Warning: resource services/web-server-nodeport is missing the kubectl.kubernetes.io/last-applied-configuration annotation which is required by kubectl apply. kubectl apply should only be used on resources created declaratively by either kubectl create --save-config or kubectl apply. The missing annotation will be patched automatically.
service/web-server-nodeport configured
```

これによりPodリソースが正常に作成されていることがわかりました。

```
user@server-02:~$ kubectl get po -n web-server
NAME                          READY   STATUS    RESTARTS   AGE
web-server-6569c694f8-kc2c5   0/1     Pending   0          35s
```

これで1つ目の問題は解決です。

#### kube-schedulerのLeaseオブジェクト

しかし、待てども待てどもPodがRunningになりません。ずっとPendingのままのようです。

試しにPodをdescribeしてみましょう。

```
user@server-02:~$ kubectl describe po -n web-server
Name:             web-server-6569c694f8-kc2c5
Namespace:        web-server
Priority:         0
Service Account:  default
Node:             <none>
Labels:           app=web-server
                  pod-template-hash=6569c694f8
Annotations:      <none>
Status:           Pending
IP:
IPs:              <none>
Controlled By:    ReplicaSet/web-server-6569c694f8
...
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:                      <none>
```

しかし何もEventが表示されていません。また、Nodeが空のままのようです。

```
Node:             <none>
```

KubernetesにおいてPodをどのNodeにデプロイするかを決定するコンポーネントは `kube-scheduler` です。kube-schedulerに何か問題が起きていないか確認してみましょう。

```
user@server-02:~$ kubectl logs -n kube-system kube-scheduler-ictsc-control-plane --tail 5
E1213 06:51:45.540389       1 leaderelection.go:448] error retrieving resource lock kube-system/kube-scheduler: no kind "Lease" is registered for version "coordination\xaek8s.io/v1" in scheme "pkg/api/legacyscheme/scheme.go:30"
E1213 06:51:49.282418       1 leaderelection.go:448] error retrieving resource lock kube-system/kube-scheduler: no kind "Lease" is registered for version "coordination\xaek8s.io/v1" in scheme "pkg/api/legacyscheme/scheme.go:30"
E1213 06:51:52.345476       1 leaderelection.go:448] error retrieving resource lock kube-system/kube-scheduler: no kind "Lease" is registered for version "coordination\xaek8s.io/v1" in scheme "pkg/api/legacyscheme/scheme.go:30"
E1213 06:51:54.681377       1 leaderelection.go:448] error retrieving resource lock kube-system/kube-scheduler: no kind "Lease" is registered for version "coordination\xaek8s.io/v1" in scheme "pkg/api/legacyscheme/scheme.go:30"
E1213 06:51:57.563174       1 leaderelection.go:448] error retrieving resource lock kube-system/kube-scheduler: no kind "Lease" is registered for version "coordination\xaek8s.io/v1" in scheme "pkg/api/legacyscheme/scheme.go:30"
```

どうやら `Lease` オブジェクトを取得するのがエラーになっているようです。
試しにLeaseリソースを取得してみるとそれもエラーになり、同じようなエラーログが出ています。どうやらLeaseオブジェクトが壊れてしまっているようです。

```
user@server-02:~$ kubectl get lease -n kube-system
Error from server: no kind "Lease" is registered for version "coordination\xaek8s.io/v1" in scheme "pkg/api/legacyscheme/scheme.go:30"
user@server-02:~$ kubectl get lease -n default
No resources found in default namespace.
```

エラーメッセージをよく読んでみると `coordination\xaek8s.io/v1` とあります。 `\ae` これはなんでしょうか?

Leaseオブジェクトは `coordination.k8s.io` というGroupに所属しているリソースです。本来 `\xae` のところは `.` が入っているべき場所です。

`.` のUTF-8における文字コードは0x2Eです。すなわち0x2Eが0xAEになっています。どうやら最上位ビットが反転してしまった結果データが壊れてしまったようです。

```
>>> bin(0x2e ^ 0xae)
'0b10000000'
```

Etcdに保存されているデータが壊れてしまっているのでこれを修復する必要があります。幸いLeaseリソースは削除すれば自動的にcontrollerによって再作成すれば良いので該当リソースを削除できれば大丈夫そうです。

しかしEtcdにアクセスしようにもKubernetesが動いているNodeにはSSHするための情報がないためログインできません。どうにかログインする方法はないでしょうか? 実はKubernetesには `kubectl debug node` という機能があります。これを使ってNodeにログインしてみましょう。

```
user@server-02:~$ kubectl debug -ti node/ictsc-control-plane --image busybox -- sh
--profile=legacy is deprecated and will be removed in the future. It is recommended to explicitly specify a profile, for example "--profile=general".
Creating debugging pod node-debugger-ictsc-control-plane-b62wp with container debugger on node ictsc-control-plane.
The pods "node-debugger-ictsc-control-plane-b62wp" is invalid: : ValidatingAdmissionPolicy 'require-container-resources' with binding 'bind-require-container-resources' denied request: All containers must have requests/limits
```

先ほどのエラーが出てしまいました。いくつか回避策はありますが、一時的にこの制限を解除することは問題として許可されています。ここではバックアップを取った上で一度削除しておきましょう。
ちなみに他の解決策としては `kube-system` NamespaceにPodを作成するなどでも対応可能です。

```
user@server-02:~$ kubectl get validatingadmissionpolicy -o yaml > backup.yaml
user@server-02:~$ kubectl delete validatingadmissionpolicy require-container-resources restrict-nodename-assignment
validatingadmissionpolicy.admissionregistration.k8s.io "require-container-resources" deleted
validatingadmissionpolicy.admissionregistration.k8s.io "restrict-nodename-assignment" deleted
```

これでようやくcontrol-plane Nodeにログインすることができました。 `/host` 配下にhostのファイルシステムが見えています。ここでは簡単のため `chroot /host` をして更に簡単に扱えるようにしておきましょう。

```
user@server-02:~$ kubectl debug -ti node/ictsc-control-plane --image busybox -- sh
--profile=legacy is deprecated and will be removed in the future. It is recommended to explicitly specify a profile, for example "--profile=general".
Creating debugging pod node-debugger-ictsc-control-plane-8cjh2 with container debugger on node ictsc-control-plane.
All commands and output from this session will be recorded in container logs, including credentials and sensitive information passed through the command prompt.
If you don't see a command prompt, try pressing enter.
/ # chroot /host
root@ictsc-control-plane:/# 
```

kube-apiserverのetcdの設定を確認すると `http://172.17.0.1:2379` で接続できるようです。認証も何もかかっていない、脆弱ですね。

```
root@ictsc-control-plane:/# cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep etcd
    - --etcd-servers=http://172.17.0.1:2379
```

試しに etcdctlでkeyの一覧を取得してみましょう。

```
root@ictsc-control-plane:/# etcdctl --endpoints http://172.17.0.1:2379 get --keys-only --prefix=true / | grep lease
/registry/configmaps/kube-node-lease/kube-root-ca.crt
/registry/leases/kube-node-lease/ictsc-control-plane
/registry/leases/kube-node-lease/ictsc-worker
/registry/leases/kube-system/apiserver-lqwgahrybxpd2v3bujlottsg6q
/registry/leases/kube-system/kube-controller-manager
/registry/leases/kube-system/kube-scheduler
/registry/masterleases/172.18.0.2
/registry/namespaces/kube-node-lease
/registry/serviceaccounts/kube-node-lease/default
```

`/registry/leases/kube-system/kube-scheduler` これのようです。

```
root@ictsc-control-plane:/# etcdctl --endpoints http://172.17.0.1:2379 get  /registry/leases/kube-system/kube-scheduler
/registry/leases/kube-system/kube-scheduler
k8s

coordinationk8s.io/v1Lease

kube-scheduler
              kube-system"*$6139f6bf-27de-4bd6-b0cb-0d8650c3fb3a2��
kube-schedulerUpdatecoordination.k8s.io/v۹�FieldsV1:|
z{"f:spec":{"f:acquireTime":{},"f:holderIdentity":{},"f:leaseDurationSeconds":{},"f:leaseTransitions":{},"f:renewTime":{}}}BX
8ictsc-control-plane_0dd08610-6c7d-4a30-88e7-32571bfb9421
                                                        ��"
                                                          ۹��
                                                             ("
```

`coordinationk8s.io/v1Lease`の途中の`.`が読めなくなっていますね。このリソースで間違いなさそうなため削除してみます。

```
root@ictsc-control-plane:/# etcdctl --endpoints http://172.17.0.1:2379 del  /registry/leases/kube-system/kube-scheduler
1
```

これでcontrol planeからログアウトして確認するとkube-schedulerが動作して無事アプリケーションが起動したようです。

```
user@server-02:~$ kubectl get po -n web-server
NAME                          READY   STATUS    RESTARTS   AGE
web-server-6569c694f8-kc2c5   1/1     Running   0          60m
web-server-6569c694f8-pc6fn   1/1     Running   0          3m18s
```

忘れずValidatingAdmissionPolicyも戻しておきましょう。

```
user@server-02:~$ kubectl create -f backup.yaml
validatingadmissionpolicy.admissionregistration.k8s.io/require-container-resources created
validatingadmissionpolicy.admissionregistration.k8s.io/restrict-nodename-assignment created
```

curlでもアクセスできるようになりました。

```
user@server-02:~$ curl http://192.168.255.60
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
...
```

### 別解

別解としてNodeにログインせずとも同一Nodeからetcdctlを叩けるようなPodをデプロイする、というものもあります。kube-schedulerやそれに相当するものを自作で頑張ってデプロイいただいていたチームも制約を満たしているものは正解としています。

また、問題文中に以下のような制約を設けておりましたが、新規に作成することについての制限が明確でなかったため新規リソースを作成することでの対応は許容しています。

> kube-system Namespace内及びCluster-wideなリソースについては変更不可

`/etc/kubernetes/manifests` 以下のファイルの編集は `kube-system` NamespaceのPodの変更となるため禁止としました。

### 補足

このLeaseリソースの1 bitが反転してしまった現象は実際に作問者が遭遇した事象を元に再現した問題です。メモリエラー等でビットが反転してしまう現象は意外と身近に起きています。最近でも某航空会社の機体が太陽フレアの影響により問題が起きていましたね。2025年は太陽フレアの活動が特に活発なようです。

実は問題文中にもちょっとした小ネタを残していました?

> 綺麗な夜空を眺めながら帰路についている

この「綺麗な夜空を」というのは星空ではなくオーロラのことを指していました。太陽フレアが活発になると低緯度地域でもオーロラが観測できることがあるそうです。解く前に気づくことはほぼ不可能だと思いますがビット反転をみてもしかして?と思ってくれた方がいれば嬉しいです。

**皆さん、メモリがどうせ高騰しているならECCメモリを買いましょう。**

想定していたよりも沢山の参加者の方に解いていただきKubernetesに対する参加者の皆さんの理解度の高さに驚かされました。
