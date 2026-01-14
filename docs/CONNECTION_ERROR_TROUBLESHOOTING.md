# 接続エラー対策ガイド

**作成日**: 2026-01-XX  
**対象**: 時々発生するCursor IDEの接続エラー

---

## 🔴 問題

Cursor IDEで時々「Connection Error」が発生する

**症状**:
- 「Connection failed. If the problem persists, please check your internet connection or VPN」というエラーメッセージ
- リクエストIDが表示される（例: `5c982b7d-1788-4d91-9dce-5504471ef7bb`）
- テスト実行には影響しない（ローカル実行のため）

---

## 🔍 原因

時々発生する接続エラーの主な原因：

### 1. 不安定なネットワーク接続
- 一時的な接続切断
- 帯域幅の不足
- 無線LANの不安定性

### 2. VPN/プロキシ設定
- VPNがCursorの通信をブロック
- プロキシ設定の不整合
- 企業ネットワークの制限

### 3. Cursorバックエンドサービスの一時的な問題
- サーバーの高負荷
- メンテナンス作業
- リージョン別の障害

### 4. ファイアウォール/セキュリティソフト
- Windowsファイアウォールのブロック
- アンチウイルスソフトの干渉
- 企業のセキュリティポリシー

---

## ✅ 対処方法

### 即座に試せる対処法

#### 1. Cursorの再起動
```powershell
# Cursorを完全に終了して再起動
# タスクマネージャーでCursorプロセスを確認し、すべて終了
```

#### 2. インターネット接続の確認
```powershell
# インターネット接続を確認
Test-Connection -ComputerName 8.8.8.8 -Count 4

# DNS解決を確認
Resolve-DnsName -Name cursor.sh
```

#### 3. VPNの一時的な無効化
- VPNをオフにして再試行
- 別のVPNサーバーに接続してみる

#### 4. プロキシ設定の確認
```powershell
# プロキシ設定を確認
netsh winhttp show proxy

# プロキシを無効化（必要に応じて）
netsh winhttp reset proxy
```

### 中期的な対策

#### 1. ファイアウォール設定の確認
1. Windowsセキュリティを開く
2. 「ファイアウォールとネットワーク保護」を選択
3. 「アプリがファイアウォールを通過することを許可」を確認
4. Cursorが許可されているか確認

#### 2. ネットワークアダプターのリセット
```powershell
# 管理者権限で実行
ipconfig /release
ipconfig /renew
ipconfig /flushdns
```

#### 3. Cursorの設定確認
- Cursorの設定でプロキシ設定を確認
- ネットワーク関連の設定を確認

### 長期的な対策

#### 1. ネットワーク環境の改善
- 有線LANへの切り替え（可能な場合）
- より安定したインターネット接続への変更
- ルーターのファームウェア更新

#### 2. 企業ネットワークの場合
- IT部門に相談してCursorの通信を許可してもらう
- 必要なドメイン/IPアドレスの許可を依頼

---

## 📊 エラーの影響範囲

### 影響を受ける機能
- ✅ CursorのAIアシスタント機能（コード補完、チャット等）
- ✅ クラウド同期機能

### 影響を受けない機能
- ✅ ローカルでのテスト実行（`npm test`）
- ✅ コード編集
- ✅ Git操作
- ✅ ファイル操作

**重要**: テスト実行はローカルで行われるため、接続エラーが発生してもテスト自体は正常に実行できます。

---

## 🔧 テスト実行時の対策

テスト実行時の安定性を向上させるため、以下の設定を追加しました：

### vitest.config.ts の改善
- ✅ ESMモジュール対応（`__dirname`問題の修正）
- ✅ タイムアウト設定の追加（30秒）
- ✅ フックタイムアウトの設定

### テスト実行方法
```bash
# 通常のテスト実行
npm test

# 特定のテストファイルのみ実行
npm test -- strategy-f-checkout

# ウォッチモード（開発中に便利）
npm test -- --watch

# UIモード（ブラウザで結果を確認）
npm test -- --ui
```

---

## 📝 ログの確認方法

### Cursorのログ
1. Cursorを開く
2. `Ctrl+Shift+P` (または `Cmd+Shift+P` on Mac)
3. "Developer: Show Logs" を選択
4. エラーログを確認

### ネットワーク接続のログ
```powershell
# ネットワーク接続の詳細を確認
Get-NetTCPConnection | Where-Object {$_.State -eq "Established"} | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State
```

---

## 🆘 それでも解決しない場合

### 1. Cursorのサポートに連絡
- [Cursor公式サイト](https://cursor.sh)のサポートに連絡
- エラーメッセージとリクエストIDを共有

### 2. コミュニティで確認
- CursorのGitHub Issuesを確認
- 同様の問題が報告されていないか確認

### 3. 代替手段
- 一時的にオフラインモードで作業
- テスト実行はローカルで継続可能

---

## 📚 関連ドキュメント

- [テスト実行ガイド](./tests/integration/README.md)
- [vitest設定ファイル](../vitest.config.ts)
- [環境変数設定ガイド](../PHASE_1_8_ENV_VARS.md)

---

## 🔄 更新履歴

- 2026-01-XX: 初版作成
