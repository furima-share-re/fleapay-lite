'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// モックデータ
const mockData = {
  sellerId: 'test-shop-001',
  displayName: 'おみせ',
  title: 'まだこれから!',
  stats: {
    totalOrders: 12,
    childCustomerCount: 5,
    inboundCount: 3,
    dataScore: 75,
  },
  badges: ['はじめの一歩', 'こどもお客さん10人', '海外お客さん'],
  titles: ['若旦那', 'データ名人'],
  todaySales: {
    net: 45000,
    count: 8,
    avg: 5625,
    maxAmount: 15000,
  },
  recent: [
    { summary: '手作りの小物', amount: 5000, createdAt: new Date().toISOString() },
    { summary: 'アクセサリー', amount: 3000, createdAt: new Date().toISOString() },
    { summary: '古本', amount: 2000, createdAt: new Date().toISOString() },
  ],
  goals: {
    cashlessToday: 1,
    attrsToday: 2,
  },
};

// コンポーネント
function KidsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`bg-kids-panel rounded-[18px] border border-kids-border p-4 mb-3 shadow-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

function KidsHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex justify-between items-center py-2 px-1 gap-3"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #fff 0, #fff 35%, #E8B4B8 100%)',
          }}
        >
          🌸
        </div>
        <div>
          <p className="m-0 font-extrabold text-[0.95rem] tracking-wide">EDO ICHIBA</p>
          <p className="m-0 text-[0.78rem] text-kids-sub">若旦那・若女将 マイページ</p>
        </div>
      </div>
      <div className="rounded-full border border-kids-border bg-white/90 px-2.5 py-1.5 text-[0.8rem] text-kids-sub max-w-[50%] truncate">
        {mockData.displayName} の 若旦那 / 若女将
      </div>
    </motion.header>
  );
}

function DashboardHeader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="text-center mb-4"
    >
      <h1 className="text-xl font-extrabold mb-2 text-kids-brand">
        若旦那 / 若女将 ダッシュボード
      </h1>
      <div className="inline-block px-3 py-1.5 rounded-full bg-[#fff3c4] font-bold text-[0.85rem] mt-1">
        称号: {mockData.title}
      </div>
    </motion.div>
  );
}

function EhonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="block my-5 text-[1.4rem] no-underline bg-[#ffe06b] text-gray-800 py-3.5 px-5 rounded-xl font-bold text-center transition-all hover:shadow-lg"
    >
      {children}
    </motion.a>
  );
}

function StatCard({ label, value, meter }: { label: string; value: string | number; meter?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl p-3 shadow-sm border border-kids-border"
    >
      <div className="text-[0.75rem] text-gray-600 mb-1">{label}</div>
      <div className="text-xl font-bold mt-1 text-kids-brand">{value}</div>
      {meter !== undefined && (
        <div className="mt-1.5 w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${Math.min(meter, 100)}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-full rounded-full bg-[#ffb3b3]"
          />
        </div>
      )}
    </motion.div>
  );
}

export default function KidsDashboardMockPage() {
  const [missions, setMissions] = useState<{ [key: string]: boolean }>({
    '1': false,
    '2': false,
    '3': false,
  });

  const toggleMission = (id: string) => {
    setMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatYen = (n: number) => {
    if (!Number.isFinite(n)) return '¥—';
    return '¥' + n.toLocaleString('ja-JP');
  };

  const formatDateJp = (date: Date) => {
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${w})`;
  };

  return (
    <div className="min-h-screen bg-kids-bg text-kids-text font-sans">
      <div className="max-w-[720px] mx-auto px-3 pb-20 pt-3">
        <KidsHeader />
        <DashboardHeader />

        <EhonLink href="/kids-ehon">📘 にんじゃたいの えほん をよむ</EhonLink>
        <EhonLink href={`/seller-purchase?s=${mockData.sellerId}`}>
          💳 QR / カード決済 へすすむ
        </EhonLink>

        {/* こども実績 */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">📈</span>
                <span>きょうまでの こども実績</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">これまでの がんばり</div>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 mt-2.5">
            <StatCard label="売れた回数" value={`${mockData.stats.totalOrders} 回`} />
            <StatCard label="こども お客さん" value={`${mockData.stats.childCustomerCount} 人`} />
            <StatCard label="海外のお客さん" value={`${mockData.stats.inboundCount} 人`} />
            <StatCard
              label="データ名人メーター"
              value={`${mockData.stats.dataScore} %`}
              meter={mockData.stats.dataScore}
            />
          </div>
        </KidsCard>

        {/* バッジ */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">🏅</span>
                <span>てにいれた バッジ</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">いままで ゲット したもの</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {mockData.badges.map((badge, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="px-2.5 py-1.5 rounded-full bg-[#f4f0ff] text-[0.85rem] border border-kids-border"
              >
                {badge}
              </motion.span>
            ))}
          </div>
          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            バッジは あなた の がんばり の あかし です。もっと ふやそう!
          </p>
        </KidsCard>

        {/* 称号 */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">👑</span>
                <span>称号</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">ゲット した 称号たち</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {mockData.titles.map((title, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="px-2.5 py-1.5 rounded-full bg-[#e0f2fe] text-[0.85rem] border border-[#bae6fd]"
              >
                {title}
              </motion.span>
            ))}
          </div>
          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            称号は あなた の レベル を あらわします。もっと すごい 称号を めざそう!
          </p>
        </KidsCard>

        {/* きょうの目標 */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">🎯</span>
                <span>きょうの もくひょう</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">
                若旦那・若女将ダッシュボード と つながっています
              </div>
            </div>
          </div>

          <motion.div
            className={`flex justify-between items-center gap-2 py-2 px-2.5 rounded-xl border border-kids-border mb-1.5 ${
              mockData.goals.cashlessToday >= 1 ? 'bg-[#ecfdf3] border-[#bbf7d0]' : 'bg-[#f9fafb]'
            }`}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex-1">
              <div className="text-[0.9rem] font-semibold">
                QR / カード決済 を 1回 してみよう
              </div>
              <div className="text-[0.78rem] text-kids-sub">
                キャッシュレスバッジ に ちかづく もくひょう
              </div>
            </div>
            <div className="text-[0.9rem] font-bold min-w-[60px] text-right">
              {mockData.goals.cashlessToday} / 1
              {mockData.goals.cashlessToday >= 1 && ' ✅'}
            </div>
          </motion.div>

          <motion.div
            className={`flex justify-between items-center gap-2 py-2 px-2.5 rounded-xl border border-kids-border mb-1.5 ${
              mockData.goals.attrsToday >= 3 ? 'bg-[#ecfdf3] border-[#bbf7d0]' : 'bg-[#f9fafb]'
            }`}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex-1">
              <div className="text-[0.9rem] font-semibold">
                おきゃくさんじょうほう を 3人分 入れてみよう
              </div>
              <div className="text-[0.78rem] text-kids-sub">
                データ名人メーター が 上がる もくひょう
              </div>
            </div>
            <div className="text-[0.9rem] font-bold min-w-[60px] text-right">
              {mockData.goals.attrsToday} / 3
              {mockData.goals.attrsToday >= 3 && ' ✅'}
            </div>
          </motion.div>

          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            💡 目標は、決済のあとに出てくる「かってくれた ひと」画面 や<br />
            「QR / カードで はらう」の 説明 と おなじ内容です。
          </p>
        </KidsCard>

        {/* きょうの売上 */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">💴</span>
                <span>きょうの うりあげ</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">{formatDateJp(new Date())} の うりあげ</div>
            </div>
            <span className="text-[0.75rem] px-2.5 py-1 rounded-full border border-kids-border bg-white text-kids-sub">
              リアルタイム
            </span>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-[1.7rem] font-extrabold mb-1"
            >
              {formatYen(mockData.todaySales.net)}
            </motion.div>
            <div className="text-[0.8rem] text-kids-sub">
              {mockData.todaySales.count}件 / へいきん {formatYen(mockData.todaySales.avg)}
            </div>
          </div>

          <div className="flex gap-2 mt-2.5">
            <div className="flex-1 rounded-[14px] border border-kids-border bg-[#fff7f7] py-2 px-2.5">
              <div className="text-[0.75rem] text-kids-sub mb-0.5">きょう うれた かず</div>
              <div className="text-lg font-bold">{mockData.todaySales.count} 件</div>
            </div>
            <div className="flex-1 rounded-[14px] border border-kids-border bg-[#fff7f7] py-2 px-2.5">
              <div className="text-[0.75rem] text-kids-sub mb-0.5">いちばん ねだんが 高い もの</div>
              <div className="text-lg font-bold">{formatYen(mockData.todaySales.maxAmount)}</div>
            </div>
          </div>

          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            きょうの 売上(すべての 決済)を かんたんに 見られる 画面です。
          </p>
        </KidsCard>

        {/* がんばりメーター */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">📊</span>
                <span>がんばり メーター</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">お客さんじょうほう の 入力ど</div>
            </div>
          </div>

          <div className="mt-1.5">
            <div className="relative w-full h-3.5 rounded-full bg-[#fde2e4] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${mockData.stats.dataScore}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-kids-accent to-kids-accent2"
              />
            </div>
            <div className="mt-1 text-[0.8rem] text-kids-sub">
              きょうの がんばり: <span>{mockData.stats.dataScore}%</span>
            </div>
          </div>

          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            「日本のひと / 外国のひと」「年齢」 などを 入れてくれると、<br />
            ふくろう博士と 三精霊が、もっと じょうずな 売りかたを 教えてくれます。
          </p>

          <div className="mt-1 pt-1.5 border-t border-dashed border-slate-300/40 text-[0.75rem] text-kids-sub flex gap-1.5 items-center flex-wrap">
            <span>いっしょに おてつだい:</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-kids-border text-[0.75rem]">
              🌸 キモニャ(みつける係)
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-kids-border text-[0.75rem]">
              🥷 ニンシャ(かち を まもる係)
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-kids-border text-[0.75rem]">
              🐱 ネコマル(おうえん係)
            </span>
          </div>
        </KidsCard>

        {/* きょうのミッション */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">🎯</span>
                <span>きょうの ミッション</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">三つ できたら 100点!</div>
            </div>
          </div>

          <ul className="list-none p-0 m-1.5 mt-0">
            {[
              {
                id: '1',
                main: 'お客さんに「いらっしゃいませ!」と いえた',
                sub: 'さいしょの ひとことを 元気に いってみよう',
              },
              {
                id: '2',
                main: '値下げを ねがわれたら 「ごめんなさい」と 伝えられた',
                sub: 'ねぎり を ことわる れんしゅう(現金トラブル よけ)',
              },
              {
                id: '3',
                main: '1回 QR / カード で うってみた',
                sub: '現金が なくても 買えるように してあげよう',
              },
            ].map((mission, idx) => (
              <motion.li
                key={mission.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-start gap-2 py-1.5 ${
                  missions[mission.id] ? 'done' : ''
                }`}
              >
                <div
                  onClick={() => toggleMission(mission.id)}
                  className={`w-[18px] h-[18px] rounded-[5px] border-2 border-kids-border flex items-center justify-center text-sm cursor-pointer ${
                    missions[mission.id]
                      ? 'bg-[#bbf7d0] border-[#22c55e]'
                      : 'bg-white'
                  }`}
                >
                  {missions[mission.id] ? '✓' : ''}
                </div>
                <div>
                  <div className="text-[0.9rem] mb-0.5">{mission.main}</div>
                  <div className="text-[0.78rem] text-kids-sub">{mission.sub}</div>
                </div>
              </motion.li>
            ))}
          </ul>

          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            ミッションは このスマホだけで 記録されます。<br />
            なくなっても 大丈夫なので、気楽に タップして OK です。
          </p>
        </KidsCard>

        {/* さいきん うれた もの */}
        <KidsCard>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-base font-extrabold flex items-center gap-1.5">
                <span className="text-xl">🛍️</span>
                <span>さいきん うれた もの</span>
              </div>
              <div className="text-[0.8rem] text-kids-sub">3件だけ ひょうじ</div>
            </div>
          </div>

          <ul className="list-none p-0 m-1.5 mt-0">
            {mockData.recent.map((item, idx) => {
              const date = new Date(item.createdAt);
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              const hh = String(date.getHours()).padStart(2, '0');
              const mm = String(date.getMinutes()).padStart(2, '0');
              const whenText = `${y}-${m}-${d} ${hh}:${mm} ごろ の おかいもの`;

              return (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex justify-between gap-2 py-2 border-b border-[#f1e4d6] last:border-0"
                >
                  <div className="flex-1">
                    <div className="text-[0.9rem] mb-0.5">{item.summary}</div>
                    <div className="text-[0.78rem] text-kids-sub">{whenText}</div>
                  </div>
                  <div className="whitespace-nowrap text-[0.95rem] font-bold">
                    {formatYen(item.amount)}
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <p className="text-[0.78rem] text-kids-sub mt-1.5">
            さいきん の 3件 を ひょうじしています。なにが 人気か 見てみよう。
          </p>
        </KidsCard>
      </div>
    </div>
  );
}

