import { Settings, Edit3, MapPin, Camera } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import profile1 from "@/assets/profile1.jpg";

const Profile = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Профиль</h1>
        <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* Profile card */}
      <div className="mt-6 px-6">
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="relative">
            <img
              src={profile1}
              alt="Мой профиль"
              className="aspect-square w-full object-cover"
            />
            <button className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-elevated transition-transform hover:scale-110">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-card-foreground">
                Алина, 24
              </h2>
              <button className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Москва</span>
            </div>
            <p className="mt-3 text-card-foreground/80">
              Люблю путешествия и хороший кофе ☕
            </p>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="mt-6 px-6">
        <h3 className="mb-3 text-lg font-semibold text-foreground">
          Интересы
        </h3>
        <div className="flex flex-wrap gap-2">
          {["Путешествия", "Фотография", "Кофе", "Йога", "Книги"].map(
            (interest) => (
              <span
                key={interest}
                className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
              >
                {interest}
              </span>
            )
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 px-6">
        {[
          { label: "Лайки", value: "48" },
          { label: "Матчи", value: "12" },
          { label: "Чаты", value: "5" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-card p-4 text-center shadow-card"
          >
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
