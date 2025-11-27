import { useState, useEffect } from "react";
import { StatusBadge } from "./StatusBadge";
import { listContents, syncContents } from "@/lib/tauri";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { Content } from "@/lib/types";

export function ContentList() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContents();
  }, []);

  async function loadContents() {
    try {
      setLoading(true);
      const data = await listContents();
      setContents(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await syncContents();
      alert(`同步完成: ${result.synced} 成功, ${result.failed} 失败`);
      await loadContents();
    } catch (e) {
      alert(`同步失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
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
          onClick={loadContents}
          className="mt-2 text-sm underline hover:no-underline"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">内容列表</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {syncing ? "同步中..." : "同步内容"}
        </button>
      </div>

      {contents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">暂无内容</p>
          <p className="mt-2 text-sm text-gray-400">
            点击同步按钮从远程 CMS 获取内容
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contents.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ContentCardProps {
  content: Content;
}

function ContentCard({ content }: ContentCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {content.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
          <img
            src={content.cover_image_url}
            alt={content.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 line-clamp-2">
            {content.title}
          </h3>
          <StatusBadge status={content.status} showDot={false} />
        </div>

        {content.body && (
          <p className="mb-3 text-sm text-gray-600 line-clamp-2">
            {truncate(content.body.replace(/<[^>]*>/g, "").replace(/[#*`]/g, ""), 100)}
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {content.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
          {content.tags && content.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{content.tags.length - 3}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{content.author || "未知作者"}</span>
          <span>{formatRelativeTime(content.local_updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
