import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Check, Star, Home, ShoppingBag, Plus, BarChart3, User } from "lucide-react"

type Mission = {
  label: string
  done: number
  total: number
}

const missions: Mission[] = [
  { label: "きょう 3かい うる", done: 1, total: 3 },
  { label: "500えんを 1こ", done: 1, total: 1 },
  { label: "えがおで あいさつ", done: 2, total: 3 },
]

function Stars({ done, total }: { done: number; total: number }) {
  const max = 3
  const filled = total > 0 ? Math.round((done / total) * max) : 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={[
              "h-5 w-5",
              i < filled ? "fill-[#B8902E] text-[#B8902E]" : "text-[#D9C89B]",
            ].join(" ")}
          />
        ))}
      </div>
      <div className="text-sm font-semibold text-[#B8902E] tabular-nums">
        {done}/{total}
      </div>
    </div>
  )
}

export default function VendorOnHomePage() {
  return (
    <main className="min-h-dvh bg-[#FBF7F0] py-8">
      <div className="mx-auto w-full max-w-[390px] px-4">
        <div className="relative overflow-hidden rounded-[36px] bg-[#FBF7F0] shadow-[0_30px_80px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
          <div
            className="relative px-6 pb-5 pt-8"
            style={{
              background:
                "radial-gradient(circle at 6px 12px, rgba(27,54,93,0.18) 2px, transparent 2.5px) 0 0/24px 24px, linear-gradient(180deg, rgba(27,54,93,0.10), rgba(251,247,240,0))",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-extrabold tracking-wide text-[#1B365D]">
                  EDO ICHIBA
                </div>
                <div className="mt-1 text-base font-bold text-[#1B365D]/80">
                  出店者ホーム
                </div>
              </div>

              <div className="grid h-14 w-14 place-items-center rounded-full bg-white/70 ring-1 ring-[#1B365D]/10">
                <span className="text-2xl">🦝</span>
              </div>
            </div>
          </div>

          <div className="px-4 pb-24">
            <Card className="rounded-3xl border-[2px] border-[#B8902E]/55 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-extrabold text-[#1B365D]">
                  きょうのミッション
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {missions.map((m) => (
                  <div key={m.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1B365D] text-white shadow-sm">
                        <Check className="h-5 w-5" />
                      </div>
                      <div className="text-base font-bold text-[#1B365D]">
                        {m.label}
                      </div>
                    </div>
                    <Stars done={m.done} total={m.total} />
                  </div>
                ))}

                <Separator className="bg-[#E8D7B4]" />

                <div className="rounded-2xl bg-[#F5E6CF] p-3 ring-1 ring-[#B8902E]/25">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 ring-1 ring-[#B8902E]/25">
                        <span className="text-xl">🏅</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#1B365D]/70">
                          ごほうび
                        </div>
                        <div className="text-base font-extrabold text-[#1B365D]">
                          スタンプ +1
                        </div>
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 ring-1 ring-[#B8902E]/25">
                      <span className="text-xl">🧰</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4 rounded-3xl border-[2px] border-[#B8902E]/55 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-3">
                <div className="flex items-end justify-between">
                  <CardTitle className="text-xl font-extrabold text-[#1B365D]">
                    ランク（つぎの もくひょう）
                  </CardTitle>
                  <div className="text-sm font-bold text-[#1B365D]/70">
                    あと 100ポイント
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-[#B8902E]/30">
                    <span className="text-xl">🏮</span>
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={58}
                      className="h-3 bg-[#E9E9E9]"
                      indicatorClassName="bg-[#B8902E]"
                    />
                    <div className="mt-2 flex justify-between text-sm font-bold text-[#1B365D]/75">
                      <span>レベル 2</span>
                      <span>レベル 3</span>
                    </div>
                  </div>
                </div>

                <Button className="h-12 w-full rounded-full bg-[#E63946] text-base font-extrabold hover:bg-[#d62f3b]">
                  レベルアップのヒントをみる
                </Button>

                <div className="rounded-2xl bg-[#FBF7F0] p-3 ring-1 ring-[#1B365D]/10">
                  <div className="text-sm font-bold text-[#1B365D]">
                    こんげつの スタート：はん（Tier4）
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#1B365D]/80">
                    いまの てすうりょう：3.8% + 40えん
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#1B365D]/80">
                    てんか に もどるまで：あと 51かい
                  </div>
                  <div className="mt-2 text-xs text-[#1B365D]/60">
                    つきが かわると かいすうは 0に もどるよ
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 text-center text-xs text-[#1B365D]/55">
              Payment powered by Fleapay
            </div>
          </div>

          <div className="absolute bottom-3 left-1/2 w-[92%] -translate-x-1/2 rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex flex-col items-center gap-1 text-[#B8902E]">
                <Home className="h-6 w-6" />
                <div className="text-[11px] font-extrabold">HOME</div>
              </div>

              <div className="text-[#1B365D]/65">
                <ShoppingBag className="h-6 w-6" />
              </div>

              <div className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-[#E63946] text-white shadow-[0_18px_40px_rgba(230,57,70,0.35)]">
                <Plus className="h-7 w-7" />
              </div>

              <div className="text-[#1B365D]/65">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div className="text-[#1B365D]/65">
                <User className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="h-3" />
        </div>
      </div>
    </main>
  )
}
