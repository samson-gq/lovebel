import { useState, useEffect, useRef } from "react";
import { Settings, Edit3, MapPin, Camera, LogOut } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const INTEREST_OPTIONS = [
  "Путешествия", "Музыка", "Спорт", "Кино", "Книги",
  "Фотография", "Кофе", "Йога", "Дизайн", "Фитнес",
  "Наука", "Искусство", "Питание", "Мотивация",
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("other");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          setBio(data.bio || "");
          setAge(data.age || "");
          setCity(data.city || "");
          setGender(data.gender || "other");
          setInterests(data.interests || []);
          setAvatarUrl(data.avatar_url);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        bio,
        age: age || null,
        city,
        gender,
        interests,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Ошибка сохранения");
    } else {
      toast.success("Профиль обновлён!");
      setEditing(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const path = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (error) {
      toast.error("Ошибка загрузки фото");
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    toast.success("Фото обновлено!");
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="flex items-center justify-between px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Профиль</h1>
        <div className="flex gap-2">
          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            {editing ? <Settings className="h-5 w-5 text-primary" /> : <Edit3 className="h-5 w-5" />}
          </button>
          <button onClick={signOut} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mt-6 px-6">
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="relative">
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt="Мой профиль"
              className="aspect-square w-full object-cover"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-elevated transition-transform hover:scale-110"
            >
              <Camera className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>
          <div className="space-y-3 p-5">
            {editing ? (
              <>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Возраст"
                    className="w-24"
                  />
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" />
                </div>
                <div className="flex gap-2">
                  {[
                    { value: "male", label: "М" },
                    { value: "female", label: "Ж" },
                    { value: "other", label: "Другой" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGender(opt.value)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        gender === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="О себе" />
                <Button onClick={handleSave} className="gradient-primary w-full text-primary-foreground">
                  Сохранить
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-card-foreground">
                    {name || "Без имени"}{age ? `, ${age}` : ""}
                  </h2>
                </div>
                {city && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{city}</span>
                  </div>
                )}
                {bio && <p className="text-card-foreground/80">{bio}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="mt-6 px-6">
        <h3 className="mb-3 text-lg font-semibold text-foreground">Интересы</h3>
        <div className="flex flex-wrap gap-2">
          {(editing ? INTEREST_OPTIONS : interests).map((interest) => (
            <button
              key={interest}
              onClick={() => editing && toggleInterest(interest)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                interests.includes(interest)
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              } ${editing ? "cursor-pointer" : "cursor-default"}`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
