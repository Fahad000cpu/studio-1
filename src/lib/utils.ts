import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name?: string | null) => {
  if (!name) return "";
  const nameParts = name.trim().split(" ");
  if (nameParts.length === 1 && nameParts[0].length > 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  return nameParts
    .map((part) => part[0])
    .filter(Boolean) // Ensure empty parts (from multiple spaces) don't result in extra characters
    .join("")
    .toUpperCase();
};
