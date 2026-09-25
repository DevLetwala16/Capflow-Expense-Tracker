"use client";

import React from "react";
import * as icons from "lucide-react";
import { Circle, Tag, LucideIcon } from "lucide-react";

interface DynamicIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

// Direct lookup map for common category and system icons
const ICON_MAP: Record<string, LucideIcon> = {
  "utensils": icons.Utensils,
  "home": icons.Home,
  "plane": icons.Plane,
  "zap": icons.Zap,
  "clapperboard": icons.Clapperboard,
  "shopping-bag": icons.ShoppingBag,
  "heart-pulse": icons.HeartPulse,
  "banknote": icons.Banknote,
  "wallet": icons.Wallet,
  "circle-ellipsis": icons.CircleEllipsis,
  "target": icons.Target,
  "car": icons.Car,
  "graduation-cap": icons.GraduationCap,
  "heart": icons.Heart,
  "piggy-bank": icons.PiggyBank,
  "briefcase": icons.Briefcase,
  "gift": icons.Gift,
  "star": icons.Star,
  "smartphone": icons.Smartphone,
  "coffee": icons.Coffee,
  "bike": icons.Bike,
  "baby": icons.Baby,
  "music": icons.Music,
  "book-open": icons.BookOpen,
  "dumbbell": icons.Dumbbell,
  "camera": icons.Camera,
  "trending-up": icons.TrendingUp,
  "trending-down": icons.TrendingDown,
  "tag": icons.Tag,
};

export function DynamicIcon({ name, size = 18, color, className }: DynamicIconProps) {
  // First try direct lookup
  let Icon = ICON_MAP[name.toLowerCase()];

  // If not found, convert kebab-case to PascalCase
  if (!Icon) {
    const pascalName = name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("") as keyof typeof icons;

    const candidate = icons[pascalName];
    if (candidate && (typeof candidate === "function" || typeof candidate === "object")) {
      Icon = candidate as LucideIcon;
    }
  }

  // Fallback to Tag or Circle if not found
  if (!Icon) {
    return <Tag size={size} color={color} className={className} />;
  }

  return <Icon size={size} color={color} className={className} />;
}
