import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge tailwind classes securely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
