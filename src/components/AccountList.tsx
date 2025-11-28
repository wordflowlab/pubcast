import { useState, useEffect, useCallback, useRef } from "react";
import { 
  listAccounts, 
  addAccount, 
  deleteAccount,
  launchBrowser, 
  browserNavigate, 
  browserHealthCheck, 
  syncAuthFromBrowser,
  browserClose,
  browserGetSessions,
  browserGetLoginState,
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

// Platform definitions
interface Platform {
  id: string;
  name: string;
  color: string;
  loginUrl: string;
  homeUrl: string;
}

const PLATFORMS: Platform[] = [
  { id: "netease", name: "网易号", color: "bg-red-600", loginUrl: "https://mp.163.com/", homeUrl: "https://mp.163.com/dashboard" },
  { id: "sohu", name: "搜狐号", color: "bg-yellow-500", loginUrl: "https://mp.sohu.com/", homeUrl: "https://mp.sohu.com/main" },
  { id: "baijia", name: "百家号", color: "bg-blue-600", loginUrl: "https://baijiahao.baidu.com/", homeUrl: "https://baijiahao.baidu.com/builder/rc/home" },
  { id: "toutiao", name: "头条号", color: "bg-red-500", loginUrl: "https://mp.toutiao.com/", homeUrl: "https://mp.toutiao.com/profile_v4/index" },
  { id: "penguin", name: "企鹅号", color: "bg-blue-500", loginUrl: "https://om.qq.com/", homeUrl: "https://om.qq.com/userAuth/index" },
  { id: "zhihu", name: "知乎", color: "bg-blue-400", loginUrl: "https://www.zhihu.com/signin", homeUrl: "https://www.zhihu.com/" },
  { id: "wechat", name: "微信公众号", color: "bg-green-600", loginUrl: "https://mp.weixin.qq.com/", homeUrl: "https://mp.weixin.qq.com/cgi-bin/home" },
  { id: "xiaohongshu", name: "小红书", color: "bg-red-500", loginUrl: "https://creator.xiaohongshu.com/", homeUrl: "https://creator.xiaohongshu.com/creator/home" },
  { id: "douyin", name: "抖音", color: "bg-black", loginUrl: "https://creator.douyin.com/", homeUrl: "https://creator.douyin.com/creator-micro/home" },
  { id: "bilibili", name: "B站", color: "bg-pink-400", loginUrl: "https://member.bilibili.com/", homeUrl: "https://member.bilibili.com/platform/home" },
  { id: "csdn", name: "CSDN", color: "bg-red-600", loginUrl: "https://mp.csdn.net/", homeUrl: "https://mp.csdn.net/mp_blog/manage/article" },
  { id: "jianshu", name: "简书", color: "bg-red-400", loginUrl: "https://www.jianshu.com/sign_in", homeUrl: "https://www.jianshu.com/writer" },
];

// Media platform IDs for filtering
const MEDIA_PLATFORM_IDS = new Set(PLATFORMS.map(p => p.id));

export function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeSessions, setActiveSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sidecarOnline, setSidecarOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and pagination state
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

      // Load accounts from DB (may fail if AppState not ready)
      // Filter for media platform accounts only (exclude AI platforms)
      const data = await listAccounts();
      const mediaAccounts = data.filter(acc => MEDIA_PLATFORM_IDS.has(acc.platform));
      setAccounts(mediaAccounts);

      // Load active sessions if sidecar is up
      if (isHealthy) {
        const sessions = await browserGetSessions();
        setActiveSessions(sessions);
      }
      
    } catch (e) {
      // Retry a few times if backend not ready
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
    // Poll for active sessions
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

  // 1. Add new account and launch browser
  const handleAddAccount = async (platform: Platform) => {
    try {
      setActionLoading("creating-" + platform.id);
      
      // Create account in DB
      const newAccount = await addAccount(platform.id, `${platform.name}-未命名`);
      setAccounts(prev => [newAccount, ...prev]);
      
      // Launch browser for auth
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
    if (loginWatcherRef.current) {
      clearInterval(loginWatcherRef.current);
    }
    
    console.log(`[AccountList] 👀 Starting login watcher for ${accountId}`);
    
    loginWatcherRef.current = setInterval(async () => {
      try {
        const state = await browserGetLoginState(accountId);
        
        if (state.success && state.isLoggedIn) {
          console.log(`[AccountList] ✅ Login detected for ${accountId}!`);
          
          if (loginWatcherRef.current) {
            clearInterval(loginWatcherRef.current);
            loginWatcherRef.current = null;
          }
          
          // Auto sync and close
          try {
            const result = await syncAuthFromBrowser(accountId);
            if (result.success) {
              console.log(`[AccountList] 💾 Auth synced for ${accountId}`);
              await browserClose(accountId);
              
              // Refresh data
              const updatedAccounts = await listAccounts();
              setAccounts(updatedAccounts);
              const sessions = await browserGetSessions();
              setActiveSessions(sessions);
            }
          } catch (e) {
            console.error('[AccountList] Sync error:', e);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }, 2000);
  }, []);

  // Stop login watcher
  const stopLoginWatcher = useCallback(() => {
    if (loginWatcherRef.current) {
      clearInterval(loginWatcherRef.current);
      loginWatcherRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLoginWatcher();
  }, [stopLoginWatcher]);

  // 2. Launch browser for existing account
  const handleLaunch = async (account: Account, platform: Platform, isAuth = false) => {
    if (!sidecarOnline) {
      alert("Playwright 服务未启动");
      return;
    }

    try {
      setActionLoading(account.id);
      
      const launchResult = await launchBrowser(account.id, platform.id, undefined, false);
      if (!launchResult.success) {
        throw new Error(launchResult.error);
      }

      const url = isAuth ? platform.loginUrl : platform.homeUrl;
      const navResult = await browserNavigate(account.id, url);
      if (!navResult.success) {
        throw new Error(navResult.error);
      }

      // Update sessions immediately
      const sessions = await browserGetSessions();
      setActiveSessions(sessions);
      
      // Start watching for login
      if (isAuth) {
        startLoginWatcher(account.id);
      }
      
    } catch (e) {
      alert(`启动失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Confirm auth (sync cookies) - manual backup
  const handleConfirmAuth = async (account: Account) => {
    try {
      setActionLoading(account.id);
      stopLoginWatcher(); // Stop auto-watcher
      
      const result = await syncAuthFromBrowser(account.id);
      if (!result.success) {
        throw new Error(result.error);
      }

      await browserClose(account.id);
      
      // Refresh account list to show new status
      const updatedAccounts = await listAccounts();
      setAccounts(updatedAccounts);
      
      const sessions = await browserGetSessions();
      setActiveSessions(sessions);
      
    } catch (e) {
      alert(`同步失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Delete account
  const handleDelete = async (account: Account) => {
    if (!confirm(`确定要删除账号 "${account.name}" 吗？`)) return;
    
    try {
      // Close browser if open
      if (activeSessions.some(s => s.accountId === account.id)) {
        await browserClose(account.id);
      }
      
      await deleteAccount(account.id);
      setAccounts(prev => prev.filter(a => a.id !== account.id));
    } catch (e) {
      alert(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Filter logic
  const filteredAccounts = accounts.filter(account => {
    if (filterPlatform !== "all" && account.platform !== filterPlatform) return false;
    
    const isAuthorized = account.auth_status === "authorized";
    if (filterStatus === "authorized" && !isAuthorized) return false;
    if (filterStatus === "unauthorized" && isAuthorized) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        account.name.toLowerCase().includes(term) || 
        (account.username && account.username.toLowerCase().includes(term))
      );
    }
    
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAccounts.length / pageSize);
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPlatform, filterStatus, searchTerm, pageSize]);

  return (
    <div className="space-y-6">
      {/* Sidecar Status */}
      {!sidecarOnline && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Playwright 服务未启动</p>
            <p className="text-sm">请在 playwright-sidecar 目录运行 <code className="bg-amber-100 px-1 rounded">npm start</code></p>
          </div>
          <button 
            onClick={() => loadData()}
            className="flex items-center gap-1 text-sm font-medium hover:underline"
          >
            <RefreshCw className="h-4 w-4" />
            重试
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
          <button 
            onClick={() => setError(null)}
            className="text-sm underline hover:no-underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* Platform Selection Grid */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-medium text-slate-800">选择平台添加账号</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {PLATFORMS.map((platform) => (
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

      {/* Account List Section */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">平台</span>
            <select 
              className="h-9 rounded-md border-gray-200 text-sm text-slate-600 focus:border-blue-500 focus:ring-blue-500 outline-none"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
            >
              <option value="all">全部平台</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">授权状态</span>
            <select 
              className="h-9 rounded-md border-gray-200 text-sm text-slate-600 focus:border-blue-500 focus:ring-blue-500 outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="authorized">已授权</option>
              <option value="unauthorized">未授权</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索昵称..."
              className="h-9 w-full rounded-md border-gray-200 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none px-3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={() => loadData()}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
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
                {paginatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      {accounts.length === 0 ? "暂无账号数据，请先添加账号" : "没有匹配的账号"}
                    </td>
                  </tr>
                ) : (
                  paginatedAccounts.map((account) => {
                    const platform = PLATFORMS.find(p => p.id === account.platform);
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
                              <span className="font-medium text-slate-900">{account.name}</span>
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
                            {/* Active Session Actions */}
                            {isActive ? (
                              <>
                                {!isAuthorized ? (
                                  <button
                                    onClick={() => handleConfirmAuth(account)}
                                    disabled={isLoading}
                                    className="text-green-600 hover:text-green-700 font-medium text-xs px-2 py-1 rounded border border-green-200 hover:bg-green-50"
                                  >
                                    {isLoading ? "保存中..." : "确认登录"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => browserClose(account.id).then(() => loadData())}
                                    disabled={isLoading}
                                    className="text-slate-600 hover:text-slate-700 font-medium text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                                  >
                                    关闭浏览器
                                  </button>
                                )}
                              </>
                            ) : (
                              /* Inactive Session Actions */
                              <>
                                <button
                                  onClick={() => platform && handleLaunch(account, platform, !isAuthorized)}
                                  disabled={isLoading || !sidecarOnline}
                                  className="text-blue-600 hover:text-blue-700 font-medium text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 disabled:opacity-50"
                                >
                                  {isLoading ? "启动中..." : (isAuthorized ? "打开" : "去授权")}
                                </button>
                                <button
                                  onClick={() => handleDelete(account)}
                                  disabled={isLoading}
                                  className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-4 border-t border-gray-100 p-4 text-sm text-slate-500">
            <span>共 {filteredAccounts.length} 条</span>
            <select 
              className="h-8 rounded border-gray-200 text-xs outline-none focus:border-blue-500"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <div className="flex items-center gap-2">
              <button 
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </button>
              <span className="px-2 text-slate-700">{currentPage} / {totalPages}</span>
              <button 
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
