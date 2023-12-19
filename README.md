# ictsc-tech-blog

ICTSC Tech Blog (https://blog.icttoracon.net/)


## Requirements

* Node.js v18 or higher

## Install

```
npm i
```

## Usage

command to add articles interactively.

### 1. Add article

```bash
$ npm run blog:generate 

> astro-ictsc@0.0.1 generate
> node cmd/generate-content.cjs

Folder Name: ictsc2023
File Name: abc
Title: はじめての記事
Description: 今回初めての記事を書きました
Tags (comma-separated): first-post, test
Publish Date (YYYY-MM-DDTHH:MM:SS or leave empty for current time): <空で エンター>
Sticky? (yes/no): no
File created at: src/content/blog/ictsc2023/abc.md

$ cat src/content/blog/ictsc2023/abc.md
---
title: "はじめての記事"
description: "今回初めての記事を書きました"
tags: ["first-post", "test"]
pubDate: 2023-12-19T12:56:36.988Z
slug: "2023/12/19/はじめての記事"
draft: false
renderer: "md"
sticky: false
---

## はじめての記事
```

### 2. Preview

以下のように実行し http://localhost:4321 にアクセスする

```bash
$ npm run build && npm run preview

> astro-ictsc@0.0.1 build
> astro build

~~skip~~

22:02:34 [build] 407 page(s) built in 6.29s
22:02:34 [build] Complete!

> astro-ictsc@0.0.1 preview
> astro preview


 astro  v4.0.6 ready in 5 ms

┃ Local    http://localhost:4321/
┃ Network  use --host to expose
```

## Development

### Start Astro development mode

```
npm run dev
```