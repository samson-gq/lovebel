import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight, BadgeCheck, Play, Sparkles, Zap, RotateCcw } from "lucide-react";
import type { Profile } from "@/data/profiles";
import ProfileActionsMenu from "./ProfileActionsMenu";
import { SignedImg } from "./SignedImg";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";

interface SwipeCardProps {
  profile: Profile & { isVerified?: boolean };
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
  onBlocked?: () => void;
  onHide?: () => void;
  isOnline?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const MONTH = 30 * DAY;

type Badge = { label: string; icon: React.ReactNode; className: string } | null;

const computeBadge = (profile: Profile): Badge => {
  const now = Date.now();
  if (profile.createdAt) {
    const created = new Date(profile.createdAt).getTime();
    if (!Number.isNaN(created) && now - created < DAY) {
      return {
        label: "Новый",
        icon: <Sparkles className="h-3 w-3" />,
        className: "bg-emerald-500/90 text-white",
      };
    }
  }
  if (profile.createdAt && profile.updatedAt) {
    const created = new Date(profile.createdAt).getTime();
    const updated = new Date(profile.updatedAt).getTime();
    if (
      !Number.isNaN(created) &&
      !Number.isNaN(updated) &&
      now - created > MONTH &&
      now - updated < DAY
    ) {
      return {
        label: "Возвращается",
        icon: <RotateCcw className="h-3 w-3" />,
        className: "bg-secondary text-secondary-foreground",
      };
    }
  }
  return null;
};

const SwipeCard = ({ profile, onSwipe, isTop, onBlocked, onHide, isOnline }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const mediaItems = [
    ...(profile.videoUrl ? [{ type: "video" as const, url: profile.videoUrl }] : []),
    ...(profile.images.length > 0 ? profile.images : [profile.image]).map((url) => ({ type: "image" as const, url })),
  ];
  const activeMedia = mediaItems[photoIndex] ?? mediaItems[0];

  const badge = computeBadge(profile);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) onSwipe("right");
    else if (info.offset.x < -120) onSwipe("left");
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => Math.min(prev + 1, mediaItems.length - 1));
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-elevated">
        {activeMedia.type === "video" ? (
          <SignedVideo url={activeMedia.url} isTop={isTop} />
        ) : (
          <SignedImg
            src={activeMedia.url}
            alt={profile.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}

        {mediaItems.length > 1 && (
          <div className="absolute left-0 right-0 top-3 flex justify-center gap-1 px-4">
            {mediaItems.map((item, i) => (
              <div
                key={`${item.type}-${i}`}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/40"
                }`}
              />
            ))}
          </div>
        )}

        {mediaItems.length > 1 && isTop && (
          <>
            {photoIndex > 0 && (
              <button onClick={prevPhoto} aria-label="Предыдущее фото" className="absolute left-0 top-0 flex h-3/4 w-1/4 items-center justify-start pl-2">
                <ChevronLeft className="h-8 w-8 text-primary-foreground/70 drop-shadow" />
              </button>
            )}
            {photoIndex < mediaItems.length - 1 && (
              <button onClick={nextPhoto} aria-label="Следующее фото" className="absolute right-0 top-0 flex h-3/4 w-1/4 items-center justify-end pr-2">
                <ChevronRight className="h-8 w-8 text-primary-foreground/70 drop-shadow" />
              </button>
            )}
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

        {/* Badges row */}
        <div className="absolute left-4 top-7 flex flex-wrap items-center gap-1.5">
          {activeMedia.type === "video" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-current" /> Клип
            </span>
          )}
          {profile.isBoosted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground shadow">
              <Zap className="h-3 w-3 fill-current" /> Boost
            </span>
          )}
          {badge && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow", badge.className)}>
              {badge.icon}
              {badge.label}
            </span>
          )}
        </div>

        <motion.div
          className="absolute left-6 top-20 rounded-lg border-4 border-green-500 px-4 py-2 font-bold text-green-500"
          style={{ opacity: likeOpacity, rotate: -15 }}
        >
          <span className="text-3xl tracking-wider">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute right-6 top-20 rounded-lg border-4 border-primary px-4 py-2 font-bold text-primary"
          style={{ opacity: nopeOpacity, rotate: 15 }}
        >
          <span className="text-3xl tracking-wider">NOPE</span>
        </motion.div>

        {isTop && (
          <div className="absolute right-3 top-6 z-10">
            <ProfileActionsMenu
              targetUserId={profile.id}
              targetUserName={profile.name}
              onBlocked={onBlocked}
              onHide={onHide}
            />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 max-h-[70%] overflow-y-auto p-6">
          <h2 className="flex flex-wrap items-center gap-2 text-3xl font-bold text-primary-foreground">
            {profile.name}, {profile.age}
            {profile.isVerified && <BadgeCheck className="h-6 w-6 text-secondary" aria-label="Верифицирован" />}
            {isOnline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                В сети
              </span>
            )}
          </h2>
          <div className="mt-1 flex items-center gap-1 text-primary-foreground/80">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{profile.distance}</span>
          </div>
          {profile.bio && <p className="mt-2 text-primary-foreground/90">{profile.bio}</p>}

          {(profile.heightCm || profile.occupation || profile.education || profile.zodiac || profile.children || profile.smoking || profile.drinking) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.heightCm && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">📏 {profile.heightCm} см</span>}
              {profile.occupation && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">💼 {profile.occupation}</span>}
              {profile.education && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">🎓 {profile.education}</span>}
              {profile.zodiac && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">✨ {profile.zodiac}</span>}
              {profile.children && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">👶 {profile.children}</span>}
              {profile.smoking && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">🚬 {profile.smoking}</span>}
              {profile.drinking && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">🍷 {profile.drinking}</span>}
            </div>
          )}

          {profile.interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span key={interest} className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                  {interest}
                </span>
              ))}
            </div>
          )}

          {profile.prompts && profile.prompts.length > 0 && (
            <div className="mt-3 space-y-2">
              {profile.prompts.map((pr, i) => (
                <div key={i} className="rounded-xl bg-primary-foreground/15 p-3 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-secondary">{pr.prompt}</p>
                  <p className="mt-0.5 text-sm text-primary-foreground">{pr.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
