# 42 Cosmos Scan — ロードマップ / 作業予定

42 Chain（Infinite、Cosmos Chain ID: `infinite_421018-1`）の **Cosmos側**を見るための
静的エクスプローラーの開発計画。EVM側エクスプローラー（scan.infinitedrive.xyz）では
見えない Cosmos Tx（送金・ステーキング系メッセージ等）を表示することが目的。

> このリポジトリは計画の公開用です。サイト本体のコードは現在ローカルで開発中で、
> 公開のタイミングは別途判断します。

## 確定している前提（推測ではなく検証済みの事実）

- Cosmos Chain ID: `infinite_421018-1` / bech32 接頭辞: `infinite` / 基軸通貨: `drop`（18 decimals、表示は [42]）
- ステーキング bond denom: `drop`、解除（アンボンディング）は約21日
- Cosmos REST（LCD）は公式に公開されていない → 使わない
- CometBFT RPC は3エンドポイントが生存し、tx_index on、ジェネシス（高さ1）からの全履歴あり
  - ただしブラウザから直接読める（CORSヘッダを返す）のは
    `comet-rpc-infinite.mschihuahua.org` のみ（2026-11-01 実測）
  - 公開ホスティングする場合はこの制約への対処（プロキシ等）が要る
- EVM RPC は CORS `*` でブラウザ直読み可。ステーキングプリコンパイル `0x0800` は稼働中

## Phase 0: 調査・実証 ✅ 完了（2026-11-01）

- [x] CometBFT エンドポイントの到達性・CORS・冗長性を実測
- [x] Cosmos Tx の protobuf デコード方式を確立し、実Txで検証
  - 対応確認: MsgSend / MsgDelegate / MsgUndelegate / MsgBeginRedelegate /
    MsgWithdrawDelegatorReward / MsgWithdrawValidatorCommission
  - Txハッシュ = sha256（生Tx）であること、`/tx` はハッシュを base64 で渡す必要があることを確認
- [x] プリコンパイル 0x0800 の `validators()` / `delegation()` を実呼び出しで検証
  （委任額の戻りが実データと一致）
- [x] バリデーターのモニカー結合方法を確立（コンセンサスアドレス = sha256（公開鍵）先頭20バイト）

## Phase 1: ローカル静的サイト ✅ 完了（2026-11-01、ローカルのみ）

単一HTML + ローカル用プロキシ付きサーバーで、まずローカルで使えるものを作る。

- [x] ホーム: 最新ブロック一覧（高さ・時刻・提案者・Tx数）、チェーン状態
- [x] ブロック詳細 / Tx詳細（Cosmosメッセージのデコード、未対応型は正直に表示）
- [x] バリデーター一覧（投票力つき、モニカー結合）
- [x] アカウント: `infinite1…` と `0x…` の両形式対応、ネイティブ残高、委任状況
- [x] 検索: ブロック高さ / Txハッシュ / アドレス
- [x] 実データでの最終検証（既知のブロック・Txとの突き合わせ）と表示の仕上げ
  - 既知の MsgSend（2,000 [42]、高さ 4,184,471）、MsgDelegate（879 [42]）の表示が実データと一致
  - ある委任者アカウントで残高 0.600055… [42] / 委任 14,176.2 [42] が直接取得した値と完全一致
  - バリデーター23件・合計投票力 238,995 を表示確認

## Phase 2: 拡張（予定）

- [ ] アンボンディング中（解除待ち）一覧の表示
      （プリコンパイル `unbondingDelegation()` の戻り構造の検証が前提。推測で表示しない）
- [ ] 未請求の報酬額の表示（distribution 側の取得方法を検証してから）
- [ ] 対応メッセージ型の追加（ガバナンス投票、IBC 等、実Txで検証できたものから）
- [ ] アカウント履歴のページ送り・絞り込みの改善
- [ ] バリデーター詳細ページ（委任者数推移など、取れる範囲で）

## Phase 3: ウェブサイト公開 ✅ 完了（2026-11-01）

- [x] ホスティング先の選定: GitHub Pages（https://nepicobsv-hash.github.io/42-cosmos-scan/）
- [x] CORS 制約への対処: HTTP の CORS は localhost Origin のみ許可という実測結果を受け、
      公開サイトでは CometBFT の WebSocket 版 JSON-RPC（CORS対象外、全ホストで
      github.io Origin のハンドシェイク成功を実測）を使う方式に決定・実装
- [x] 公開範囲の最終確認（コード・サイトとも公開、ユーザーの指示による）

## 将来の選択肢

- 自前の LCD / ノード運用が必要になった場合の検討（現時点では CometBFT + プリコンパイルで足りている）
- QL1 側への展開（同じ方式が使えるかは未検証）

## 関連プロジェクト

- GuppyWallet（42 Chain / QL1 専用ウォレット）: https://github.com/nepicobsv-hash/GuppyWallet
- 42 Bubble Map: https://github.com/nepicobsv-hash/42-bubblemap-apk
- 42 Flow Map: https://github.com/nepicobsv-hash/42-flowmap-apk
