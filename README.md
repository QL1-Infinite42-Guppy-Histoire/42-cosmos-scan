# 42 Cosmos Scan

42 Chain（Infinite, Cosmos Chain ID: `infinite_421018-1`）の **Cosmos側**を見るための静的エクスプローラー。
EVM側エクスプローラー（scan.infinitedrive.xyz）では見えない Cosmos Tx（送金・委任など）の中身を表示する。
（用語注意:「送金」は Cosmos SDK の bank モジュール — トークンの残高・送金を扱う内部モジュールの名前で、
現実の銀行とは無関係 — の `MsgSend` のこと。以前の版で「銀行送金」と書いていたのは誤解を招く表現だったので改めた。）
コードはこのリポジトリで公開し、ウェブサイトとしても GitHub Pages で公開している:
**https://nepicobsv-hash.github.io/42-cosmos-scan/**

## 開発状況

| フェーズ | 状態 |
|---|---|
| Phase 0: 調査・実証（エンドポイント/CORS、Txデコード、プリコンパイル検証） | ✅ 完了（2026-11-01） |
| Phase 1: ローカル静的サイト（ホーム/ブロック/Tx/バリデーター/アカウント/検索） | ✅ 完了（2026-11-01、実データで検証済み） |
| Phase 2: 拡張（アンボンディング表示、報酬、対応メッセージ型の追加） | 予定 |
| Phase 3: ウェブサイト公開（GitHub Pages） | ✅ 完了（2026-11-01、CORSはWebSocket経由で解決） |

詳しい作業予定は [ROADMAP.md](ROADMAP.md) を見てください。

## 開き方（どちらか）

### A. ローカルサーバー経由（推奨・安定）

```sh
cd ~/workspace/42-cosmos-scan
node server.mjs
# → http://localhost:8787/ をブラウザで開く
```

同梱の `server.mjs` は静的配信に加えて、同一起源プロキシ `/comet-rpc` と `/evm-rpc` を提供する。
サイト側は localhost から開かれた場合にプロキシを自動で優先する。

### B. ファイルを直接開く

`index.html` をブラウザで直接開いても動く（CometBFT へは WebSocket 経由で
接続するため、CORS の制約を受けない。下記の実測結果を参照）。
ただし公開RPCが混雑時に接続を切ることがあり、その場合は A の方が安定する。

### C. 公開サイト

https://nepicobsv-hash.github.io/42-cosmos-scan/ （GitHub Pages、同内容）

## 接続方式と CORS の実測結果（2026-11-01）

CometBFT RPC は `~/workspace/42-flowmap/` の既存スクリプト（`finalize.mjs` 等）に
記録のあった次の3つが生存し、全て `infinite_421018-1` / tx_index on / 高さ1からの全履歴あり:
`comet-rpc.infinitepanda.xyz` / `comet-rpc.infinitedrive.xyz` / `comet-rpc-infinite.mschihuahua.org`

HTTP の CORS を Origin 別に実測した結果:

- mschihuahua は **localhost / 127.0.0.1 の Origin だけ**を反射する
  （`http://localhost:8787` 等は可、`https://nepicobsv-hash.github.io` や
  `https://example.com` には Access-Control-Allow-Origin を返さない）
- panda / infinitedrive はどの Origin にも CORS ヘッダを返さない

つまり **公開ウェブサイトからは HTTP fetch で CometBFT を読めない**。
解決策として、CometBFT の **WebSocket 版 JSON-RPC**（`wss://<host>/websocket`）を使う。
WebSocket は CORS の対象外で、github.io の Origin 付きハンドシェイクが3ホスト全てで
成功すること、全メソッド（status/block/blockchain/block_results/validators/tx/tx_search）が
WS で応答することを実測済み。サイト側の使い分け:

- GitHub Pages / file:// など通常の開き方 → WebSocket を優先
- localhost（server.mjs）で開いた場合 → 同梱プロキシ（HTTP）を優先し、WS を予備にする

EVM RPC（`evm-rpc.infinitepanda.xyz` / `evm-rpc-infinite.mschihuahua.org` /
`evm-rpc.infinitedrive.xyz`）は全て CORS `*` でブラウザ直読み可。
Cosmos REST（LCD）は公式に公開されていないため使わない。

## できること（Phase 1）

- **ホーム**: 最新ブロック一覧（高さ・時刻・提案者モニカー・Tx数）、平均ブロック間隔、直近の送金/委任
- **ブロック詳細**: ハッシュ、提案者、署名数、Tx一覧（各Txのメッセージ型と結果）
- **Tx詳細**: CometBFT `/tx` から取得し、protobuf を自前デコード
  - 対応: `MsgSend` / `MsgMultiSend` / `MsgDelegate` / `MsgUndelegate` / `MsgBeginRedelegate` /
    `MsgWithdrawDelegatorReward` / `MsgWithdrawValidatorCommission` / `MsgEthereumTx`（イベントからEVM Txハッシュを提示）
  - 未対応の型は「未対応の型」と表示し、イベント欄で資金の動きは追えるようにしている
  - 手数料（AuthInfo の fee）とガス、メモ、署名者シーケンスも表示
  - 注: CometBFT の `/tx` はハッシュを base64 で渡す必要がある（16進文字列を渡すと化ける）ことを実装済み
- **バリデーター**: CometBFT のコンセンサス集合（投票力・割合）に、ステーキング
  プリコンパイル 0x0800 のモニカー/運営者/ステーク総量/手数料率を公開鍵ハッシュで結合
- **アカウント**: `infinite1…` / `infinitevaloper1…` / `0x…` の相互変換、ネイティブ残高
  （`eth_getBalance`。1 drop = 1 wei で同一）、委任状況（プリコンパイル `delegation()` を
  bonded 全バリデーターに問い合わせて集計）、最近の Cosmos 送金・委任履歴（tx_search）
- **検索**: ブロック高さ / Txハッシュ / アドレス。EVM形式ハッシュが Cosmos 側で
  見つからない場合は EVM エクスプローラーへのリンクを案内

## 正直な限界（Phase 1）

- アンボンディング中（解除待ち）の一覧は未対応（`unbondingDelegation()` の戻り構造の
  検証が終わっていないため、推測で表示していない）。解除の開始Tx自体は履歴で見られる。
- 報酬（未請求リワード）の額は未対応（distribution プリコンパイルの検証が未了）。
- tx_search 系（最近のメッセージ・履歴）は公開ノードが混雑時に接続を切ることがある。
  その場合は該当セクションだけ失敗表示になり、他は表示される。少し待つか
  `server.mjs` 経由（プロキシがエンドポイントを切替）を使うと安定する。
- バリデーターのモニカー結合はプリコンパイルが主。失敗時は同梱スナップショット
  （`validators-snapshot.json`、42-flowmap の 2026-10-31 時点データ）へフォールバックする。

## 検証（2026-11-01、実データ突合）

- 既知の MsgSend Tx `349163B1…D211`（高さ 4,184,471）: 2,000 [42] の送金 + 手数料
  0.0024275 [42] が、過去の検証記録（COSMOS_RESEARCH.md）と一致すること
- MsgDelegate / MsgUndelegate / MsgBeginRedelegate / MsgWithdrawDelegatorReward の
  実Txでデコード結果をイベントと突合
- Txハッシュ = sha256（生Txバイト列）であることを実Txで確認（ブロック内Tx一覧で使用）
- コンセンサスアドレス = sha256（Ed25519公開鍵）先頭20バイトであることを
  プリコンパイルの公開鍵で確認し、投票力とステーク総量の対応（例: Metal Raptor
  14,303）も突合
- `delegation()` の戻り（例: ある委任者×バリデーターで 14,176.2 [42]）を実呼び出しで確認
- bech32 変換は既知アドレス（Luke: `infinite1vkcc…hxe7ct` ⇔ `0x65b1…d03f`）で往復確認

## ファイル

- `index.html` — 本体（単一ファイル、外部ライブラリなし）
- `server.mjs` — ローカルサーバー + RPCプロキシ（Node 18+、依存なし）
- `validators-snapshot.json` — モニカーのフォールバック用スナップショット
