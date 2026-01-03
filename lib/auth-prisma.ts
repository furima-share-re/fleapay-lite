// lib/auth-prisma.ts
// Phase 2.6: Express.js廃止 - Prisma対応の認証関数

import { supabase, supabaseAdmin } from './supabase.js';
import bcrypt from 'bcryptjs';
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
    // 1. ユーザー情報を取得
    const user = await prisma.seller.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        authProvider: true,
        supabaseUserId: true,
      },
    });

    if (!user) {
      return { success: false, error: 'user_not_found' };
    }

    // 2. 既にSupabase Authに移行済みの場合は、Supabase Authでパスワードを更新
    if (user.authProvider === 'supabase' && user.supabaseUserId) {
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
    if (user.authProvider === 'bcryptjs' || !user.supabaseUserId) {
      if (!supabaseAdmin) {
        return { success: false, error: 'supabase_admin_not_available' };
      }

      // 既存ユーザーを検索
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      let supabaseUserId = null;
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

      // 4. sellersテーブルを更新
      await prisma.seller.update({
        where: { id: user.id },
        data: {
          authProvider: 'supabase',
          supabaseUserId: supabaseUserId,
          updatedAt: new Date(),
        },
      });

      return { success: true, message: 'migrated_to_supabase' };
    }

    return { success: false, error: 'unknown_auth_provider' };
  } catch (error: any) {
    console.error('resetPasswordAndMigratePrisma error', error);
    return { success: false, error: error.message || 'internal_error' };
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
  } catch (error: any) {
    console.error('getMigrationStatusPrisma error', error);
    return {
      supabaseUsers: 0,
      bcryptjsUsers: 0,
      totalUsers: 0,
      migrationRatePercent: 0,
      error: error.message,
    };
  }
}

