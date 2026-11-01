# 42 Cosmos Scan

42 Chain（Infinite, Cosmos Chain ID: `infinite_421018-1`）の **Cosmos側**を見るための静的エクスプローラー。
EVM側エクスプローラー（scan.infinitedrive.xyz）では見えない Cosmos Tx（銀行送金・委任など）の中身を表示する。
コードはこのリポジトリで公開しているが、ウェブサイトとしてのホスティング（公開URLでの運用）はまだしていない（Phase 3 で検討）。

## 開発状況

| フェーズ | 状態 |
|---|---|
| Phase 0: 調査・実証（エンドポイント/CORS、Txデコード、プリコンパイル検証） | ✅ 完了（2026-11-01） |
| Phase 1: ローカル静的サイト（ホーム/ブロック/Tx/バリデーター/アカウント/検索） | ✅ 完了（2026-11-01、実データで検証済み） |
| Phase 2: 拡張（アンボンディング表示、報酬、対応メッセージ型の追加） | 予定 |
| Phase 3: 公開の検討（ホスティング、CORS対処） | 未定 |

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

`index.html` をブラウザで直接開いても動く（CometBFT は CORS 対応している
`comet-rpc-infinite.mschihuahua.org` に直接つなぐ）。ただし公開RPCが混雑時に
接続を切ることがあり、その場合は A の方が安定する。

## なぜプロキシがあるのか（2026-11-01 実測）

CometBFT RPC は `~/workspace/42-flowmap/` の既存スクリプト（`finalize.mjs` 等）に
記録のあった次の3つが生存し、全て `infinite_421018-1` / tx_index on / 高さ1からの全履歴あり:

| エンドポイント | ブラウザから直読み | 備考 |
|---|---|---|
| `comet-rpc.infinitepanda.xyz` | ×（CORSヘッダなし） | curl/サーバー経由は可、応答は速い |
| `comet-rpc.infinitedrive.xyz` | ×（CORSヘッダなし） | 同上 |
| `comet-rpc-infinite.mschihuahua.org` | ○（Originを反射） | 時々接続が切れる（特に tx_search） |

EVM RPC（`evm-rpc.infinitepanda.xyz` / `evm-rpc-infinite.mschihuahua.org` /
`evm-rpc.infinitedrive.xyz`）は全て CORS `*` でブラウザ直読み可。
Cosmos REST（LCD）は公式に公開されていないため使わない。

## できること（Phase 1）

- **ホーム**: 最新ブロック一覧（高さ・時刻・提案者モニカー・Tx数）、平均ブロック間隔、直近の銀行送金/委任
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
