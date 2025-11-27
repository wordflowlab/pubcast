import { useState, useEffect } from "react";
import { StatusBadge } from "./StatusBadge";
import { listProxies, deleteProxy, checkProxy } from "@/lib/tauri";
import { formatRelativeTime } from "@/lib/utils";
import type { Proxy } from "@/lib/types";

export function ProxyList() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProxies();
  }, []);

  async function loadProxies() {
    try {
      setLoading(true);
      const data = await listProxies();
      setProxies(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck(id: string) {
    try {
      setChecking(id);
      const result = await checkProxy(id);

      // Update proxy status in list
      setProxies(
        proxies.map((p) =>
          p.id === id
            ? {
                ...p,
                status: result.is_healthy ? "healthy" : "unhealthy",
                last_check_at: Math.floor(Date.now() / 1000),
                last_check_ip: result.exit_ip,
                last_check_location: result.location,
              }
            : p
        )
      );
    } catch (e) {
      alert(`检测失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setChecking(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此代理吗？")) return;

    try {
      await deleteProxy(id);
      setProxies(proxies.filter((p) => p.id !== id));
    } catch (e) {
      alert(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
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
          onClick={loadProxies}
          className="mt-2 text-sm underline hover:no-underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (proxies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">暂无代理</p>
        <p className="mt-2 text-sm text-gray-400">
          点击右上角按钮添加或导入代理
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              代理地址
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              状态
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              出口 IP
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              最后检测
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {proxies.map((proxy) => (
            <tr key={proxy.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="font-mono text-sm">
                  {proxy.protocol}://{proxy.host}:{proxy.port}
                </div>
                {proxy.username && (
                  <div className="text-xs text-gray-500">
                    用户: {proxy.username}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={proxy.status} />
                {proxy.fail_count > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    失败 {proxy.fail_count} 次
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {proxy.last_check_ip || "-"}
                {proxy.last_check_location && (
                  <span className="ml-2 text-gray-500">
                    ({proxy.last_check_location})
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatRelativeTime(proxy.last_check_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  onClick={() => handleCheck(proxy.id)}
                  disabled={checking === proxy.id}
                  className="mr-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {checking === proxy.id ? "检测中..." : "检测"}
                </button>
                <button
                  onClick={() => handleDelete(proxy.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
