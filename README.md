# 42 Cosmos Scan

42 Chain（Infinite）の **Cosmos側**を見るための静的エクスプローラー（開発中）。

EVM側エクスプローラー（scan.infinitedrive.xyz）では見えない Cosmos 側の情報を対象にします:

- 最新ブロック
- Cosmos Tx の中身（銀行送金・ステーキング系メッセージのデコード）
- バリデーター一覧（投票力・モニカー付き）
- アカウントの残高と委任状況

チェーン情報: Cosmos Chain ID `infinite_421018-1` / 基軸通貨 `drop`（18 decimals、表示は [42]）/
Cosmos REST（LCD）は公式に公開されていないため、CometBFT RPC とステーキング
プリコンパイル（0x0800）で構成します。

## 開発状況

| フェーズ | 状態 |
|---|---|
| Phase 0: 調査・実証（エンドポイント/CORS、Txデコード、プリコンパイル検証） | ✅ 完了（2026-11-01） |
| Phase 1: ローカル静的サイト（ホーム/ブロック/Tx/バリデーター/アカウント/検索） | ✅ 完了（2026-11-01、実データで検証済み・ローカルのみ） |
| Phase 2: 拡張（アンボンディング表示、報酬、対応メッセージ型の追加） | 予定 |
| Phase 3: 公開の検討（ホスティング、CORS対処） | 未定 |

詳しい作業予定は [ROADMAP.md](ROADMAP.md) を見てください。

## このリポジトリについて

現時点では **作業予定とロードマップの公開用** リポジトリです。
サイト本体のコードはローカルで開発しており、公開のタイミングは別途判断します。

## 関連プロジェクト

- GuppyWallet（42 Chain / QL1 専用ウォレット）: https://github.com/nepicobsv-hash/GuppyWallet
- 42 Bubble Map: https://github.com/nepicobsv-hash/42-bubblemap-apk
- 42 Flow Map: https://github.com/nepicobsv-hash/42-flowmap-apk

## License

MIT
