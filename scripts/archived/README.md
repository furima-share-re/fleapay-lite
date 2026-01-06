# SQLファイルアーカイブ

このディレクトリには、直接実行を防ぐためにアーカイブされたSQLファイルが含まれています。

## ⚠️ セキュリティポリシー

**重要**: これらのSQLファイルは、セキュリティ上の理由により直接実行できません。

### データベース操作の原則

1. **Prismaを使用**: すべてのデータベース操作はPrisma ORMを通じて行います
2. **API経由**: データベースへの変更は、適切な認証・認可を持つAPIエンドポイント経由で行います
3. **直接SQL実行の禁止**: 本番環境では、生SQLの直接実行は完全に無効化されています

### これらのファイルを使用する場合

これらのSQLファイルは参考用として保存されていますが、以下の点に注意してください：

- **開発環境のみ**: 開発環境でテストする場合でも、`ADMIN_BOOTSTRAP_SQL_ENABLED=true` の設定が必要です
- **本番環境では使用不可**: 本番環境（`NODE_ENV=production`）では、SQL実行APIは常に無効化されています
- **代替手段**: 必要な操作は、Prismaスキーマとマイグレーション、または適切なAPIエンドポイントを使用してください

### ファイル一覧

- `check-database-timezone.sql` - データベースのタイムゾーン設定を確認
- `check-migration-status.sql` - マイグレーション状態を確認
- `check-pre-migration-data.sql` - マイグレーション前のデータ確認
- `fix-missing-buyer-attributes.sql` - 買い手属性の欠損データ修正
- `migrate-buyer-attributes-from-orders.sql` - 注文データからの買い手属性移行
- `quick-check-sales-2024-12-27.sql` - 売上データの簡易確認
- `set-seller-test01-kids-plan.sql` - テストユーザーのプラン設定
- `verify-migration-complete.sql` - マイグレーション完了確認
- `verify-migration-data.sql` - マイグレーションデータの検証
- `verify-sales-2024-12-27.sql` - 売上データの検証

---

**更新日**: 2026-01-06  
**理由**: SQL直接実行のセキュリティ強化

