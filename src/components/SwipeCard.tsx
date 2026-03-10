import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin } from "lucide-react";
import type { Profile } from "@/data/profiles";

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
}

const SwipeCard = ({ profile, onSwipe, isTop }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) {
      onSwipe("right");
    } else if (info.offset.x < -120) {
      onSwipe("left");
    }
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
          src={profile.image}
          alt={profile.name}
          className="h-full w-full object-cover"
          draggable={false}
        />

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

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-3xl font-bold text-primary-foreground">
            {profile.name}, {profile.age}
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
