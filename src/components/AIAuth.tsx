import { useState, useEffect, useCallback, useRef } from "react";
import { 
  listAccounts, 
  addAccount, 
  deleteAccount,
  updateAccount,
  launchBrowser, 
  browserNavigate, 
  browserHealthCheck, 
  syncAuthFromBrowser,
  browserClose,
  browserGetSessions,
  browserGetLoginState,
  restartSidecar,
  type Account,
  type BrowserSession
} from "@/lib/tauri";
import { cn, formatRelativeTime } from "@/lib/utils";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Trash2,
  Loader2,
  Plus,
  Monitor
} from "lucide-react";

// AI Platform definitions
interface Platform {
  id: string;
  name: string;
  color: string;
  loginUrl: string;
  homeUrl: string;
}

const AI_PLATFORMS: Platform[] = [
  { id: "deepseek", name: "DeepSeek", color: "bg-blue-600", loginUrl: "https://chat.deepseek.com/", homeUrl: "https://chat.deepseek.com/" },
  { id: "doubao", name: "豆包", color: "bg-blue-500", loginUrl: "https://www.doubao.com/", homeUrl: "https://www.doubao.com/" },
  { id: "yuanbao", name: "元宝", color: "bg-yellow-500", loginUrl: "https://yuanbao.tencent.com/", homeUrl: "https://yuanbao.tencent.com/" },
  { id: "qwen", name: "通义千问", color: "bg-purple-600", loginUrl: "https://tongyi.aliyun.com/qianwen/", homeUrl: "https://tongyi.aliyun.com/qianwen/" },
  { id: "wenxin", name: "文心一言", color: "bg-blue-400", loginUrl: "https://yiyan.baidu.com/", homeUrl: "https://yiyan.baidu.com/" },
  { id: "kimi", name: "Kimi", color: "bg-purple-500", loginUrl: "https://kimi.moonshot.cn/", homeUrl: "https://kimi.moonshot.cn/" },
  { id: "zhipu", name: "智谱清言", color: "bg-blue-500", loginUrl: "https://chatglm.cn/", homeUrl: "https://chatglm.cn/" },
  { id: "chatgpt", name: "ChatGPT", color: "bg-green-500", loginUrl: "https://chat.openai.com/", homeUrl: "https://chat.openai.com/" },
  { id: "claude", name: "Claude", color: "bg-orange-500", loginUrl: "https://claude.ai/", homeUrl: "https://claude.ai/" },
  { id: "gemini", name: "Gemini", color: "bg-blue-600", loginUrl: "https://gemini.google.com/", homeUrl: "https://gemini.google.com/" },
];

const AI_PLATFORM_IDS = new Set(AI_PLATFORMS.map(p => p.id));

export function AIAuth() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeSessions, setActiveSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sidecarOnline, setSidecarOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Load accounts and sessions with retry
  const loadData = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      
      // Check sidecar health
      const isHealthy = await browserHealthCheck().catch(() => false);
      setSidecarOnline(isHealthy);
      
      if (!isHealthy) {
        setError("Playwright 服务未启动");
      } else {
        setError(null);
      }

      // Load accounts from DB
      const data = await listAccounts();
      // Filter for AI accounts only
      const aiAccounts = data.filter(acc => AI_PLATFORM_IDS.has(acc.platform));
      setAccounts(aiAccounts);

      // Load active sessions if sidecar is up
      if (isHealthy) {
        const sessions = await browserGetSessions();
        setActiveSessions(sessions);
      }
      
    } catch (e) {
      // Retry if backend not ready
      if (retryCount < 3) {
        setTimeout(() => loadData(retryCount + 1), 1000);
        return;
      }
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      if (sidecarOnline) {
        try {
          const sessions = await browserGetSessions();
          setActiveSessions(sessions);
        } catch {}
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadData, sidecarOnline]);

  // Add new account
  const handleAddAccount = async (platform: Platform) => {
    try {
      setActionLoading("creating-" + platform.id);
      const newAccount = await addAccount(platform.id, `${platform.name}-未命名`);
      setAccounts(prev => [newAccount, ...prev]);
      await handleLaunch(newAccount, platform, true);
    } catch (e) {
      alert(`创建失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Login watcher ref
  const loginWatcherRef = useRef<NodeJS.Timeout | null>(null);

  // Start watching login status
  const startLoginWatcher = useCallback((accountId: string) => {
    // Clear existing watcher
    if (loginWatcherRef.current) {
      clearInterval(loginWatcherRef.current);
    }
    
    console.log(`[AIAuth] 👀 Starting login watcher for ${accountId}`);
    
    loginWatcherRef.current = setInterval(async () => {
      try {
        const state = await browserGetLoginState(accountId);
        console.log(`[AIAuth] Login state:`, state);
        
        if (state.success && state.isLoggedIn) {
          console.log(`[AIAuth] ✅ Login detected for ${accountId}!`);
          
          // Stop watcher
          if (loginWatcherRef.current) {
            clearInterval(loginWatcherRef.current);
            loginWatcherRef.current = null;
          }
          
          // Auto sync and close
          try {
            const result = await syncAuthFromBrowser(accountId);
            if (result.success) {
              console.log(`[AIAuth] 💾 Auth synced for ${accountId}`);
              await browserClose(accountId);
              await loadData(); // Reload to show updated status
            }
          } catch (e) {
            console.error('[AIAuth] Sync error:', e);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }, 2000); // Check every 2 seconds
  }, [loadData]);

  // Stop login watcher
  const stopLoginWatcher = useCallback(() => {
    if (loginWatcherRef.current) {
      clearInterval(loginWatcherRef.current);
      loginWatcherRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoginWatcher();
    };
  }, [stopLoginWatcher]);

  // Launch browser
  const handleLaunch = async (account: Account, platform: Platform, isAuth = false) => {
    if (!sidecarOnline) {
      alert("Playwright 服务未启动");
      return;
    }

    try {
      setActionLoading(account.id);
      
      const launchResult = await launchBrowser(account.id, platform.id, undefined, false);
      if (!launchResult.success) throw new Error(launchResult.error);

      const url = isAuth ? platform.loginUrl : platform.homeUrl;
      const navResult = await browserNavigate(account.id, url);
      if (!navResult.success) throw new Error(navResult.error);

      const sessions = await browserGetSessions();
      setActiveSessions(sessions);
      
      // Start watching for login (sidecar also watches, but we poll for UI update)
      if (isAuth) {
        startLoginWatcher(account.id);
      }
      
    } catch (e) {
      alert(`启动失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm auth (manual, still available as backup)
  const handleConfirmAuth = async (account: Account) => {
    try {
      setActionLoading(account.id);
      stopLoginWatcher(); // Stop auto-watcher
      
      const result = await syncAuthFromBrowser(account.id);
      if (!result.success) throw new Error(result.error);

      await browserClose(account.id);
      await loadData(); // Reload to get updated status
      
    } catch (e) {
      alert(`同步失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete account
  const handleDelete = async (account: Account) => {
    const confirmed = window.confirm(`确定要删除账号 "${account.name}" 吗？`);
    if (!confirmed) return;
    
    try {
      setActionLoading(account.id);
      if (activeSessions.some(s => s.accountId === account.id)) {
        await browserClose(account.id);
      }
      await deleteAccount(account.id);
      setAccounts(prev => prev.filter(a => a.id !== account.id));
    } catch (e) {
      console.error('Delete failed:', e);
      alert(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sidecar Status */}
      {!sidecarOnline && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Playwright 服务未启动</p>
            <p className="text-sm">正在尝试启动服务...</p>
          </div>
          <button 
            onClick={async () => {
              try {
                await restartSidecar();
                await loadData();
              } catch (e) {
                setError(`启动失败: ${e instanceof Error ? e.message : String(e)}`);
              }
            }} 
            className="flex items-center gap-1 text-sm font-medium hover:underline"
          >
            <RefreshCw className="h-4 w-4" /> 重试
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">加载失败</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-sm underline hover:no-underline">
            关闭
          </button>
        </div>
      )}

      {/* Platform Selection */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-medium text-slate-800">选择 AI 平台</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {AI_PLATFORMS.map((platform) => (
            <button 
              key={platform.id}
              onClick={() => handleAddAccount(platform)}
              disabled={!!actionLoading || !sidecarOnline}
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-blue-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-left min-w-0"
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold shrink-0", platform.color)}>
                {platform.name.substring(0, 1)}
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 flex-1 whitespace-nowrap">
                {actionLoading === "creating-" + platform.id ? "创建中..." : platform.name}
              </span>
              <Plus className="h-4 w-4 ml-auto text-slate-300 group-hover:text-blue-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Auth List */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-base font-medium text-slate-800">授权列表</h3>
          <button onClick={() => loadData()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <RefreshCw className="h-4 w-4" /> 刷新
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">账号信息</th>
                  <th className="px-6 py-4 font-medium">平台</th>
                  <th className="px-6 py-4 font-medium">授权状态</th>
                  <th className="px-6 py-4 font-medium">最后更新</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      暂无授权记录，请先在上访选择平台进行授权
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => {
                    const platform = AI_PLATFORMS.find(p => p.id === account.platform);
                    const isActive = activeSessions.some(s => s.accountId === account.id);
                    const isAuthorized = account.auth_status === "authorized";
                    const isLoading = actionLoading === account.id;

                    return (
                      <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold", platform?.color || "bg-slate-400")}>
                              {account.name.substring(0, 1)}
                            </div>
                            <div className="flex flex-col">
                              {editingId === account.id ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onBlur={async () => {
                                    if (editName.trim() && editName !== account.name) {
                                      await updateAccount(account.id, editName.trim());
                                      await loadData();
                                    }
                                    setEditingId(null);
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      if (editName.trim() && editName !== account.name) {
                                        await updateAccount(account.id, editName.trim());
                                        await loadData();
                                      }
                                      setEditingId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingId(null);
                                    }
                                  }}
                                  className="font-medium text-slate-900 px-1 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="font-medium text-slate-900 cursor-pointer hover:text-blue-600"
                                  onClick={() => {
                                    setEditingId(account.id);
                                    setEditName(account.name);
                                  }}
                                  title="点击编辑名称"
                                >
                                  {account.name}
                                </span>
                              )}
                              {account.username && (
                                <span className="text-xs text-slate-500">@{account.username}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {platform?.name || account.platform}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isAuthorized ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                <CheckCircle2 className="h-3 w-3" />
                                已授权
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                <AlertCircle className="h-3 w-3" />
                                未授权
                              </span>
                            )}
                            {isActive && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 animate-pulse">
                                <Monitor className="h-3 w-3" />
                                运行中
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(account.updated_at * 1000)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isActive ? (
                              <>
                                {!isAuthorized ? (
                                  <button onClick={() => handleConfirmAuth(account)} disabled={isLoading} className="text-green-600 hover:text-green-700 font-medium text-xs px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                                    {isLoading ? "保存中..." : "确认登录"}
                                  </button>
                                ) : (
                                  <button onClick={() => browserClose(account.id).then(() => loadData())} disabled={isLoading} className="text-slate-600 hover:text-slate-700 font-medium text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                                    关闭浏览器
                                  </button>
                                )}
                              </>
                            ) : (
                              <button onClick={() => platform && handleLaunch(account, platform, !isAuthorized)} disabled={isLoading || !sidecarOnline} className="text-blue-600 hover:text-blue-700 font-medium text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 disabled:opacity-50">
                                {isLoading ? "启动中..." : (isAuthorized ? "打开" : "去授权")}
                              </button>
                            )}
                            <button onClick={() => handleDelete(account)} disabled={isLoading} className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
