---
title: "ICTSC2023 予選 問題解説: [PLP] ファイルが送れない"
description: "ICTSC2023 予選 問題解説: ファイルが送れない"
tags: [ICTSC2023,サーバー関連,問題解説]
pubDate: 2023-12-22T00:00:00
slug: "2023/12/22/ictsc2023pr/plp"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

友達からのファイル共有が面倒なので、そのまま自宅のサーバに送って貰うようにした。
ある日、いつも通り送って貰おうとしたらファイルが送れなくなっている。
どうしたらいいか分からないので直して欲しい。

## ネットワーク図

```
 +------------------+
 |  upload-site     |
 | 192.168.255.30   |
 +------------------+
```  

upload-site.serviceが動いている

## 前提条件

- uploaderを変更しないこと
- このuploaderは/home/user/storageに書き込む
- 解決後も既に/home/user/storageにあるファイルは/home/user/storageに存在させること
- vdaはシステムで使用するので一時的でもユーザのデータは載せないようにすること
- 再起動しても動くようにして欲しい

## 初期状態

1. サイトを開いてファイルを選択する
2. アップロードを押すと変な画面が表示され、ファイルはアップロードされていない

## 終了状態

- ファイルをアップロードするとアップロード成功！という画面が表示される
- /home/user/storageにファイルが追加出来ている

## 接続情報

| ホスト名 | IPアドレス | ユーザ | パスワード|
| --------- | ----------- | ------ | ------------------ |
| Webサーバ | 192.168.255.30 | user | rgv8qbaiTVgg |

- 以下を使用してポートフォワーディングをする
  - `ssh -L 8086:192.168.255.30:8086 user@${踏み台サーバのIP} -N`
    - 踏み台サーバーからでなく自分の環境で実行する
    - 既に8086を使用している場合8086以外を使うこと
  - `http://localhost:8086`

# 解説

/dev/vdb1でマウントしている/home/user/storageにファイルを保存するが、/dev/vdb1は作成する際にinodeを制限して作っているのでinode不足のエラーが起こる

```
user@localhost:~$ df -i storage/
Filesystem     Inodes IUsed IFree IUse% Mounted on
/dev/vdb1        1280  1280     0  100% /home/user/storage
```

## storageのvdb2に書き換える場合

1. vdbが後10G余っているのでパーティションを作成する
`sudo fdisk /dev/vdb`

```
ubuntu@localhost:~$ sudo fdisk /dev/vdb

Welcome to fdisk (util-linux 2.37.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

This disk is currently in use - repartitioning is probably a bad idea.
It's recommended to umount all file systems, and swapoff all swap
partitions on this disk.


Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2):
First sector (20973568-41943039, default 20973568):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (20973568-41943039, default 41943039):

Created a new partition 2 of type 'Linux' and of size 10 GiB.

Command (m for help): p
Disk /dev/vdb: 20 GiB, 21474836480 bytes, 41943040 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x23126e30

Device     Boot    Start      End  Sectors Size Id Type
/dev/vdb1           2048 20973567 20971520  10G 83 Linux
/dev/vdb2       20973568 41943039 20969472  10G 83 Linux

Command (m for help): w
The partition table has been altered.
Syncing disks.
```

2. ファイルシステムをする
`sudo mkfs.ext4 /dev/vdb2`
3. 仮置きのディレクトリを作成する
`mkdir storage2`
4. 仮置きのディレクトリにマウントする
`sudo mount /dev/vdb2 storage2`
5. ファイルを移す
`sudo rsync -a storage/ storage2/`
6. storage2をアンマウントする
`sudo umount /dev/vdb2`
7. storage1をアンマウントする
`sudo umount /dev/vdb1`
8. storage1にマウントする
`sudo mount /dev/vdb2 storage`
9. 再起動しても永続化するようにする
`sudo vi /etc/fstab`でstorageにマウントしている/dev/vdb1を/dev/vdb2に書き換える

## vdb1のファイルシステムを作り直す場合

5. までは一緒
6. vdb1をアンマウントする
`sudo umont /dev/vdb1`
7. vdb1のファイルシステムを作り直す
`sudo mkfs.ext4 /dev/vdb1`
7. マウントし直す
`sudo mount /dev/vdb1 /home/user/storage/`
8. 移していたのを元に戻す
`sudo rsync -a storage2/ storage/`
8. この場合/etc/fstabの書き換えはない

## 採点基準

- vdaにファイルが写されている　減点(25点)
- /etc/fstabを書き換えていない(再起動後にファイルを表示されない) 減点(-10)
- /home/user/storageに過去のデータがない　減点(0点)
