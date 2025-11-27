/**
 * Utility functions
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "-";

  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;

  return formatDate(timestamp);
}

/**
 * Get status color class
 */
export function getStatusColor(
  status: string
): { bg: string; text: string; dot: string } {
  switch (status) {
    case "active":
    case "healthy":
    case "success":
    case "completed":
    case "ready":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        dot: "bg-green-500",
      };
    case "expired":
    case "unhealthy":
    case "failed":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        dot: "bg-red-500",
      };
    case "error":
    case "cancelled":
      return {
        bg: "bg-orange-100",
        text: "text-orange-800",
        dot: "bg-orange-500",
      };
    case "running":
    case "in_progress":
    case "pending":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        dot: "bg-blue-500",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        dot: "bg-gray-500",
      };
  }
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    wechat: "微信公众号",
    xiaohongshu: "小红书",
    weibo: "微博",
    douyin: "抖音",
    bilibili: "B站",
    zhihu: "知乎",
  };
  return names[platform] || platform;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
