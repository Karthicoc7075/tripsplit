import { useRef, useState } from "react";
import { Camera, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReceiptUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  className?: string;
}

const MAX_SIZE_MB = 5;

export function ReceiptUpload({ value, onChange, className }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden border", className)}>
        <img src={value} alt="Receipt" className="w-full h-40 object-cover" />
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
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">Attach receipt photo</p>
          <p className="text-xs text-muted-foreground">
            Drag & drop or click to upload (max {MAX_SIZE_MB}MB)
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

export function ReceiptPreview({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <ImageIcon className="h-3.5 w-3.5" />
      <span>Receipt attached</span>
    </div>
  );
}