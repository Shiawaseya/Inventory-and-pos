import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** API returns relative paths like /uploads/...; Vite proxies /uploads in dev.
 *  In production set VITE_ASSET_BASE_URL if images live on another origin. */
export function resolveImageUrl(url?: string | null) {
  if (!url) return null;
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  return `${import.meta.env.VITE_ASSET_BASE_URL ?? ""}${url}`;
}

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
  fit?: "cover" | "contain";
};

export function ProductImage({
  src,
  alt,
  className,
  iconSize = 22,
  fit = "contain",
}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = resolveImageUrl(src);
  const showImage = url && !failed;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-muted/50",
        // soft pooled light behind the product so white-background photos don't look pasted on
        "bg-[radial-gradient(ellipse_at_50%_35%,var(--background),transparent_75%)]",
        showImage && !loaded && "animate-pulse",
        className,
      )}
    >
      {showImage ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "size-full transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            fit === "contain" ? "object-contain p-2.5" : "object-cover",
          )}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
          <ImageOff size={iconSize} aria-label="No image" />
        </div>
      )}
    </div>
  );
}
