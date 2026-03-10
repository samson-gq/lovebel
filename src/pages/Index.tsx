import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star } from "lucide-react";
import SwipeCard from "@/components/SwipeCard";
import BottomNav from "@/components/BottomNav";
import { profiles } from "@/data/profiles";

const Index = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<string[]>([]);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (direction === "right") {
        const profile = profiles[currentIndex];
        if (profile) {
          const stored = JSON.parse(localStorage.getItem("matches") || "[]");
          const updated = [...stored, profile.id];
          localStorage.setItem("matches", JSON.stringify(updated));
          setMatches(updated);
        }
      }
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex]
  );

  const remaining = profiles.slice(currentIndex);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-center py-4">
        <h1 className="gradient-primary bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
          Spark
        </h1>
      </header>

      {/* Card stack */}
      <div className="relative mx-auto flex w-full max-w-sm flex-1 px-4 pb-24">
        <div className="relative h-[520px] w-full">
          {remaining.length > 0 ? (
            <AnimatePresence>
              {remaining
                .slice(0, 2)
                .reverse()
                .map((profile, i) => (
                  <SwipeCard
                    key={profile.id}
                    profile={profile}
                    onSwipe={handleSwipe}
                    isTop={i === remaining.slice(0, 2).length - 1}
                  />
                ))}
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center text-center"
            >
              <Star className="mb-4 h-16 w-16 text-secondary" />
              <h2 className="text-2xl font-bold text-foreground">
                Все просмотрено!
              </h2>
              <p className="mt-2 text-muted-foreground">
                Новые анкеты скоро появятся
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {remaining.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 flex items-center justify-center gap-6">
          <button
            onClick={() => handleSwipe("left")}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-card shadow-card transition-transform hover:scale-110 active:scale-95"
          >
            <X className="h-7 w-7 text-primary" />
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="gradient-primary flex h-20 w-20 items-center justify-center rounded-full shadow-elevated transition-transform hover:scale-110 active:scale-95"
          >
            <Heart className="h-9 w-9 text-primary-foreground" />
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Index;
