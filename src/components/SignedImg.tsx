import { ImgHTMLAttributes } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface SignedImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: string;
}

/**
 * <img> that resolves Supabase Storage URLs (avatars, profile-videos, chat-images)
 * into fresh signed URLs at render time. Non-storage URLs are passed through.
 */
export function SignedImg({ src, fallback = "/placeholder.svg", alt = "", ...rest }: SignedImgProps) {
  const resolved = useSignedUrl(src, fallback);
  return <img src={resolved ?? fallback} alt={alt} {...rest} />;
}
