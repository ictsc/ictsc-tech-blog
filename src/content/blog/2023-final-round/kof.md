---
title: "ICTSC2023 本戦 問題解説: [KOF] 誰かアドレスをください！！（手元問題）"
description: "ICTSC2023 本戦 問題解説: [KOF] 誰かアドレスをください！！（手元問題）"
tags: [ICTSC2023,ネットワーク関連,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/kof"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

貴方は今年入社した社員の研修を監督しています。
今は、IEEE802.1Qについて研修を行っています。
とある文系卒の新入社員がpingが通らないと言ってます。
pingが通らない理由についてアドバイスしてください。

## 前提条件

- 機材について
    - ホスト名 : 機種 
    - Team-RT : Cisco C841M-4X-JAIS/K9
    - Team-CSW : Cisco Nexus 93108TC-EX
    - Team-ASW : Juniper EX2300-C-12P


## 初期状態

- Team-CSWのinterface Eth1/1 ～ Eth1/6にさしても`192.168.71.0/24`のIPアドレスが降ってこない
- Team-ASWのinterface ge-0/0/2 ～ ge-0/0/7にさしても`192.168.70.254`と通信ができない

## 終了状態

- Team-CSWのEth1/1 ～ Eth1/6に接続したときに
    - `192.168.71.0/24`のIPアドレスが割り当てられる
    - `192.168.71.254`とpingが通る
- Team-ASWのge-0/0/2 ～ ge-0/0/7に接続するとに
    - `192.168.70.0/24`のPアドレスが割り当てられる
    - `192.168.70.254`とpingが通る

## 前提条件

- 下記の行為は禁止する
    - Team-RT以外の機器などでDHCPサーバ機能を利用する
    - Team-CSW/ASWにてinterface vlanを作成する

---

## 解説

## トラブルの原因

この問題は、RT,CSW,ASWにそれぞれ一つずつVLANに関するトラブルがありました。
①RTでは、vlan databaseにvlan70-73が載ってない
②CSWでは、access vlan idが間違っている
③ASWでは、vlan memberにnative vlan idが入ってない
の3つでした。

## 原因の解決策

①RTで`show vlan-switch`を実行すると、
```
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/0, Gi0/1, Gi0/3
1002 fddi-default                     act/unsup
1003 token-ring-default               act/unsup
1004 fddinet-default                  act/unsup
1005 trnet-default                    act/unsup
```
とvlan 70-73がないので
```
vlan 70
vlan 71
vlan 72
vlan 73
```
を投入してvlanを作成する。

②CSWで`show interface status`を実行すると、
```
--------------------------------------------------------------------------------
Port          Name               Status    Vlan      Duplex  Speed   Type
--------------------------------------------------------------------------------
Eth1/1        department_A-LAN   notconnec 72        auto    auto    10g
Eth1/2        department_A-LAN   notconnec 72        auto    auto    10g
Eth1/3        department_A-LAN   notconnec 72        auto    auto    10g
Eth1/4        department_A-LAN   notconnec 72        auto    auto    10g
Eth1/5        department_A-LAN   notconnec 72        auto    auto    10g
Eth1/6        department_A-LAN   notconnec 72        auto    auto    10g
```
とEth1/1-6のvlanが`72`となってることが分かるので
```
interface ethernet 1/1-6
switchport access vlan 71
```
を投入してvlan idを変更する。

③ASWで`show interfaces`を実行すると、
```
ge-0/0{2~7} {
        native-vlan-id 70;
        unit 0 {
            family ethernet-switching {
                interface-mode trunk;
                vlan {
                    members 71-73;
                }
                storm-control default;
            }
        }
    }
```
となっており、vlan membersにvlan id 70がないことが分かる。
なので、
```
ge-0/0{2~7}.0 family ethernet-switching vlan members 70
```
を投入してmembersに70を入れる。

## 解決後の状態確認コマンド・結果

①RTにて`show vlan-switch`を実行すると、
```
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/0, Gi0/1, Gi0/3
70   VLAN0070                         active
71   VLAN0071                         active
72   VLAN0072                         active
73   VLAN0073                         active
1002 fddi-default                     act/unsup
1003 token-ring-default               act/unsup
1004 fddinet-default                  act/unsup
1005 trnet-default                    act/unsup
```

②CSWにて`show interface status`を実行すると、
```
--------------------------------------------------------------------------------
Port          Name               Status    Vlan      Duplex  Speed   Type
--------------------------------------------------------------------------------
Eth1/1        department_A-LAN   notconnec 71        auto    auto    10g
Eth1/2        department_A-LAN   notconnec 71        auto    auto    10g
Eth1/3        department_A-LAN   notconnec 71        auto    auto    10g
Eth1/4        department_A-LAN   notconnec 71        auto    auto    10g
Eth1/5        department_A-LAN   notconnec 71        auto    auto    10g
Eth1/6        department_A-LAN   notconnec 71        auto    auto    10g
```

③ASWで`show interfaces`を実行すると、
```
ge-0/0{2~7} {
        native-vlan-id 70;
        unit 0 {
            family ethernet-switching {
                interface-mode trunk;
                vlan {
                    members 70-73;
                }
                storm-control default;
            }
        }
    }
```

## 採点基準

- Team-RTにVLAN 70-73がある(得点:10点)

- Team-CSWのinterface Eth1/1-6に
    - `switchport access vlan 71`がある(得点:30点)
    - DHCPにてIPアドレスが割り当ている(得点:5点)
    - pingが成功している(得点:5点)
    - DHCPとpingが成功している(得点:5点)

- team-ASWのinterfaces ge-0/0/2.0 ~ ge-0/0/7.0の
    - `ethernet-switching vlan members 70-73`になっている(得点:30点)
    - DHCPにてIPアドレスが割り当ている(得点:5点)
    - pingが成功している(得点:5点)
    - DHCPとpingが成功している(得点:5点)
