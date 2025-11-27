import { useState, useEffect } from "react";
import { StatusBadge } from "./StatusBadge";
import { listDistributionTasks, cancelDistributionTask } from "@/lib/tauri";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import type { DistributionTask } from "@/lib/types";

export function TaskList() {
  const [tasks, setTasks] = useState<DistributionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await listDistributionTasks();
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string, name: string | null) {
    if (!confirm(`确定要取消任务 "${name || id}" 吗？`)) return;

    try {
      await cancelDistributionTask(id);
      await loadTasks();
    } catch (e) {
      alert(`取消失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p>加载失败: {error}</p>
        <button
          onClick={loadTasks}
          className="mt-2 text-sm underline hover:no-underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">暂无任务</p>
        <p className="mt-2 text-sm text-gray-400">
          选择内容和目标账号创建发布任务
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onCancel={() => handleCancel(task.id, task.name)}
        />
      ))}
    </div>
  );
}

interface TaskCardProps {
  task: DistributionTask;
  onCancel: () => void;
}

function TaskCard({ task, onCancel }: TaskCardProps) {
  const progress =
    task.total_jobs > 0
      ? Math.round(
          ((task.completed_jobs + task.failed_jobs) / task.total_jobs) * 100
        )
      : 0;

  const canCancel = task.status === "pending" || task.status === "in_progress";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">
              {task.name || `任务 ${task.id.slice(0, 8)}`}
            </h3>
            <StatusBadge status={task.status} />
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>目标: {task.target_accounts.length} 个账号</span>
            <span>
              类型:{" "}
              {task.schedule_type === "scheduled" ? "定时发布" : "立即发布"}
            </span>
            {task.scheduled_at && (
              <span>计划时间: {formatDate(task.scheduled_at)}</span>
            )}
          </div>
        </div>

        {canCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-red-600 hover:text-red-800"
          >
            取消
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            进度: {task.completed_jobs + task.failed_jobs}/{task.total_jobs}
          </span>
          <span className="text-gray-500">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {task.failed_jobs > 0 && (
          <p className="mt-1 text-xs text-red-600">
            {task.failed_jobs} 个失败
          </p>
        )}
      </div>

      {/* Timestamps */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>创建于 {formatRelativeTime(task.created_at)}</span>
        {task.completed_at && (
          <span>完成于 {formatRelativeTime(task.completed_at)}</span>
        )}
      </div>

      {/* Error message */}
      {task.error_message && (
        <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-600">
          {task.error_message}
        </div>
      )}
    </div>
  );
}
