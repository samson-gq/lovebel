import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Users, Heart, MessageSquare, Crown, Activity, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

type Totals = {
  users_total: number;
  users_active_7d: number;
  users_active_30d: number;
  premium_users: number;
  matches_total: number;
  messages_total: number;
  events_range: number;
};

type Analytics = {
  range_days: number;
  totals: Totals;
  dau: Array<{ date: string; users: number }>;
  top_events: Array<{ event: string; count: number }>;
  onboarding_funnel: {
    signups: number;
    with_name: number;
    with_photo: number;
    onboarding_complete: number;
  };
  revenue_proxy: { premium_conversions_range: number };
};

const RANGES = [7, 14, 30, 90] as const;

export default function AdminAnalytics() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [range, setRange] = useState<number>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactRunning, setReactRunning] = useState(false);
  const [reactResult, setReactResult] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    supabase
      .rpc("admin_analytics" as any, { days_back: range })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setData(data as unknown as Analytics);
        setLoading(false);
      });
  }, [isAdmin, range]);

  const funnel = useMemo(() => {
    if (!data) return [];
    const f = data.onboarding_funnel;
    return [
      { step: "Регистрация", value: f.signups },
      { step: "С именем", value: f.with_name },
      { step: "С фото", value: f.with_photo },
      { step: "Онбординг", value: f.onboarding_complete },
    ];
  }, [data]);

  const runReactivation = async (dry: boolean) => {
    setReactRunning(true);
    setReactResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("reactivation-push", {
        body: { dry_run: dry, inactive_days: 7, throttle_days: 7 },
      });
      if (error) throw error;
      setReactResult(JSON.stringify(data));
    } catch (e) {
      setReactResult("Ошибка: " + (e as Error).message);
    } finally {
      setReactRunning(false);
    }
  };

  if (roleLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Аналитика</h1>
            <p className="text-sm text-muted-foreground">
              Активность, funnel и топ-события за выбранный период.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "ghost"}
                onClick={() => setRange(r)}
              >
                {r}д
              </Button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Users} label="Всего юзеров" value={data.totals.users_total} />
              <Stat icon={Activity} label="Активны 7д" value={data.totals.users_active_7d} />
              <Stat icon={Heart} label="Матчей" value={data.totals.matches_total} />
              <Stat icon={MessageSquare} label="Сообщений" value={data.totals.messages_total} />
              <Stat icon={Crown} label="Premium" value={data.totals.premium_users} />
              <Stat icon={TrendingUp} label="Активны 30д" value={data.totals.users_active_30d} />
              <Stat icon={Activity} label={`События (${range}д)`} value={data.totals.events_range} />
              <Stat icon={Crown} label={`Конверсии (${range}д)`} value={data.revenue_proxy.premium_conversions_range} />
            </div>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">DAU — уникальные пользователи в день</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dau}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Onboarding funnel</h2>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="step" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Топ-15 событий</h2>
                <div className="max-h-56 space-y-1 overflow-auto text-sm">
                  {data.top_events.length === 0 && (
                    <p className="text-muted-foreground">Нет данных за период.</p>
                  )}
                  {data.top_events.map((e) => (
                    <div key={e.event} className="flex justify-between border-b py-1">
                      <span className="truncate">{e.event}</span>
                      <span className="font-semibold tabular-nums">{e.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h2 className="text-sm font-semibold text-muted-foreground">Reactivation push</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Отправить пуш неактивным &gt;7 дней юзерам (не чаще, чем раз в 7 дней). Начни с dry-run.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => runReactivation(true)} disabled={reactRunning}>
                  {reactRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Dry-run
                </Button>
                <Button size="sm" onClick={() => runReactivation(false)} disabled={reactRunning}>
                  {reactRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Отправить
                </Button>
              </div>
              {reactResult && (
                <pre className="mt-3 overflow-auto rounded-md bg-muted p-2 text-xs">{reactResult}</pre>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString("ru-RU")}</div>
    </Card>
  );
}
