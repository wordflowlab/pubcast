import { useState, useEffect } from "react";
import { 
  Play, Square, RefreshCw, Save, 
  Settings as SettingsIcon, Info, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listAccounts, listContents, getOverallStats } from "@/lib/tauri";

// Mock logs for demonstration
interface LogEntry {
  id: string;
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export function TaskList() {
  // Stats State
  const [stats, setStats] = useState({
    authorizedAccounts: 0,
    todayPublished: 0,
    totalPublished: 0,
    totalArticles: 0,
  });

  // Control State
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("就绪");
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toLocaleString());

  // Config State
  const [config, setConfig] = useState({
    autoOpenBrowser: false,
    publishInterval: 10,
  });

  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "1", time: new Date().toLocaleTimeString(), level: "INFO", message: "发布系统已就绪" },
    { id: "2", time: new Date(Date.now() - 2000).toLocaleTimeString(), level: "INFO", message: "等待开始发布任务..." },
  ]);
  const [logFilter, setLogFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [accounts, contents, overallStats] = await Promise.all([
        listAccounts(),
        listContents(),
        getOverallStats().catch(() => ({ total_publishes: 0, successful_publishes: 0 }))
      ]);

      setStats({
        authorizedAccounts: accounts.length,
        todayPublished: 0, // TODO: Need backend API for daily stats
        totalPublished: overallStats.total_publishes || 0,
        totalArticles: contents.length,
      });
      
      setLastUpdateTime(new Date().toLocaleString());
    } catch (error) {
      console.error("Failed to load data:", error);
      addLog("ERROR", "加载数据失败");
    }
  }

  function addLog(level: "INFO" | "WARN" | "ERROR", message: string) {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }

  function handleStart() {
    setIsRunning(true);
    setStatusMessage("正在运行");
    addLog("INFO", "开始发布任务...");
    // Call backend to start scheduler
  }

  function handleStop() {
    setIsRunning(false);
    setStatusMessage("已停止");
    addLog("WARN", "停止发布任务");
    // Call backend to stop scheduler
  }

  function handleSaveConfig() {
    addLog("INFO", `配置已保存: 自动打开浏览器=${config.autoOpenBrowser ? '开启' : '关闭'}, 间隔=${config.publishInterval}秒`);
  }

  function handleClearLogs() {
    setLogs([]);
  }

  function handleExportLogs() {
    const content = logs.map(l => `[${l.time}] [${l.level}] ${l.message}`).join('\n');
    // TODO: Save to file
    console.log("Export logs:", content);
    alert("日志已导出到控制台");
  }

  return (
    <div className="space-y-6">
      {/* Stats Panel */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-slate-800">发布统计</h3>
          <button 
            onClick={loadData}
            className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-3 w-3" />
            刷新
          </button>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="授权账号数" 
            value={stats.authorizedAccounts} 
            color="bg-[#7c3aed]" // Purple
            icon={<SettingsIcon className="h-6 w-6 opacity-80" />}
          />
          <StatCard 
            title="今日发布" 
            value={stats.todayPublished} 
            color="bg-[#db2777]" // Pink
            icon={<CheckCircle2 className="h-6 w-6 opacity-80" />}
          />
          <StatCard 
            title="累计发布" 
            value={stats.totalPublished} 
            color="bg-[#0ea5e9]" // Blue
            icon={<Info className="h-6 w-6 opacity-80" />}
          />
          <StatCard 
            title="文章数" 
            value={stats.totalArticles} 
            color="bg-[#22c55e]" // Green
            icon={<AlertCircle className="h-6 w-6 opacity-80" />}
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-slate-800">发布控制</h3>
          <div className="text-xs text-gray-500">
            {lastUpdateTime}
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-4">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 rounded-lg bg-[#3b82f6] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                开始发布
              </button>
            ) : (
              <button className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-400">
                <Play className="h-4 w-4 fill-current" />
                开始发布
              </button>
            )}
            
            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 rounded-lg bg-[#ef4444] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 active:scale-95"
              >
                <Square className="h-4 w-4 fill-current" />
                停止发布
              </button>
            ) : (
              <button className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-400">
                <Square className="h-4 w-4 fill-current" />
                停止发布
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">当前状态</div>
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium",
              isRunning ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
            )}>
              <div className={cn("h-2 w-2 rounded-full", isRunning ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
              {statusMessage}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Config Panel */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="mb-6 text-base font-medium text-slate-800">发布配置</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">自动打开浏览器</span>
              <div className="flex items-center gap-2">
                <button 
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    config.autoOpenBrowser ? "bg-blue-500" : "bg-gray-200"
                  )}
                  onClick={() => setConfig(c => ({ ...c, autoOpenBrowser: !c.autoOpenBrowser }))}
                >
                  <span className={cn(
                    "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform",
                    config.autoOpenBrowser ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
                <span className={cn(
                  "text-sm whitespace-nowrap",
                  config.autoOpenBrowser ? "text-blue-600" : "text-gray-500"
                )}>
                  {config.autoOpenBrowser ? "开启" : "关闭"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">作品发布间隔(秒)</span>
                <span className="text-sm font-medium text-gray-900">{config.publishInterval}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 hover:bg-gray-50"
                  onClick={() => setConfig(c => ({ ...c, publishInterval: Math.max(1, c.publishInterval - 1) }))}
                >
                  -
                </button>
                <input 
                  type="number" 
                  value={config.publishInterval}
                  onChange={(e) => setConfig(c => ({ ...c, publishInterval: parseInt(e.target.value) || 0 }))}
                  className="flex-1 rounded border border-gray-200 py-1 text-center text-sm"
                />
                <button 
                  className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 hover:bg-gray-50"
                  onClick={() => setConfig(c => ({ ...c, publishInterval: c.publishInterval + 1 }))}
                >
                  +
                </button>
              </div>
            </div>

            <button 
              onClick={handleSaveConfig}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
            >
              <Save className="h-4 w-4" />
              保存配置
            </button>
          </div>
        </div>

        {/* Log Panel */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-800">发布日志</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleClearLogs}
                className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                清空日志
              </button>
              <button 
                onClick={handleExportLogs}
                className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                导出日志
              </button>
            </div>
          </div>

          <div className="mb-3">
            <select 
              value={logFilter} 
              onChange={(e) => setLogFilter(e.target.value)}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 outline-none focus:border-blue-500"
            >
              <option value="all">全部</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>
          </div>

          <div className="h-[260px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  暂无日志
                </div>
              ) : (
                logs
                  .filter(l => logFilter === 'all' || l.level.toLowerCase() === logFilter)
                  .map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-xs font-mono">
                      <span className="text-gray-400 shrink-0">{log.time}</span>
                      <span className={cn(
                        "shrink-0 px-1.5 py-0.5 rounded font-medium text-[10px]",
                        log.level === "INFO" && "bg-blue-100 text-blue-700",
                        log.level === "WARN" && "bg-amber-100 text-amber-700",
                        log.level === "ERROR" && "bg-red-100 text-red-700",
                      )}>
                        {log.level}
                      </span>
                      <span className="text-gray-600 break-all">{log.message}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg p-6 text-white shadow-sm transition-transform hover:scale-[1.02]", color)}>
      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        <div className="text-4xl font-bold tracking-tight">{value}</div>
        <div className="text-sm font-medium opacity-90">{title}</div>
      </div>
      {icon && (
        <div className="absolute -right-2 -bottom-2 text-white/20 rotate-12 scale-150">
          {icon}
        </div>
      )}
    </div>
  );
}

