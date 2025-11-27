import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listAIConfigs, toggleAIAuth } from "@/lib/tauri";
import type { AIConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const AI_PLATFORMS = [
  { id: "deepseek", name: "deepseek", url: "https://platform.deepseek.com/" },
  { id: "doubao", name: "豆包", url: "https://www.doubao.com/" },
  { id: "yuanbao", name: "元宝", url: "https://yuanbao.tencent.com/" },
  { id: "tongyi", name: "通义千问", url: "https://tongyi.aliyun.com/" },
  { id: "wenxin", name: "文心一言", url: "https://yiyan.baidu.com/" },
  { id: "nanmi", name: "纳迷", url: "https://namic.ai/" },
  { id: "kimi", name: "kimi", url: "https://kimi.moonshot.cn/" },
  { id: "zhipu", name: "智谱清言", url: "https://chatglm.cn/" },
];

// Open AI platform in internal webview
async function openAIPlatform(platform: { id: string; name: string; url: string }) {
  const webview = new WebviewWindow(`ai-${platform.id}`, {
    url: platform.url,
    title: `${platform.name} - 获取API Key`,
    width: 1000,
    height: 700,
    center: true,
  });
  
  webview.once("tauri://error", (e) => {
    console.error("Failed to open webview:", e);
  });
}

export function AIAuth() {
  const [configs, setConfigs] = useState<Record<string, AIConfig>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      const data = await listAIConfigs();
      const configMap = data.reduce((acc, curr) => {
        acc[curr.platform] = curr;
        return acc;
      }, {} as Record<string, AIConfig>);
      setConfigs(configMap);
    } catch (e) {
      console.error("Failed to load AI configs:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAuth(platform: string) {
    try {
      const updated = await toggleAIAuth(platform);
      setConfigs(prev => ({ ...prev, [platform]: updated }));
    } catch (e) {
      console.error("Failed to toggle auth:", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="mb-4">
          <h3 className="text-base font-medium text-slate-800">选择 AI 平台</h3>
          <p className="text-sm text-slate-500 mt-1">选择需要授权的 AI 平台</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {AI_PLATFORMS.map((platform) => {
            const config = configs[platform.id];
            const isActive = config?.status === "active";
            
            return (
              <div 
                key={platform.id}
                className={cn(
                  "group relative flex flex-col rounded-lg border bg-white p-4 transition-all hover:shadow-md",
                  isActive ? "border-green-200 bg-green-50/30" : "border-gray-100 hover:border-blue-200"
                )}
              >
                <div 
                  className="flex w-full cursor-pointer items-center gap-3"
                  onClick={() => openAIPlatform(platform)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold">
                    {platform.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                      {platform.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      点击前往登录
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex w-full items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1">
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full", isActive ? "bg-green-500" : "bg-slate-300")}></span>
                    <span className={cn("text-xs", isActive ? "text-green-600" : "text-slate-400")}>
                      {isActive ? "已开通" : "未开通"}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAuth(platform.id);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {isActive ? "关闭" : "开通"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auth List */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-base font-medium text-slate-800">授权列表</h3>
          <button 
            onClick={loadConfigs}
            className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            刷新
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">授权时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(configs).filter(c => c.status === "active").map((config) => (
                <tr key={config.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {AI_PLATFORMS.find(p => p.id === config.platform)?.name || config.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      已开通
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(config.updated_at * 1000).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleToggleAuth(config.platform)}
                      className="text-red-600 hover:text-red-900"
                    >
                      停用
                    </button>
                  </td>
                </tr>
              ))}
              {Object.values(configs).every(c => c.status !== "active") && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    暂无授权记录，请先在上访选择平台进行授权
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
