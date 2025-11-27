import { getStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const colors = getStatusColor(status);

  const statusLabels: Record<string, string> = {
    active: "正常",
    expired: "已过期",
    error: "异常",
    unknown: "未知",
    healthy: "健康",
    unhealthy: "不可用",
    pending: "等待中",
    running: "运行中",
    in_progress: "进行中",
    success: "成功",
    failed: "失败",
    cancelled: "已取消",
    completed: "已完成",
    ready: "就绪",
    draft: "草稿",
    published: "已发布",
    deleted: "已删除",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      )}
      {statusLabels[status] || status}
    </span>
  );
}
