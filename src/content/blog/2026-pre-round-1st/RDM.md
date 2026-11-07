---
title: "ICTSC2026 一次予選 問題解説: 問41"
description: "ICTSC2026 一次予選 問題解説: 問41"
tags: ["ICTSC2026", "問題解説"]
pubDate: 2026-10-02T00:00:00.000Z
slug: "2026/10/02/ictsc2026pr1/rdm"
draft: false
renderer: "md"
sticky: false
---

## 問41

あるアプリケーションを NixOS サーバ上で運用しており、アプリケーションは `/var/lib/myapp/db.sqlite` にデータを保存しているが、現在運用しているバージョンのサポートが終了するため、メジャーバージョンを更新しなければならない。
ただし、リリースノートには新しいバージョンでは移行後のデータベースを移行前のデータベースからは直接読み込めないと記載されている。
新しい構成 G2 に更新するため、次の設定を追加した。

```nix
{ pkgs, ... }: {
  system.activationScripts.myapp-schema = {
    deps = [ "users" ];
    text = ''
      ${pkgs.myapp}/bin/myapp migrate --database /var/lib/myapp/db.sqlite
    '';
  };

  systemd.services.myapp = {
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      ExecStart = "${pkgs.myapp}/bin/myapp serve --database /var/lib/myapp/db.sqlite";
      StateDirectory = "myapp";
    };
  };
}
```

その後、`nixos-rebuild build --flake .#server` を実行し、新しい構成を反映させた。
担当者は、元の構成 G1 を通常起動時の構成に残したまま、次の手順で動作確認しようとしている。

```
sudo nixos-rebuild test --flake .#server
# 問題が起きたら再起動して G1 へ戻る
```

この手順に対する考察として、最も妥当なものを1つ選べ。

### 選択肢（択一選択）

1. `test`では新しいサービスだけが一時的に起動し、activation scriptは実行されない。再起動すれば構成とデータベースの両方が G1 の状態へ戻る
2. `system.stateVersion` を変更していなければ、新しいバージョンのアプリケーションを使ってもデータ形式は古いバージョンの形式に固定される
3. `test` は G2 を実行中のシステムへ反映するため、activation scriptがデータベースを変更し得る。再起動で G1 へ戻ってもデータは戻らないので、バックアップや互換性のある復旧手段が必要である
4. `StateDirectory`で作られたディレクトリは system unit の世代に属する。G1 へ戻ると、`/var/lib/myapp` の内容も G1 で使っていた時点へ復元される

### 正解

3

### 解説

この問題のポイントは、NixOSのシステム構成を戻すことと、アプリケーションのデータを戻すことは別である、という点です。
`nixos-rebuild build` は新しい構成をビルドしますが、実行中のシステムへは反映しません。一方、`nixos-rebuild test` は新しい構成を実行中のシステムへ反映しますが、通常起動時の構成は変更しません。そのため、本問では再起動によってG1の構成で起動できます。

ただし、`test` は単に設定を確認するだけではなく、実際に構成を反映します。その際にactivation scriptも実行されるため、本問の myapp migrate は /var/lib/myapp/db.sqlite を変更する可能性があります。

各選択肢は次のように考えられます。

1. 誤り。 test でもactivation scriptは実行されます。また、再起動してG1の構成に戻っても、データベースは自動では復元されません。
2. 誤り。 system.stateVersion は一部のNixOSモジュールが互換性に配慮した既定値を選ぶための設定であり、すべてのデータ形式を固定するものではありません。本問のように移行コマンドを直接実行すれば、値を変更していなくてもデータ形式は変更される可能性があります。
3. 正しい。 
4. 誤り。 StateDirectory はsystemdに状態ディレクトリの作成や所有者・権限の管理を行わせる設定であり、ディレクトリの内容をNixOSの世代ごとに保存・復元するものではありません。

したがって、データ形式の移行を伴う更新では、移行前に整合性のあるバックアップを取得し、旧バージョンの構成とバックアップを組み合わせて復旧できることを確認しておく必要があります。
