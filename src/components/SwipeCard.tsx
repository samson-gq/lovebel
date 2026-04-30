import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import type { Profile } from "@/data/profiles";
import ProfileActionsMenu from "./ProfileActionsMenu";

interface SwipeCardProps {
  profile: Profile & { isVerified?: boolean };
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
  onBlocked?: () => void;
}

const SwipeCard = ({ profile, onSwipe, isTop, onBlocked }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const allImages = profile.images.length > 0 ? profile.images : [profile.image];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) {
      onSwipe("right");
    } else if (info.offset.x < -120) {
      onSwipe("left");
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => Math.min(prev + 1, allImages.length - 1));
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
        <img
          src={allImages[photoIndex]}
          alt={profile.name}
          className="h-full w-full object-cover"
          draggable={false}
        />

        {/* Photo indicators */}
        {allImages.length > 1 && (
          <div className="absolute left-0 right-0 top-3 flex justify-center gap-1 px-4">
            {allImages.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* Photo navigation zones */}
        {allImages.length > 1 && isTop && (
          <>
            {photoIndex > 0 && (
              <button
                onClick={prevPhoto}
                className="absolute left-0 top-0 flex h-3/4 w-1/4 items-center justify-start pl-2"
              >
                <ChevronLeft className="h-8 w-8 text-primary-foreground/70 drop-shadow" />
              </button>
            )}
            {photoIndex < allImages.length - 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-0 top-0 flex h-3/4 w-1/4 items-center justify-end pr-2"
              >
                <ChevronRight className="h-8 w-8 text-primary-foreground/70 drop-shadow" />
              </button>
            )}
          </>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

        {/* LIKE indicator */}
        <motion.div
          className="absolute left-6 top-8 rounded-lg border-4 border-green-500 px-4 py-2 font-bold text-green-500"
          style={{ opacity: likeOpacity, rotate: -15 }}
        >
          <span className="text-3xl tracking-wider">LIKE</span>
        </motion.div>

        {/* NOPE indicator */}
        <motion.div
          className="absolute right-6 top-8 rounded-lg border-4 border-primary px-4 py-2 font-bold text-primary"
          style={{ opacity: nopeOpacity, rotate: 15 }}
        >
          <span className="text-3xl tracking-wider">NOPE</span>
        </motion.div>

        {/* Actions menu (top-right) */}
        {isTop && (
          <div className="absolute right-3 top-6 z-10">
            <ProfileActionsMenu
              targetUserId={profile.id}
              targetUserName={profile.name}
              onBlocked={onBlocked}
            />
          </div>
        )}

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="flex items-center gap-2 text-3xl font-bold text-primary-foreground">
            {profile.name}, {profile.age}
            {profile.isVerified && (
              <BadgeCheck className="h-6 w-6 text-secondary" aria-label="Верифицирован" />
            )}
          </h2>
          <div className="mt-1 flex items-center gap-1 text-primary-foreground/80">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{profile.distance}</span>
          </div>
          <p className="mt-2 text-primary-foreground/90">{profile.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
