import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { compressImage, formatBytes } from "@/lib/image";

interface ReceiptUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  className?: string;
}

const MAX_SIZE_MB = 20;

export function ReceiptUpload({ value, onChange, className }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedSize, setSavedSize] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSavedSize(null);

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    // The raw file used to go straight into the transaction document, so a
    // normal phone photo blew Firestore's 1MB limit and the write failed
    // silently. Shrink it first — this is also what keeps receipts working
    // offline, since the image queues with the expense instead of needing an
    // upload that offline persistence does not cover.
    setBusy(true);
    try {
      const result = await compressImage(file);
      onChange(result.dataUrl);
      setSavedSize(
        `${formatBytes(result.originalBytes)} → ${formatBytes(result.bytes)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image");
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border", className)}>
        <img src={value} alt="Receipt" className="h-40 w-full object-cover" />
        {savedSize && (
          <span className="absolute bottom-2 left-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
            Optimised {savedSize}
          </span>
        )}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={() => onChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        aria-busy={busy}
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          busy ? "cursor-wait opacity-70" : "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Camera className="h-5 w-5 text-primary" />
            )}
          </div>
          <p className="text-sm font-medium">
            {busy ? "Optimising photo…" : "Attach receipt photo"}
          </p>
          <p className="text-xs text-muted-foreground">
            {busy
              ? "Shrinking it so it saves offline too"
              : `Drag & drop or click to upload (max ${MAX_SIZE_MB}MB)`}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export function ReceiptThumbnail({ url, onClick }: { url: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 w-10 rounded-md overflow-hidden border shrink-0 hover:ring-2 ring-primary/50 transition-all"
    >
      <img src={url} alt="Receipt" className="h-full w-full object-cover" />
    </button>
  );
}
