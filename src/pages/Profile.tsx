import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Edit3, MapPin, Camera, LogOut, BadgeCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DraggablePhotoGrid from "@/components/DraggablePhotoGrid";
import PromptsEditor from "@/components/PromptsEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDUCATION_OPTIONS,
  ZODIAC_OPTIONS,
  CHILDREN_OPTIONS,
  HABIT_OPTIONS,
} from "@/lib/profileOptions";

const INTEREST_OPTIONS = [
  "Путешествия", "Музыка", "Спорт", "Кино", "Книги",
  "Фотография", "Кофе", "Йога", "Дизайн", "Фитнес",
  "Наука", "Искусство", "Питание", "Мотивация",
];

const MAX_PHOTOS = 6;

interface ProfilePhoto {
  id: string;
  photo_url: string;
  position: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("other");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const photosFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ data: profile }, { data: photoData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("profile_photos").select("*").eq("user_id", user.id).order("position"),
      ]);

      if (profile) {
        setName(profile.name);
        setBio(profile.bio || "");
        setAge(profile.age || "");
        setCity(profile.city || "");
        setGender(profile.gender || "other");
        setInterests(profile.interests || []);
        setAvatarUrl(profile.avatar_url);
        setIsVerified(profile.is_verified ?? false);
      }

      setPhotos((photoData as ProfilePhoto[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name, bio, age: age || null, city, gender, interests })
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Максимум ${MAX_PHOTOS} фото`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const path = `${user.id}/photos/${Date.now()}-${i}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

      if (error) {
        toast.error(`Ошибка загрузки: ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      const { data: inserted } = await supabase
        .from("profile_photos")
        .insert({ user_id: user.id, photo_url: publicUrl, position: photos.length + i })
        .select()
        .single();

      if (inserted) {
        setPhotos((prev) => [...prev, inserted as ProfilePhoto]);

        // Запускаем AI-модерацию в фоне
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-photo`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ photo_id: inserted.id, photo_url: publicUrl }),
            },
          );
          if (resp.ok) {
            const j = await resp.json();
            if (j.decision === "rejected") {
              toast.error(`Фото отклонено: ${j.reason ?? "не соответствует правилам"}`);
              setPhotos((prev) => prev.filter((p) => p.id !== inserted.id));
            }
          }
        } catch (err) {
          console.error("moderation error", err);
        }
      }
    }

    toast.success("Фото добавлены!");
    if (photosFileRef.current) photosFileRef.current.value = "";
  };

  const handleDeletePhoto = async (photo: ProfilePhoto) => {
    const { error } = await supabase.from("profile_photos").delete().eq("id", photo.id);
    if (error) {
      toast.error("Ошибка удаления");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    toast.success("Фото удалено");
  };

  const handleReorder = async (reordered: ProfilePhoto[]) => {
    setPhotos(reordered);
    for (const photo of reordered) {
      await supabase
        .from("profile_photos")
        .update({ position: photo.position })
        .eq("id", photo.id);
    }
    toast.success("Порядок фото обновлён");
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
            aria-label={editing ? "Сохранить" : "Редактировать"}
          >
            {editing ? <SettingsIcon className="h-5 w-5 text-primary" /> : <Edit3 className="h-5 w-5" />}
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Настройки"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
          <button onClick={signOut} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Выйти">
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
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-card-foreground">
                    {name || "Без имени"}{age ? `, ${age}` : ""}
                    {isVerified && <BadgeCheck className="h-5 w-5 text-primary" aria-label="Верифицирован" />}
                  </h2>
                </div>
                {!isVerified && (
                  <button
                    onClick={() => navigate("/verification")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Пройти верификацию
                  </button>
                )}
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

      {/* Photos Gallery */}
      <div className="mt-6 px-6">
        <h3 className="mb-3 text-lg font-semibold text-foreground">
          Фото ({photos.length}/{MAX_PHOTOS})
        </h3>
        <DraggablePhotoGrid
          photos={photos}
          editing={editing}
          maxPhotos={MAX_PHOTOS}
          onReorder={handleReorder}
          onDelete={handleDeletePhoto}
          onAddClick={() => photosFileRef.current?.click()}
        />
        <input
          ref={photosFileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoUpload}
        />
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
