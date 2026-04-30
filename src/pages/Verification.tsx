import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ShieldCheck, BadgeCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Stage = "intro" | "challenge" | "uploading" | "result";

const Verification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [gestureId, setGestureId] = useState("");
  const [gestureText, setGestureText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: "approved" | "rejected"; reason: string } | null>(null);

  const callFn = async (body: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-selfie`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      },
    );
    return resp;
  };

  const startChallenge = async () => {
    setLoading(true);
    const resp = await callFn({ action: "challenge" });
    setLoading(false);
    if (!resp.ok) {
      toast.error("Не удалось получить задание");
      return;
    }
    const j = await resp.json();
    setGestureId(j.gesture_id);
    setGestureText(j.gesture_text);
    setStage("challenge");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setStage("uploading");
    setLoading(true);

    const path = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage
      .from("verification-selfies")
      .upload(path, file);

    if (upErr) {
      toast.error("Ошибка загрузки");
      setLoading(false);
      setStage("challenge");
      return;
    }

    const resp = await callFn({
      action: "verify",
      selfie_url: path,
      gesture_id: gestureId,
      gesture_text: gestureText,
    });
    setLoading(false);

    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      toast.error(j.error ?? "Ошибка верификации");
      setStage("challenge");
      return;
    }

    const j = await resp.json();
    setResult({ status: j.status, reason: j.reason });
    setStage("result");
    if (j.status === "approved") {
      toast.success("Профиль верифицирован!");
    }
  };

  const tryAgain = () => {
    setResult(null);
    setStage("intro");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="text-foreground" aria-label="Назад">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Верификация профиля</h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-6">
        {stage === "intro" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Подтвердите личность</h2>
            <p className="mt-2 text-muted-foreground">
              Сделайте селфи с указанным жестом. Мы сверим его с вашим аватаром, чтобы убедиться, что вы — реальный человек.
            </p>
            <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm text-muted-foreground">
              <li>✓ Получаете значок «Верифицирован»</li>
              <li>✓ Больше доверия от других</li>
              <li>✓ Селфи никто не увидит — только модерация</li>
            </ul>
            <Button
              className="gradient-primary mt-6 text-primary-foreground"
              size="lg"
              onClick={startChallenge}
              disabled={loading}
            >
              {loading ? "Готовим…" : "Начать"}
            </Button>
          </div>
        )}

        {stage === "challenge" && (
          <div className="w-full text-center">
            <p className="text-sm uppercase tracking-wider text-muted-foreground">Задание</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">{gestureText}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Сделайте селфи, чётко выполняя этот жест. Лицо должно быть полностью видно.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              className="gradient-primary mt-6 text-primary-foreground"
              size="lg"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="mr-2 h-5 w-5" />
              Сделать селфи
            </Button>
            <button
              onClick={startChallenge}
              className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground mx-auto"
            >
              <RefreshCw className="h-3 w-3" /> Другое задание
            </button>
          </div>
        )}

        {stage === "uploading" && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Проверяем селфи…</p>
          </div>
        )}

        {stage === "result" && result && (
          <div className="text-center">
            {result.status === "approved" ? (
              <>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <BadgeCheck className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Готово!</h2>
                <p className="mt-2 text-muted-foreground">
                  Ваш профиль верифицирован. Значок ✓ теперь виден другим.
                </p>
                <Button className="mt-6" onClick={() => navigate("/profile")}>
                  В профиль
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldCheck className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Не получилось</h2>
                <p className="mt-2 text-muted-foreground">{result.reason}</p>
                <Button className="mt-6 gradient-primary text-primary-foreground" onClick={tryAgain}>
                  Попробовать ещё раз
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;
