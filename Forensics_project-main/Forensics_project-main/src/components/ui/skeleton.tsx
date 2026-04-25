import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  cyber?: boolean;
}

function Skeleton({ className, cyber = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        cyber ? "skeleton-cyber" : "animate-pulse bg-muted",
        "rounded-md",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
