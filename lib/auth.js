// 認証ロジックの基盤
// Phase 1.6: 既存ユーザー移行

import { supabase, supabaseAdmin } from './supabase.js';
import bcrypt from 'bcryptjs';

/**
 * ユーザー認証（auth_providerに基づいて認証方法を切り替え）
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @param {Object} pool - PostgreSQL接続プール
 * @returns {Promise<Object|null>} - 認証成功時はユーザー情報、失敗時はnull
 */
export async function authenticateUser(email, password, pool) {
  try {
    // 1. ユーザー情報を取得
    const result = await pool.query(
      `SELECT id, email, password_hash, auth_provider, supabase_user_id, display_name
       FROM sellers 
       WHERE email = $1 
       LIMIT 1`,
      [email]
    );

    if (result.rowCount === 0) {
      return null; // ユーザーが見つからない
    }

    const user = result.rows[0];

    // 2. auth_providerに基づいて認証方法を切り替え
    if (user.auth_provider === 'supabase') {
      // Supabase Authで認証
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return null; // 認証失敗
      }

      // supabase_user_idが一致することを確認
      if (user.supabase_user_id !== data.user.id) {
        console.warn(`supabase_user_id mismatch for user ${user.id}`);
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: 'supabase',
        supabaseUserId: user.supabase_user_id,
      };
    } else if (user.auth_provider === 'bcryptjs') {
      // bcryptjsで認証（既存ユーザー）
      if (!user.password_hash) {
        return null; // パスワードハッシュが存在しない
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return null; // パスワードが一致しない
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: 'bcryptjs',
        supabaseUserId: user.supabase_user_id,
      };
    }

    return null; // 不明なauth_provider
  } catch (error) {
    console.error('authenticateUser error', error);
    return null;
  }
}

/**
 * パスワードリセット（Supabase Authに移行）
 * @param {string} email - メールアドレス
 * @param {string} newPassword - 新しいパスワード
 * @param {Object} pool - PostgreSQL接続プール
 * @returns {Promise<Object>} - 移行結果
 */
export async function resetPasswordAndMigrate(email, newPassword, pool) {
  try {
    // 1. ユーザー情報を取得
    const result = await pool.query(
      `SELECT id, email, auth_provider, supabase_user_id
       FROM sellers 
       WHERE email = $1 
       LIMIT 1`,
      [email]
    );

    if (result.rowCount === 0) {
      return { success: false, error: 'user_not_found' };
    }

    const user = result.rows[0];

    // 2. 既にSupabase Authに移行済みの場合は、Supabase Authでパスワードを更新
    if (user.auth_provider === 'supabase' && user.supabase_user_id) {
      // Supabase Authでパスワードを更新（Service role key使用）
      if (!supabaseAdmin) {
        return { success: false, error: 'supabase_admin_not_available' };
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.supabase_user_id,
        { password: newPassword }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'password_updated' };
    }

    // 3. bcryptjsユーザーの場合、Supabase Authに移行
    if (user.auth_provider === 'bcryptjs' || !user.supabase_user_id) {
      // 既にSupabase Authにユーザーが存在するか確認（Service role key使用）
      if (!supabaseAdmin) {
        return { success: false, error: 'supabase_admin_not_available' };
      }

      // 既存ユーザーを検索
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      let supabaseUserId = null;
      if (!listError && existingUsers) {
        const existingUser = existingUsers.users.find(u => u.email === email);
        if (existingUser) {
          supabaseUserId = existingUser.id;
          // 既存ユーザーのパスワードを更新
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            supabaseUserId,
            { password: newPassword }
          );
          if (updateError) {
            return { success: false, error: updateError.message };
          }
        }
      }

      // 既存ユーザーが存在しない場合は新規作成
      if (!supabaseUserId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: newPassword,
          options: {
            data: {
              seller_id: user.id,
            }
          }
        });

        if (authError) {
          // ユーザーが既に存在する場合（email_confirmed = false など）
          if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
            // 既存ユーザーを検索してパスワードを更新
            if (!listError && existingUsers) {
              const existingUser = existingUsers.users.find(u => u.email === email);
              if (existingUser) {
                supabaseUserId = existingUser.id;
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                  supabaseUserId,
                  { password: newPassword }
                );
                if (updateError) {
                  return { success: false, error: updateError.message };
                }
              } else {
                return { success: false, error: authError.message };
              }
            } else {
              return { success: false, error: authError.message };
            }
          } else {
            return { success: false, error: authError.message };
          }
        } else if (authData && authData.user) {
          supabaseUserId = authData.user.id;
        } else {
          return { success: false, error: 'user_creation_failed' };
        }
      }

      // sellersテーブルを更新
      await pool.query(
        `UPDATE sellers 
         SET auth_provider = 'supabase',
             supabase_user_id = $1,
             password_hash = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [supabaseUserId, user.id]
      );

      return {
        success: true,
        message: 'migrated_to_supabase',
        supabaseUserId,
      };
    }

    return { success: false, error: 'unknown_auth_provider' };
  } catch (error) {
    console.error('resetPasswordAndMigrate error', error);
    return { success: false, error: error.message };
  }
}

/**
 * 移行率を取得
 * @param {Object} pool - PostgreSQL接続プール
 * @returns {Promise<Object>} - 移行率情報
 */
export async function getMigrationStatus(pool) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE auth_provider = 'supabase') as supabase_users,
        COUNT(*) FILTER (WHERE auth_provider = 'bcryptjs') as bcryptjs_users,
        COUNT(*) as total_users,
        ROUND(100.0 * COUNT(*) FILTER (WHERE auth_provider = 'supabase') / NULLIF(COUNT(*), 0), 2) as migration_rate_percent
      FROM sellers
    `);

    if (result.rowCount === 0) {
      return {
        supabaseUsers: 0,
        bcryptjsUsers: 0,
        totalUsers: 0,
        migrationRatePercent: 0,
      };
    }

    const row = result.rows[0];
    return {
      supabaseUsers: parseInt(row.supabase_users) || 0,
      bcryptjsUsers: parseInt(row.bcryptjs_users) || 0,
      totalUsers: parseInt(row.total_users) || 0,
      migrationRatePercent: parseFloat(row.migration_rate_percent) || 0,
    };
  } catch (error) {
    console.error('getMigrationStatus error', error);
    return {
      supabaseUsers: 0,
      bcryptjsUsers: 0,
      totalUsers: 0,
      migrationRatePercent: 0,
      error: error.message,
    };
  }
}

