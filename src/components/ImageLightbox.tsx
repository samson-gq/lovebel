import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface Props {
  url: string;
  onClose: () => void;
}

const ImageLightbox = ({ url, onClose }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-card hover:bg-muted"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt="Просмотр изображения"
        className="max-h-full max-w-full rounded-2xl object-contain shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
};

export default ImageLightbox;
