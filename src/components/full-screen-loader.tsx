import { Flame } from "lucide-react";

export function FullScreenLoader({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Flame className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded-md">
          {message}
        </p>
      </div>
    </div>
  );
}
