import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant?: "default" | "warning" | "danger" | "accent";
}

const variantStyles = {
  default: "cyber-border cyber-glow",
  warning: "border border-warning/30 shadow-[0_0_20px_hsl(35_90%_55%/0.2)]",
  danger: "border border-destructive/30 danger-glow",
  accent: "border border-accent/30 success-glow",
};

const iconVariantStyles = {
  default: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  accent: "text-accent",
};

export default function StatCard({ title, value, icon, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-lg p-5 ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-2">{title}</p>
          <p className="text-3xl font-bold font-mono">{value}</p>
        </div>
        <div className={`p-2 rounded-md bg-secondary ${iconVariantStyles[variant]}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
