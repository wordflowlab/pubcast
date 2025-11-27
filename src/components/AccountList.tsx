import { useState, useEffect } from "react";
import { listAccounts, deleteAccount } from "@/lib/tauri";
import { StatusBadge } from "./StatusBadge";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { Account } from "@/lib/types";
import { Search, RefreshCw } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

// Platform definitions with icons/colors and login URLs
const PLATFORMS = [
  { id: "netease", name: "网易", color: "bg-red-600", url: "https://mp.163.com/" },
  { id: "sohu", name: "搜狐", color: "bg-yellow-500", url: "https://mp.sohu.com/" },
  { id: "baijia", name: "百家号", color: "bg-blue-600", url: "https://baijiahao.baidu.com/" },
  { id: "toutiao", name: "头条号", color: "bg-red-500", url: "https://mp.toutiao.com/" },
  { id: "penguin", name: "企鹅号", color: "bg-blue-500", url: "https://om.qq.com/" },
  { id: "zhihu", name: "知乎", color: "bg-blue-400", url: "https://www.zhihu.com/" },
  { id: "wechat", name: "微信公众号", color: "bg-green-600", url: "https://mp.weixin.qq.com/" },
  { id: "xiaohongshu", name: "小红书图文", color: "bg-red-500", url: "https://creator.xiaohongshu.com/" },
  { id: "douyin", name: "抖音图文", color: "bg-black", url: "https://creator.douyin.com/" },
  { id: "bilibili", name: "哔哩图文", color: "bg-pink-400", url: "https://member.bilibili.com/" },
  { id: "csdn", name: "CSDN", color: "bg-red-600", url: "https://mp.csdn.net/" },
  { id: "jianshu", name: "简书", color: "bg-red-400", url: "https://www.jianshu.com/" },
];

// Open platform in internal webview
async function openPlatform(platform: { id: string; name: string; url: string }) {
  const webview = new WebviewWindow(`platform-${platform.id}`, {
    url: platform.url,
    title: `${platform.name} - 登录授权`,
    width: 1000,
    height: 700,
    center: true,
  });
  
  webview.once("tauri://error", (e) => {
    console.error("Failed to open webview:", e);
  });
}

export function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      const data = await listAccounts();
      setAccounts(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定要删除账号 "${name}" 吗？`)) return;
    try {
      await deleteAccount(id);
      setAccounts(accounts.filter((a) => a.id !== id));
    } catch (e) {
      alert(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform Selection Grid */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-medium text-slate-800">选择平台进行授权</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {PLATFORMS.map((platform) => (
            <div 
              key={platform.id}
              onClick={() => openPlatform(platform)}
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold", platform.color)}>
                {platform.name.substring(0, 1)}
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Account List Section */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">平台</span>
            <select className="h-9 rounded-md border-gray-200 text-sm text-slate-600 focus:border-blue-500 focus:ring-blue-500 outline-none">
              <option value="">选择平台</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">授权状态</span>
            <select className="h-9 rounded-md border-gray-200 text-sm text-slate-600 focus:border-blue-500 focus:ring-blue-500 outline-none">
              <option value="">选择状态</option>
              <option value="active">已授权</option>
              <option value="expired">已过期</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <button 
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            onClick={() => loadAccounts()}
          >
            <Search className="h-4 w-4" />
            搜索
          </button>
          <button 
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
            onClick={() => loadAccounts()}
          >
            <RefreshCw className="h-4 w-4" />
            重置
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            加载失败: {error}
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">昵称</th>
                  <th className="px-6 py-4 font-medium">头像</th>
                  <th className="px-6 py-4 font-medium">平台</th>
                  <th className="px-6 py-4 font-medium">授权状态</th>
                  <th className="px-6 py-4 font-medium">授权时间</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{account.name}</span>
                          {account.username && (
                            <span className="text-xs text-slate-500">@{account.username}</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-8 w-8 rounded-full bg-slate-200" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                        {PLATFORMS.find(p => p.id === account.platform)?.name || account.platform}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {formatRelativeTime(account.last_login_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(account.id, account.name)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 border-t border-gray-100 p-4 text-sm text-slate-500">
          <span>共 {accounts.length} 条</span>
          <select className="h-8 rounded border-gray-200 text-xs outline-none focus:border-blue-500">
            <option>20条/页</option>
          </select>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50" disabled>&lt;</button>
            <span className="px-2 text-slate-700">1</span>
            <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50" disabled>&gt;</button>
          </div>
          <span>前往 1 页</span>
        </div>
      </div>
    </div>
  );
}
