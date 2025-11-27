import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface PublishStats {
  total_publishes: number;
  successful_publishes: number;
  failed_publishes: number;
  success_rate: number;
  avg_duration_ms: number | null;
}

interface PlatformStats {
  platform: string;
  total_publishes: number;
  successful_publishes: number;
  failed_publishes: number;
}

const platformNames: Record<string, string> = {
  wechat: "微信公众号",
  xiaohongshu: "小红书",
  weibo: "微博",
  douyin: "抖音",
  bilibili: "B站",
  zhihu: "知乎",
};

export function StatsPanel() {
  const [stats, setStats] = useState<PublishStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const [overall, platforms] = await Promise.all([
        invoke<PublishStats>("get_overall_stats"),
        invoke<PlatformStats[]>("get_platform_stats"),
      ]);
      setStats(overall);
      setPlatformStats(platforms);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">发布统计</h2>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 border border-red-100">
          <p>加载失败: {error}</p>
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="授权账号数"
              value={platformStats.length} // Mock value for now
              bgClass="bg-purple-500"
            />
            <StatCard
              title="今日发布"
              value={stats?.total_publishes ?? 0} // Should be today's count
              bgClass="bg-pink-500"
            />
            <StatCard
              title="累计发布"
              value={stats?.total_publishes ?? 0}
              bgClass="bg-blue-400"
            />
            <StatCard
              title="文章数"
              value={stats?.successful_publishes ?? 0}
              bgClass="bg-green-400"
            />
          </div>

          {/* Platform Stats Table (Optional, keeping it for detail) */}
          {platformStats.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="mb-4 font-medium text-slate-800">各平台数据详情</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        平台
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        总数
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        成功
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        失败
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        成功率
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {platformStats.map((ps) => {
                      const rate =
                        ps.total_publishes > 0
                          ? ((ps.successful_publishes / ps.total_publishes) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr key={ps.platform} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                            {platformNames[ps.platform] || ps.platform}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                            {ps.total_publishes}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-green-600">
                            {ps.successful_publishes}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-red-600">
                            {ps.failed_publishes}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                            {rate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  bgClass: string;
}

function StatCard({ title, value, bgClass }: StatCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg py-8 text-white shadow-sm transition-transform hover:scale-[1.02]", bgClass)}>
      <div className="text-4xl font-bold">{value}</div>
      <div className="mt-2 text-sm font-medium opacity-90">{title}</div>
    </div>
  );
}
