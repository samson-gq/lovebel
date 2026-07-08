import { useState, useRef } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { SignedImg } from "@/components/SignedImg";

interface ProfilePhoto {
  id: string;
  photo_url: string;
  position: number;
}

interface Props {
  photos: ProfilePhoto[];
  editing: boolean;
  maxPhotos: number;
  onReorder: (photos: ProfilePhoto[]) => void;
  onDelete: (photo: ProfilePhoto) => void;
  onAddClick: () => void;
}

const DraggablePhotoGrid = ({ photos, editing, maxPhotos, onReorder, onDelete, onAddClick }: Props) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    if (!editing) return;
    dragRef.current = index;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!editing) return;
    setOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (!editing || dragRef.current === null || dragRef.current === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    const reordered = [...photos];
    const [moved] = reordered.splice(dragRef.current, 1);
    reordered.splice(index, 0, moved);

    const updated = reordered.map((p, i) => ({ ...p, position: i }));
    onReorder(updated);
    setDragIndex(null);
    setOverIndex(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
    dragRef.current = null;
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          draggable={editing}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`group relative aspect-square overflow-hidden rounded-xl transition-all ${
            dragIndex === index ? "scale-95 opacity-50" : ""
          } ${overIndex === index && dragIndex !== index ? "ring-2 ring-primary" : ""}`}
        >
          <SignedImg
            src={photo.photo_url}
            alt="Фото профиля"
            className="h-full w-full object-cover"
            draggable={false}
          />
          {editing && (
            <>
              <div className="absolute left-1 top-1 flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur-sm">
                <GripVertical className="h-4 w-4" />
              </div>
              <button
                onClick={() => onDelete(photo)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive/80 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ))}
      {photos.length < maxPhotos && (
        <button
          onClick={onAddClick}
          className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-8 w-8" />
        </button>
      )}
    </div>
  );
};

export default DraggablePhotoGrid;
