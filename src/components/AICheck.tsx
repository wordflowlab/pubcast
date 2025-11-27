import { useState, useEffect } from "react";
import { Play, Square, RefreshCw, Trash2, Download } from "lucide-react";
import { runAICheck, listAILogs, clearAILogs } from "@/lib/tauri";
import type { AICheckLog } from "@/lib/types";
import { cn } from "@/lib/utils";

const AI_PLATFORMS = [
  { id: "deepseek", name: "deepseek" },
  { id: "doubao", name: "豆包" },
  { id: "yuanbao", name: "元宝" },
  { id: "tongyi", name: "通义千问" },
  { id: "wenxin", name: "文心一言" },
  { id: "nanmi", name: "纳迷" },
  { id: "kimi", name: "kimi" },
  { id: "zhipu", name: "智谱清言" },
];

export function AICheck() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AICheckLog[]>([]);
  const [autoBrowser, setAutoBrowser] = useState(true);
  const [interval, setInterval] = useState(10);

  useEffect(() => {
    loadLogs();
    const timer = window.setInterval(() => {
      if (isRunning) {
        loadLogs();
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  async function loadLogs() {
    try {
      const data = await listAILogs(100);
      setLogs(data);
    } catch (e) {
      console.error("Failed to load logs:", e);
    }
  }

  async function handleStart() {
    try {
      setIsRunning(true);
      await runAICheck();
      await loadLogs();
    } catch (e) {
      console.error("Failed to start check:", e);
      setIsRunning(false);
    }
  }

  async function handleStop() {
    setIsRunning(false);
  }

  async function handleClear() {
    if (!confirm("确定要清空所有日志吗？")) return;
    try {
      await clearAILogs();
      setLogs([]);
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform List */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-medium text-slate-800">AI 分类</h3>
        <div className="flex flex-wrap gap-8">
          {AI_PLATFORMS.map((platform) => (
            <div key={platform.id} className="flex items-center gap-2 text-slate-600">
              <div className="h-5 w-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                {platform.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={handleStart}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-md bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4 fill-current" />
            开始执行
          </button>
          <button 
            onClick={handleStop}
            disabled={!isRunning}
            className="flex items-center gap-2 rounded-md bg-red-500 px-6 py-2 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="h-4 w-4 fill-current" />
            停止
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">当前状态</span>
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", isRunning ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600")}>
            {isRunning ? "运行中" : "就绪"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Config */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 h-fit">
          <h3 className="mb-6 text-base font-medium text-slate-800">发布配置</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">自动打开浏览器</span>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm", autoBrowser ? "text-blue-600" : "text-slate-400")}>开启</span>
                <button 
                  onClick={() => setAutoBrowser(!autoBrowser)}
                  className={cn("relative h-6 w-11 rounded-full transition-colors", autoBrowser ? "bg-blue-600" : "bg-slate-200")}
                >
                  <span className={cn("absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform", autoBrowser ? "translate-x-5" : "translate-x-0")} />
                </button>
                <span className={cn("text-sm", !autoBrowser ? "text-slate-600" : "text-slate-400")}>关闭</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">任务时间间隔(秒)</span>
              <div className="flex items-center">
                <button 
                  onClick={() => setInterval(Math.max(1, interval - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-l border border-r-0 border-gray-200 bg-gray-50 hover:bg-gray-100"
                >
                  -
                </button>
                <input 
                  type="number" 
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="h-8 w-16 border-y border-gray-200 text-center text-sm text-slate-600 outline-none"
                />
                <button 
                  onClick={() => setInterval(interval + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-r border border-l-0 border-gray-200 bg-gray-50 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button className="w-full rounded-md bg-blue-500 py-2 text-sm text-white hover:bg-blue-600 transition-colors">
                保存配置
              </button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-base font-medium text-slate-800">执行日志</h3>
              <button 
                onClick={loadLogs}
                className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                title="刷新日志"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <select className="h-8 rounded border border-gray-200 text-xs text-slate-600 outline-none px-2">
                <option>全部</option>
                <option>成功</option>
                <option>失败</option>
              </select>
              <button 
                onClick={handleClear}
                className="flex items-center gap-1 rounded px-3 py-1 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50"
              >
                <Trash2 className="h-3 w-3" />
                清空
              </button>
              <button className="flex items-center gap-1 rounded px-3 py-1 text-xs border border-gray-200 text-slate-600 hover:bg-gray-50">
                <Download className="h-3 w-3" />
                导出
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-lg border border-gray-100 bg-slate-900 p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-600">
                暂无日志
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-slate-300">
                    <span className="text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at * 1000).toLocaleTimeString()}
                    </span>
                    <span className={cn(
                      "px-1.5 rounded text-[10px] font-medium whitespace-nowrap",
                      log.status === "success" ? "bg-green-900/50 text-green-400" :
                      log.status === "failed" ? "bg-red-900/50 text-red-400" :
                      "bg-blue-900/50 text-blue-400"
                    )}>
                      {log.status.toUpperCase()}
                    </span>
                    <span className="text-slate-400 font-bold whitespace-nowrap">
                      [{AI_PLATFORMS.find(p => p.id === log.platform)?.name || log.platform}]
                    </span>
                    <span className="text-slate-300 break-all">
                      {log.message}
                    </span>
                    {log.duration_ms && (
                      <span className="text-slate-600 whitespace-nowrap ml-auto">
                        {log.duration_ms}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
