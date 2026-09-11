"use client";

import { type LucideIcon } from "lucide-react";
import * as icons from "lucide-react";

interface DynamicIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function DynamicIcon({ name, size = 18, color, className }: DynamicIconProps) {
  // Convert kebab-case to PascalCase: "heart-pulse" -> "HeartPulse"
  const iconName = name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("") as keyof typeof icons;

  const Icon = icons[iconName] as LucideIcon | undefined;

  if (!Icon || typeof Icon !== "function") {
    return <span style={{ color, fontSize: size }}>●</span>;
  }

  return <Icon size={size} color={color} className={className} />;
}
