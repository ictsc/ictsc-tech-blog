---
title: "ICTSC2023 本戦 問題解説: [ZMH] curlが遅い"
description: "ICTSC2023 本戦 問題解説: curlが遅い"
tags: [ICTSC2023, 問題解説, サーバー関連]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/zmh"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

./run_curl.sh は zmh-a.ictsc.example.com と zmh-b.ictsc.example.com をcurlするコマンドである。
なぜかzmh-b.ictsc.example.com の方が処理時間が長い。
```
content=$(curl -s "$url")
```
の行（20行目）のみを変更してどちらでも処理時間が50ms未満となるようにしてください。

## 前提条件

* ネットワークの設定を変更した場合は回答文書に何を変更したか明記してください。
* run_curl.sh は所定の行（20行目）以外は変更しないでください。
```run_curl.sh
#!/bin/bash

# URLs to check
url_a="zmh-a.ictsc.example.com"
url_b="zmh-b.ictsc.example.com"

# Files with expected contents
file_a="output_zmh-a.ictsc.example.com.html"
file_b="output_zmh-b.ictsc.example.com.html"

# Function to check URL and compare contents
check_url() {
    url=$1
    file=$2

    # Start timer
    start_time=$(date +%s.%N)

    # Get content from URL (the `-s` option is for silent mode)
    content=$(curl -s "$url")

    # End timer and calculate elapsed time
    end_time=$(date +%s.%N)
    elapsed=$(echo "$end_time - $start_time" | bc)

    # Check if the content matches the expected file content
    if ! diff <(echo "$content") "$file" &> /dev/null; then
        echo "Warning: Content from $url does not match $file"
    fi

    # Output the total time and domain name
    echo "Total time for $url: $elapsed seconds"
}

# Check both URLs
check_url $url_a $file_a
check_url $url_b $file_b
```

## 初期状態

```
$ ./run_curl.sh
Total time for zmh-a.ictsc.example.com: .021221016 seconds
Total time for zmh-b.ictsc.example.com: .220197828 seconds
```

のように処理時間が
zmh-a.ictsc.example.com が50ms未満
zmh-b.ictsc.example.com　が200ms以上

## 終了状態

処理時間がどちらも50ms未満となるようにする。

---

## 解説

### 原因探し

こちらはzmh-b.ictsc.example.comのDNSについているIPv6アドレスへの疎通性がないことが問題の原因となっています。

curl コマンドに -v をつけることでzmh-a.ictsc.example.comはIPv6アドレスに接続し、zmh-b.ictsc.example.comではIPv6アドレスへ接続をためし、そののちIPv4アドレスへ接続していることが見て取れます。

zmh-a
```
user@zmh-1:~$ curl -v zmh-a.ictsc.example.com
*   Trying fd38:5471:6c8c::3333:80...
* Connected to zmh-a.ictsc.example.com (fd38:5471:6c8c::3333) port 80 (#0)
> GET / HTTP/1.1
> Host: zmh-a.ictsc.example.com
> User-Agent: curl/7.81.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Server: nginx/1.18.0 (Ubuntu)
< Date: Sat, 09 Mar 2024 01:38:17 GMT
< Content-Type: text/html
< Content-Length: 370
< Last-Modified: Fri, 08 Mar 2024 09:33:09 GMT
< Connection: keep-alive
< ETag: "65eadb55-172"
< Accept-Ranges: bytes
<
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to zmh-a.ictsc.example.com</title>
</head>
<body>
    <h1>Hi, this is zmh-a.ictsc.example.com</h1>
    <p>Welcome to the zmh-a domain. This is a sample HTML file serving as a placeholder.</p>
</body>
</html>

* Connection #0 to host zmh-a.ictsc.example.com left intact
```

zmh-b
```
user@zmh-1:~$ curl -v  zmh-b.ictsc.example.com
*   Trying fd38:5471:6c8c::4444:80...
*   Trying 10.1.181.4:80...
* Connected to zmh-b.ictsc.example.com (10.1.181.4) port 80 (#0)
> GET / HTTP/1.1
> Host: zmh-b.ictsc.example.com
> User-Agent: curl/7.81.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Server: nginx/1.18.0 (Ubuntu)
< Date: Sat, 09 Mar 2024 02:22:01 GMT
< Content-Type: text/html
< Content-Length: 370
< Last-Modified: Fri, 08 Mar 2024 09:33:38 GMT
< Connection: keep-alive
< ETag: "65eadb72-172"
< Accept-Ranges: bytes
<
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to zmh-b.ictsc.example.com</title>
</head>
<body>
    <h1>Hi, this is zmh-b.ictsc.example.com</h1>
    <p>Welcome to the zmh-b domain. This is a sample HTML file serving as a placeholder.</p>
</body>
</html>

* Connection #0 to host zmh-b.ictsc.example.com left intact
```
digコマンドを用いて二つのドメインのIPアドレスを確認することができます。
```
dig zmh-a.ictsc.example.com
dig zmh-a.ictsc.example.com aaaa
dig zmh-b.ictsc.example.com
dig zmh-b.ictsc.example.com aaaa
```

そしてそれぞれのアドレスへのpingを打つ中でzmh-b.ictsc.example.comのIPv6での疎通性がないことがわかります。
```
user@zmh-1:~$ ping -6 zmh-b.ictsc.example.com -c 1
PING zmh-b.ictsc.example.com(fd38:5471:6c8c::4444) 56 data bytes
From zmh-1 (fd38:5471:6c8c::2222) icmp_seq=1 Destination unreachable: Address unreachable

--- zmh-b.ictsc.example.com ping statistics ---
1 packets transmitted, 0 received, +1 errors, 100% packet loss, time 0ms
```

| ドメインとAddress Family | DNSから返ってきたアドレス | 疎通性 |
| -------- | -------- | -------- |
| zmh-a.ictsc.example.com　IPv4    | 10.1.181.3     | あり    |
| zmh-a.ictsc.example.com　IPv6    | fd38:5471:6c8c::3333     | あり     |
| zmh-b.ictsc.example.com　IPv4    | 10.1.181.4     | あり     |
| zmh-b.ictsc.example.com　IPv6    | fd38:5471:6c8c::4444     | なし     |

送信元のアドレスとしては、今回のVMには
10.1.181.2, fd38:5471:6c8c::2222 のアドレスがついています。


問題の原因は、zmh-b.ictsc.example.comのDNSに登録されているIPv6アドレスへの疎通性がないこと。そのせいでcurlがIPv6を試したのちにIPv4にフォールバックするまでの時間の分だけcurlにかかる時間が遅くなってしまっています。このフォールバックはHappy Eyeballsのメカニズムと呼ばれます。

#### Happy Eyeballs について

Happy Eyeballsは[RFC6555](https://datatracker.ietf.org/doc/html/rfc6555) (obsoleted by RFC8305)に定義されています。

Happy EyeballsはIPv6でためしたときに一定時間たっても通信が開始されないときに、IPv4にフォールバックするものです。
[RFC8305]ではこのフォールバックまでのタイムアウト時間は250 millisecondsを推奨しています。

サーバに複数のアドレスがある場合はDefault Address Selection [RFC6724](https://datatracker.ietf.org/doc/html/rfc6724) によって送信先のアドレスが決定されます。default policy tableはIPv4よりIPv6を優先するため今回の場合はサーバのIPv6アドレス(fd38:5471:6c8c::3333,fd38:5471:6c8c::4444)がIPv4アドレスより(10.1.181.3,10.1.181.4)優先されます。
送信先のアドレスの優先度はgetaddrinfo() から返ってくるアドレスの順番が参考になります。


### 解決方法

#### curlのサブコマンドでHappy Eyeballsのフォールバック時間を短くし解決する方法

curlがホスト名を解決し、ホスト名に一つのIPバージョンのアドレスしかない場合、curlはその特定のバージョンを使用します。

IPv6とIPv4のアドレスを持つホストと接続する場合、curlは最初にIPv6の試みを行い、その後タイムアウト後に最初のIPv4試みを開始します。このときIPv4とIPv6の両方で並行してホストに接続を試み最初にハンドシェイクが完了するものが勝者と見なされ、他の接続試みは中止されます。このタイムアウトにより、curlは迅速なIPv6接続を優先します。

最初のIPv6接続が発行されてから最初のIPv4が開始されるまでの[デフォルトタイムアウトは200ミリ秒です](https://daniel.haxx.se/blog/2020/03/16/curl-ootw-happy-eyeballs-timeout/)。

このタイムアウトを変更することで、IPv4にフォールバックするまでの時間を短くすることができます。

```
content=$(curl -s "$url")
```

を
```
content=$(curl -s --happy-eyeballs-timeout-ms 10 "$url")
```
へ変更しタイムアウト時間を200msから10msへ変更する。

#### curlのサブコマンドでIPv4を使用するようにする方法

```
content=$(curl -s "$url")
```

を
```
content=$(curl -s -4 "$url")
```
へ変更しIPv4をしようするようにする。

#### 想定外の解法だったが正解としたもの

```
curl --max-time 0.05 
```
で処理時間を50msに制限することで解決することができる。実際に-v オプションで確認したところIPv6アドレスで試みた後0.025s五に IPv4アドレスに接続していることがわかりました。
（なぜzmh-a.ictsc.example.comはすぐに接続できているか、zmh-b.ictsc.example.comは時間がかかったのかを説明できていない回答であったが、問題文に違いの理由を明記しないといけないという制約がなかったため正解とした。）

## 採点基準

上記のいずれかがの方法で解決で満点

## 講評

1チームのみフォールバックする現象の名前が"Happy Eyeballs"であることについて言及しており嬉しかったです。
このメカニズムについて知っていただけたら嬉しいです。
