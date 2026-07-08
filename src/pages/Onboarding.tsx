import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SignedImg } from "@/components/SignedImg";

const INTERESTS = ["Путешествия", "Музыка", "Спорт", "Кино", "Книги", "Кофе", "Йога", "Дизайн", "Фитнес", "Искусство", "Наука", "Еда"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("other");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_profile" as any).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      setName(row.name || "");
      setAge(row.age || "");
      setBio(row.bio || "");
      setCity(row.city || "");
      setGender(row.gender || "other");
      setAvatarUrl(row.avatar_url || null);
      setInterests(row.interests || []);
      setLatitude(row.latitude ?? null);
      setLongitude(row.longitude ?? null);
    });
  }, [user]);

  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length >= 2 && Boolean(age);
    if (step === 1) return Boolean(avatarUrl);
    if (step === 2) return interests.length > 0;
    return Boolean(city.trim() || (latitude && longitude));
  }, [step, name, age, avatarUrl, interests.length, city, latitude, longitude]);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Не удалось загрузить фото");
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl);
  };

  const requestGps = () => {
    if (!navigator.geolocation) return toast.error("GPS недоступен");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Не удалось получить GPS");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name,
      age: age || null,
      bio,
      city,
      gender,
      avatar_url: avatarUrl,
      interests,
      latitude,
      longitude,
      onboarding_completed: true,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error("Не удалось сохранить профиль");
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background px-5 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <h1 className="bg-clip-text text-3xl font-extrabold text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>LoveBel</h1>
        <Progress value={(step + 1) * 25} className="mt-5 h-2" />

        <section className="flex flex-1 flex-col justify-center py-8">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Расскажите о себе</h2>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" value={age} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")} placeholder="Возраст" />
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  <option value="female">Женщина</option>
                  <option value="male">Мужчина</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Пару слов о себе" />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 text-center">
              <h2 className="text-2xl font-bold text-foreground">Главное фото</h2>
              <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto block aspect-[4/5] w-64 overflow-hidden rounded-2xl bg-muted shadow-card">
                {avatarUrl ? <SignedImg src={avatarUrl} alt="Фото профиля" className="h-full w-full object-cover" /> : <span className="flex h-full flex-col items-center justify-center text-muted-foreground"><Camera className="mb-3 h-10 w-10" />Добавить фото</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Интересы</h2>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((item) => {
                  const active = interests.includes(item);
                  return <button key={item} type="button" onClick={() => setInterests((prev) => active ? prev.filter((i) => i !== item) : [...prev, item])} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item}</button>;
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Локация</h2>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" />
              <button type="button" onClick={requestGps} className="flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-3 font-semibold text-foreground hover:bg-primary/10 hover:text-primary">
                {latitude && longitude ? <Check className="h-5 w-5" /> : <LocateFixed className="h-5 w-5" />}
                {locating ? "Определяем…" : latitude && longitude ? "GPS добавлен" : "Использовать GPS"}
              </button>
            </div>
          )}
        </section>

        <div className="flex gap-3">
          {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>Назад</Button>}
          <Button className="gradient-primary flex-1 text-primary-foreground" disabled={!canContinue || saving} onClick={() => step === 3 ? finish() : setStep((s) => s + 1)}>
            {step === 3 ? "Готово" : "Далее"}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default Onboarding;