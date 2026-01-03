#!/usr/bin/env node
/**
 * 検証環境チェック用の簡易スクリプト
 * 検証環境のURLを自動設定してメインスクリプトを実行します
 */

// 検証環境のURLを設定（環境変数として設定）
process.env.BASE_URL = 'https://fleapay-lite-t1.onrender.com';

// メインスクリプトをインポートして実行
// メインスクリプトは環境変数を読み取るので、先に設定しておく
import('./check-all-screens.js');
