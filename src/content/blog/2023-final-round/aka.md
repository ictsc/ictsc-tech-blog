---
title: "ICTSC2023 本戦 問題解説: [AKA] 秘密鍵ないなった"
description: "ICTSC2023 本戦 問題解説: 秘密鍵ないなった"
tags: [ICTSC2023,サーバー関連,暗号,問題解説]
pubDate: 2024-03-24T00:00:00
slug: "2024/03/24/ictsc2023final/aka"
draft: false
renderer: "md"
sticky: false
---

# 問題文

## 概要

### 第1問

少しだけ昔…ダンジョンのコンピュータルームに設置されているサーバーの22番目の門が開かれた。

この門への接続は大魔法使いAliceによってRSA暗号(PlainRSA)を用いた公開鍵認証が施されている。


しかし、Aliceが秘密鍵を紛失してからサーバーに接続できたものは誰ひとりとして発見されていない。

Aliceの記した魔導書の一節にはこう記されている。


『希代の大天才、偉大なる大魔法使いAliceはこの世界に二つの鍵を生成した…

一つ目はその身を隠さず誰でも手に入れることができる一対の公開鍵 e,N

二つ目は生成者にのみにしか渡されない秘密鍵 d

この二つの鍵で公開鍵認証を用いたSSH接続をすることでダンジョンの運用に必要なモンスターや罠の制御をしているサーバーに接続し、配置の情報を取得したり書き換えることができる…』(※1)


これ以上は文字が掠れていて読めないが、公開鍵ペア (e,N)は現在もダンジョンの入り口に刻印されている。

```
e=65537
```

```
N=100160063
```

Bob「先日何者かによりダンジョンの自爆コマンドが実行され、このままではダンジョンはまもなく木っ端微塵になってしまう！」

Alice「自爆コマンドを強制的に終了させましょう。」

Carol「でも、コンピュータルームの入室申請が通るのにあと3日はかかるわ！」

Alice「私にいい考えがあります」

Carol「えっ！？秘密鍵を紛失した状態で外部から接続を！？」

Bob「誤爆、誘爆、ご用心！」


緊急クエスト発生！

秘密鍵dを求めよ


1)Alice：異世界転生したらサーバー運用の知識で無双できた件〜えっ！異世界でもシステム運用に追われるんですか！？〜(第2版).異世界書房


### 第2問

〜前回のあらすじ〜

無事に自爆コマンドの実行を阻止したAliceは19枚入りのクッキーをこっそり独り占めして食べていた。

しかし、門の公開鍵認証に用いていたRSA暗号が脆弱すぎることが偉い人たちにバレてしまい、報告に来いとの呼び出しがかかってしまう…

Grace「なんか君の…魔法？すごい簡単に破られちゃったらしいねー？」

Alice「はい…」

Grace「秘密鍵も無くしちゃったっていうし、仕組みはよくわかんないけど、もっといい感じのやつにしておいて！よろしくね！」

Alice「わかりました…」

肩を落としクッキーを一枚口に咥え、少しずつ味わいながら帰路に着こうとしていたAliceを呼び止める者がいた。

神父のPeggyである。

Peggy「RSA暗号でお悩みのようですね？」

Alice「はい…」

Peggy「RSA暗号とは素数によって生成されるとても…美しい暗号ですよねぇ…」

Alice「そう…ですねぇ…」

Peggy「つまり素数を制するものがRSA暗号を制すると言っても過言ではありません…ならば、今あなたに必要なのは素数です…さあ落ち着いて…ゆっくりと素数を数えるんです…」

Alice「えっ…いやいいd」

Peggy「2…3…5…7…11…13…17…19…23…」

〜1時間後〜

Alice「なんか放っておいたらPeggyが急に、とても美しい素数を二つ見つけた！って言ってたからとりあえず教えてもらったけど、桁数も大きい素数だし、これで鍵生成すればいいか〜」

Alice「お、出来たできた」

Alice「なになに…公開鍵ペアは…(
```
e=65537
```
, 
```
N=985924194035611629004681767184171712959151452584992271706607686248033436397625389351457022997353801989658989345096510677824342990927345384757136940809846397665401835809810640379586348047044955961625046793384884434388218471383133368683210478345732602266725512096612669161325333607008537960612128032753007200345710211453034281017153471387790050781178280102568896532496821499032416524839442943587698968593517467122013745982776675092047892328525961928197649751620576120151355781625221307775954816488367691109438457753863851648778823069748397047152611997151452665059034170474706533004463911147655155409305977332764688084738449743014591195596958972573426401531430377520413030501105498510008654208384602315788577986055103996579074539625816566741599217462555213682617706654802222014677615102840433802617140436793672538402334563609142465610868172068414619326858767468313702122566681560956274350311374885052015008770064268493693462053456693577528172410342466494276487834046177077352728626098292749799442965286342093829991171781892186902414164847304998401236997419830556686891941549800811314562297847440038586067635797503258270766156813751489348563890696155167347274078325672451348608983796433997283
```
)」

Alice「以前と比べるとNがかなり大きい値になったな…コードブロックで囲ってなかったら改行されずに解答者にやたら右に長いページを見せるところだったぞ…」

Alice「ちなみにこの素数の美しい点ってなんなの？」

Peggy「君はエマープ数を信じるか？右から読んでも左から読んでも素数となる数を指すが、正方形に並べた場合に一行一列全てがエマープ数になることがあるという素晴らs」

Alice「へー、まあとりあえずこっちの秘密鍵dは無くさないように、しっかり箪笥に閉まっとこ〜」

〜後日〜

Bob「家に泥棒が入ったっていうのは本当か！一体何を盗られたんだ？」

Alice「特に金目のものは盗らなかったみたいだけど」

Judy「いや、やつはとんでもないものを盗んでいきました…あなたの秘密鍵です」

Alice「…は？」

Judy「秘密鍵です」

Alice「」

Alice(やっばい…秘密鍵の数値なんて今回特に長すぎて憶えてない…なんとかして秘密鍵dを求めて接続、新しい鍵を生成して以前の鍵は使えないように設定するとかで認証情報を変更しないと！)

Alice(そうこうしてる間にも向こう側から以前の鍵を使えないようにされているかもしれない…そうなる前に秘密鍵dを求めなければ！)

緊急クエスト発生！

秘密鍵dを求めよ

## 前提条件

・提出時に鍵をコードブロック内に入れてわかりやすくしてください

・計算過程を記述してください

・他の問題で展開しているVMのリソースを用いて計算しないでください

## 初期状態

第1問

```
e=65537
```

```
N=100160063
```

第2問

```
e=65537
```

```
N=985924194035611629004681767184171712959151452584992271706607686248033436397625389351457022997353801989658989345096510677824342990927345384757136940809846397665401835809810640379586348047044955961625046793384884434388218471383133368683210478345732602266725512096612669161325333607008537960612128032753007200345710211453034281017153471387790050781178280102568896532496821499032416524839442943587698968593517467122013745982776675092047892328525961928197649751620576120151355781625221307775954816488367691109438457753863851648778823069748397047152611997151452665059034170474706533004463911147655155409305977332764688084738449743014591195596958972573426401531430377520413030501105498510008654208384602315788577986055103996579074539625816566741599217462555213682617706654802222014677615102840433802617140436793672538402334563609142465610868172068414619326858767468313702122566681560956274350311374885052015008770064268493693462053456693577528172410342466494276487834046177077352728626098292749799442965286342093829991171781892186902414164847304998401236997419830556686891941549800811314562297847440038586067635797503258270766156813751489348563890696155167347274078325672451348608983796433997283
```

## 終了状態

各問題の秘密鍵dが計算過程を含めた上で求められており、一つの解答に記されていること。

---

## 解説

### 第1問：

問題文より


e = 65537

N = 100160063

Nを素因数分解すると

p = 10007
q = 10009

となる
(このp,qは双子素数であり、Nの値を見ただけで直感で気付けた人は計算量を大幅に削減することができ、逆に単純なプログラムを用いて素因数分解する場合は理論上だが無駄な計算を増やすことになる)

オイラーのファイ関数(トーシェント関数)を用いて

ϕ(N) = (10007-1)*(10009-1) = 100140048


RSA暗号のアルゴリズムを用いて

```
ed ≡ 1 mod ϕ(N)
```

合同式の定義より

```
d = e^(-1) mod ϕ(N)
```

拡張ユークリッド互助法を用いて

```math
∴ d = 35910881
```

(p,qが双子素数であることに気付き、拡張ユークリッド互助法を用いると手計算でも十分秘密鍵dは求められるので、興味のある人は紙とペンで解いてみてね！)

### 第2問：

問題文より

```
e = 65537
```

```
N = 985924194035611629004681767184171712959151452584992271706607686248033436397625389351457022997353801989658989345096510677824342990927345384757136940809846397665401835809810640379586348047044955961625046793384884434388218471383133368683210478345732602266725512096612669161325333607008537960612128032753007200345710211453034281017153471387790050781178280102568896532496821499032416524839442943587698968593517467122013745982776675092047892328525961928197649751620576120151355781625221307775954816488367691109438457753863851648778823069748397047152611997151452665059034170474706533004463911147655155409305977332764688084738449743014591195596958972573426401531430377520413030501105498510008654208384602315788577986055103996579074539625816566741599217462555213682617706654802222014677615102840433802617140436793672538402334563609142465610868172068414619326858767468313702122566681560956274350311374885052015008770064268493693462053456693577528172410342466494276487834046177077352728626098292749799442965286342093829991171781892186902414164847304998401236997419830556686891941549800811314562297847440038586067635797503258270766156813751489348563890696155167347274078325672451348608983796433997283
```

Nを素因数分解して
(文中のPeggy神父の言葉から正方形に並べた場合に一行一列全てがエマープ数になるという特徴から調べると良い）

```
p = 3139971973786634711391448651577269485891759419122938744591877656925789747974914319422889611373939731
```

```
q = 3139913993711991311397993319113771475298959419915878794563614167933437977542898525755171333 12684269943695978946644516863648961536981354977375935673418795287369494189373478623641239162919 37926929431994187198579493339973923552369165715483788911783423267897444965827911712952289548822 26124497164356511127978681187224751123673187183599543327568511528456735543438334239583241292792 42571543956244312159149656971499164148747227159798119915531789396889314926554998567389189177184 37841135688757996673251939576963448494648415573685919577397648558759881171319692277264831974241 32596657981115663148459545513443212927921785832181557111436117354993247294692326796432126445117 55544726594454683193623626957711324895114496128478896375157597659974246467315936911531792288239 24913649432978884572883161172885763934333744949322156173895933914134711913833265321911961298416 36693173566246319529561881276487848465833618136461319131574566329281695137472312241384259622433 43371145487745954412587484837933238642278851955148574512595199969685612245439118737626399742196 143742577819117917319979999777371311371999793393
```

```
ϕ(N) = (p-1)*(q-1) = 985924194035611629004681767184171712959151452584992271706607686248033436397625389351457022997353801675667589973897379538025011079550197854861194949221966941303985042466012886089733772529911643277355103097405937789871354822421596387328233102410059183471438142602423295682701692367845618581342833712811135214550776811713798757325496316549900932946945601128119238253379691976136928302226993227152047855795649348399538633615457956732093559571674809082524095407787152161827226502382649763819710504329218034137939293605116624488980703154216607650263297070596454097669844993290328121647576331180922636013536342847818203929001590547240614710009360160860229478758782057777999770835307386943693808253833257994495785807471885840867930927890317242012129984782912001038105951110075627559994421479213476091292245322297544059505959406011482491364400856131503087534570528219177207792777835832124662621453735541714565515548502529534354320706337555244874953290729482330607170477421545124396540498449507903216081151640210180672534538853722673155182940708879036157893626274342810732479354064962878075920018992344918037768405886142124006943448209122103529698755807820711871230371257717537251814782813060264160
```

```
∴ d = 538161133302347297013663745021581315710022199876755550845483875675586311858221356688125365574932290879101220625543295515720413222282820816667676685208621441189975997133476951555427411152669930191507455377931589980576895128896467149303338309237759543011180808937187978644998819614491681241289305131580523063767412894783675220803591554876475976537087217741981010879932736027928442500504542910339353463621736792045664213197518615227690967034766970494669186337836181001343445285407243694418763505674185829916177157180460457571208732379202446030072614341615376847215212245677631077035853763451716518273833645005035332852467673202106268367810013290728183913570012520452452596275255979876051064324951968174269462222724442256822382670604701446488242152457987259305982333476673259757139942926528582025631284494477166236487887541865644798565370887077410622249632902116127168689000740363803585088686764446553170761367114469521529168479298920667331609687188393905928106405371026042312547770740715110880096297322508488231053878853383908124881507209343268084842588045105289658253870835801410461417013891590319254239424809877812565426979763872698011320530257917974972451044005711727117646065971460470113
```

## 講評

こちらは「RSA暗号を用いた公開鍵認証において秘密鍵を失う/盗まれるといった状況において公開鍵から秘密鍵を自分で求める」という問題でした( ＾∀＾)

出題の意図として、普段使っている暗号の仕組みに触れ、どのようにして安全を保障されていて逆に何が安全ではないのかを知ってほしい！ということ
そして、暗号は面白いよ！ということを伝えたかったです

他とは趣向を変えた問題としてちょっと気分を変えて楽しんでいただけたなら幸いです

個人的には文章題で提供すると決めた時点で、一番面白い問題文にしたい！と思い、各所にネタを散りばめました。

中でも数学ネタに気付いてくすりと笑ってもらえたら嬉しいです( d > ω < b )

Alice「クッキーの枚数が素数？だったら全部1人で食べてちゃえば解決だね！」

Peggy「おいしそうなクッキーだが、一枚食べてしまえば素数ではなくなってしまう…」

特に二問目では正方形状に並べると一行一行、一列一列、対角線の値全てがエマープ数(可逆素数)というどちらの方向から読んでも素数になるという特性をもった素数が使われていて、これについて語りたいですが、このページの余白が足りそうにありません。

ちなみに文中のボト●ズネタは運営内でも誰一人気付いていませんでした( ；∀；)

素数を扱った問題のため、さらに高速な解法が存在するかもしれませんし、紙とペンで解くこともできますので、自分なりのRSA暗号を作ったり、解いてみてください！

## 採点基準

- 第1問を計算過程を含めて正解の秘密鍵dを求めている 50点
- 第2問を計算過程を含めて正解の秘密鍵dを求めている 50点