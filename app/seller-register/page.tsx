// app/seller-register/page.tsx
// Phase 2.5: React Hook Form + Zod導入、Phase 2.4: Tailwind CSS + shadcn/ui導入

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { slugify } from '@/lib/utils';

const sellerRegisterSchema = z.object({
  shopName: z.string().min(1, 'お店の名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上にしてください'),
  passwordConfirm: z.string().min(8, 'パスワード（確認）を入力してください'),
  agree: z.boolean().refine((val) => val === true, {
    message: '利用規約への同意が必要です',
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
});

type SellerRegisterFormValues = z.infer<typeof sellerRegisterSchema>;

export default function SellerRegisterPage() {
  const form = useForm<SellerRegisterFormValues>({
    resolver: zodResolver(sellerRegisterSchema),
    defaultValues: {
      shopName: '',
      email: '',
      password: '',
      passwordConfirm: '',
      agree: false,
    },
  });

  const [message, setMessage] = React.useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(data: SellerRegisterFormValues) {
    setMessage(null);

    // publicId を shopName から自動生成
    let publicId = slugify(data.shopName);
    if (!publicId) {
      publicId = 'shop-' + Date.now();
    }

    setLoading(true);

    try {
      const res = await fetch('/api/seller/start_onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId,
          displayName: data.shopName,
          email: data.email,
          password: data.password
        })
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok || !responseData.url) {
        console.error('start_onboarding error:', responseData);
        setMessage({ 
          text: '登録に失敗しました。\n時間をおいてもう一度お試しください。', 
          ok: false 
        });
        setLoading(false);
        return;
      }

      // Stripe のオンボーディング画面へリダイレクト
      window.location.href = responseData.url;
    } catch (err) {
      console.error(err);
      setMessage({ 
        text: '通信エラーが発生しました。\nネットワーク環境を確認してください。', 
        ok: false 
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-[#222] antialiased">
      <div className="max-w-[480px] mx-auto px-4 pt-6 pb-10">
        <h1 className="text-[1.4rem] mb-2">出店者登録</h1>
        <p className="text-[.85rem] text-[#666] mb-4 leading-relaxed">
          Fleapay を使ってキャッシュレス決済を行うための出店者アカウントを作成します。<br />
          このあと表示される Stripe の画面で、本人情報や振込先口座を登録してください。
        </p>

        <div className="bg-white rounded-2xl p-4 pb-5 shadow-sm border border-[#e3e3ef]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
              <FormField
                control={form.control}
                name="shopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      お店の名前 <span className="text-[#e11d48] text-[.7rem] ml-1">必須</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例：テストフリマのお店"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      決済画面やダッシュボードに表示される名前です。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      メールアドレス <span className="text-[#e11d48] text-[.7rem] ml-1">必須</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      お知らせやログイン用に利用します。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      パスワード <span className="text-[#e11d48] text-[.7rem] ml-1">必須</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      8文字以上。英数字の組み合わせをおすすめします。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordConfirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      パスワード（確認） <span className="text-[#e11d48] text-[.7rem] ml-1">必須</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-[.8rem]">
                        <a href="/terms.html" target="_blank" rel="noopener" className="underline">利用規約</a> に同意します。
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2.5">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#5a6bff] hover:bg-[#5a6bff]/90 text-white font-semibold disabled:bg-[#ccc] disabled:opacity-60"
                >
                  {loading ? 'Stripe 画面へ移動中…' : 'Stripe で出店者登録をはじめる'}
                </Button>
              </div>

              {message && (
                <div
                  className={`mt-2.5 text-[.8rem] p-2 rounded-[10px] whitespace-pre-wrap ${
                    message.ok
                      ? 'bg-[#ecfdf5] text-[#166534] border border-[#bbf7d0]'
                      : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
