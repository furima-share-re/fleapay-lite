// lib/auth-prisma.ts
// Phase 2.6: Express.js廃止 - Prisma対応の認証関数

import { supabase, supabaseAdmin } from './supabase.js';
import { PrismaClient } from '@prisma/client';

/**
 * パスワードリセットとSupabase Auth移行（Prisma版）
 */
export async function resetPasswordAndMigratePrisma(
  email: string,
  newPassword: string,
  prisma: PrismaClient
) {
  try {
    // 1. ユーザー情報を取得（emailはunique制約がないためfindFirstを使用）
    // auth_providerカラムが存在しない場合の回避策として、$queryRawを使用
    let user: {
      id: string;
      email: string | null;
      authProvider: string;
      supabaseUserId: string | null;
    } | null = null;

    try {
      // まず通常のPrismaクエリを試す
      const prismaUser = await prisma.seller.findFirst({
        where: { email },
        select: {
          id: true,
          email: true,
          authProvider: true,
          supabaseUserId: true,
        },
      });
      user = prismaUser;
    } catch (error: unknown) {
      // auth_providerカラムが存在しない場合、$queryRawで取得
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('auth_provider') || errorMessage.includes('does not exist')) {
        const result = await prisma.$queryRaw<Array<{
          id: string;
          email: string;
          auth_provider: string | null;
          supabase_user_id: string | null;
        }>>`
          SELECT id, email, auth_provider, supabase_user_id
          FROM sellers
          WHERE email = ${email}
          LIMIT 1
        `;
        if (result.length > 0) {
          user = {
            id: result[0].id,
            email: result[0].email,
            authProvider: result[0].auth_provider || 'bcryptjs',
            supabaseUserId: result[0].supabase_user_id,
          };
        }
      } else {
        throw error;
      }
    }

    if (!user) {
      return { success: false, error: 'user_not_found' };
    }

    // authProviderがnullの場合はbcryptjsとして扱う
    const authProvider = user.authProvider || 'bcryptjs';

    // 2. 既にSupabase Authに移行済みの場合は、Supabase Authでパスワードを更新
    if (authProvider === 'supabase' && user.supabaseUserId) {
      if (!supabaseAdmin) {
        return { success: false, error: 'supabase_admin_not_available' };
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.supabaseUserId,
        { password: newPassword }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'password_updated' };
    }

    // 3. bcryptjsユーザーの場合、Supabase Authに移行
    if (authProvider === 'bcryptjs' || !user.supabaseUserId) {
      if (!supabaseAdmin) {
        return { success: false, error: 'supabase_admin_not_available' };
      }

      // 既存ユーザーを検索
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      let supabaseUserId: string | null = null;
      if (!listError && existingUsers) {
        const existingUser = existingUsers.users.find((u) => u.email === email);
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
        if (!supabase) {
          return { success: false, error: 'supabase_not_configured' };
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: newPassword,
          options: {
            data: {
              seller_id: user.id,
            },
          },
        });

        if (authError) {
          // ユーザーが既に存在する場合
          if (
            authError.message.includes('already registered') ||
            authError.message.includes('User already registered')
          ) {
            if (!listError && existingUsers) {
              const existingUser = existingUsers.users.find((u) => u.email === email);
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
        } else if (authData?.user) {
          supabaseUserId = authData.user.id;
        } else {
          return { success: false, error: 'user_creation_failed' };
        }
      }

      // 4. sellersテーブルを更新（auth_providerカラムが存在する場合のみ）
      try {
        await prisma.seller.update({
          where: { id: user.id },
          data: {
            authProvider: 'supabase',
            supabaseUserId: supabaseUserId,
            updatedAt: new Date(),
          },
        });
      } catch (updateError: unknown) {
        // auth_providerカラムが存在しない場合は$queryRawで更新
        const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);
        if (updateErrorMessage.includes('auth_provider') || updateErrorMessage.includes('does not exist')) {
          await prisma.$queryRaw`
            UPDATE sellers
            SET supabase_user_id = ${supabaseUserId},
                updated_at = NOW()
            WHERE id = ${user.id}
          `;
        } else {
          throw updateError;
        }
      }

      return { success: true, message: 'migrated_to_supabase' };
    }

    return { success: false, error: 'unknown_auth_provider' };
  } catch (error: unknown) {
    console.error('resetPasswordAndMigratePrisma error', error);
    const errorMessage = error instanceof Error ? error.message : 'internal_error';
    return { success: false, error: errorMessage };
  }
}

/**
 * 移行率確認（Prisma版）
 */
export async function getMigrationStatusPrisma(prisma: PrismaClient) {
  try {
    const result = await prisma.$queryRaw<Array<{
      supabase_users: bigint;
      bcryptjs_users: bigint;
      total_users: bigint;
      migration_rate_percent: number;
    }>>`
      SELECT 
        COUNT(*) FILTER (WHERE auth_provider = 'supabase') as supabase_users,
        COUNT(*) FILTER (WHERE auth_provider = 'bcryptjs') as bcryptjs_users,
        COUNT(*) as total_users,
        ROUND(100.0 * COUNT(*) FILTER (WHERE auth_provider = 'supabase') / NULLIF(COUNT(*), 0), 2) as migration_rate_percent
      FROM sellers
    `;

    if (result.length === 0) {
      return {
        supabaseUsers: 0,
        bcryptjsUsers: 0,
        totalUsers: 0,
        migrationRatePercent: 0,
      };
    }

    const row = result[0];
    return {
      supabaseUsers: Number(row.supabase_users) || 0,
      bcryptjsUsers: Number(row.bcryptjs_users) || 0,
      totalUsers: Number(row.total_users) || 0,
      migrationRatePercent: Number(row.migration_rate_percent) || 0,
    };
  } catch (error: unknown) {
    console.error('getMigrationStatusPrisma error', error);
    // auth_providerカラムが存在しない場合は、すべてbcryptjsとして扱う
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('auth_provider') || errorMessage.includes('does not exist')) {
      try {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count FROM sellers
        `;
        const totalUsers = result.length > 0 ? Number(result[0].count) : 0;
        return {
          supabaseUsers: 0,
          bcryptjsUsers: totalUsers,
          totalUsers: totalUsers,
          migrationRatePercent: 0,
          error: 'auth_provider column does not exist - migration required',
        };
      } catch (fallbackError: unknown) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        return {
          supabaseUsers: 0,
          bcryptjsUsers: 0,
          totalUsers: 0,
          migrationRatePercent: 0,
          error: fallbackErrorMessage,
        };
      }
    }
    return {
      supabaseUsers: 0,
      bcryptjsUsers: 0,
      totalUsers: 0,
      migrationRatePercent: 0,
      error: errorMessage,
    };
  }
}

