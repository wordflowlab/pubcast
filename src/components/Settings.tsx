import { useState, useEffect, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getAppVersion } from "../lib/tauri";

interface UpdateState {
  checking: boolean;
  downloading: boolean;
  installing: boolean;
  progress: number;
  error: string | null;
  update: Update | null;
  latestVersion: string | null;
  updateDate: string | null;
}

const UPDATES = [
  {
    version: "v0.2.0",
    date: "2025-11-28",
    content: "1、AI大模型多账户支持；2、跨设备授权同步；3、新增Windows构建",
    important: true
  },
  {
    version: "v0.1.0",
    date: "2025-11-20",
    content: "初始版本发布",
    important: false
  },
];

// Auto-check interval: 30 minutes
const AUTO_CHECK_INTERVAL = 30 * 60 * 1000;

export function Settings() {
  const [browserPath, setBrowserPath] = useState("");
  const [currentVersion, setCurrentVersion] = useState("0.0.0");
  const [updateState, setUpdateState] = useState<UpdateState>({
    checking: false,
    downloading: false,
    installing: false,
    progress: 0,
    error: null,
    update: null,
    latestVersion: null,
    updateDate: null,
  });

  // Load current version
  useEffect(() => {
    getAppVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async (silent = false) => {
    if (updateState.checking || updateState.downloading) return;

    setUpdateState(prev => ({ ...prev, checking: true, error: null }));

    try {
      const update = await check();
      
      if (update) {
        setUpdateState(prev => ({
          ...prev,
          checking: false,
          update,
          latestVersion: update.version,
          updateDate: update.date || new Date().toISOString().split('T')[0],
        }));

        // Show notification if not silent and update available
        if (!silent) {
          console.log(`发现新版本: ${update.version}`);
        }
      } else {
        setUpdateState(prev => ({
          ...prev,
          checking: false,
          latestVersion: currentVersion,
          updateDate: null,
        }));
        
        if (!silent) {
          console.log("当前已是最新版本");
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "检查更新失败";
      setUpdateState(prev => ({
        ...prev,
        checking: false,
        error: silent ? null : errorMessage,
      }));
      
      if (!silent) {
        console.error("检查更新失败:", error);
      }
    }
  }, [updateState.checking, updateState.downloading, currentVersion]);

  // Download and install update
  const downloadAndInstall = useCallback(async () => {
    const { update } = updateState;
    if (!update || updateState.downloading) return;

    setUpdateState(prev => ({ ...prev, downloading: true, progress: 0, error: null }));

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(`开始下载更新，大小: ${(contentLength / 1024 / 1024).toFixed(2)} MB`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const progress = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
            setUpdateState(prev => ({ ...prev, progress }));
            break;
          case 'Finished':
            console.log("下载完成，准备安装...");
            setUpdateState(prev => ({ ...prev, progress: 100, installing: true }));
            break;
        }
      });

      // Relaunch the app after installation
      console.log("安装完成，正在重启应用...");
      await relaunch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "下载更新失败";
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        installing: false,
        error: errorMessage,
      }));
      console.error("下载更新失败:", error);
    }
  }, [updateState]);

  // Auto-check for updates on mount and periodically
  useEffect(() => {
    // Check on mount (silent)
    const timer = setTimeout(() => checkForUpdates(true), 3000);

    // Set up periodic check
    const interval = setInterval(() => checkForUpdates(true), AUTO_CHECK_INTERVAL);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const hasUpdate = updateState.update !== null;
  const isLatest = !hasUpdate && updateState.latestVersion === currentVersion;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column: Announcements */}
      <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-800">系统公告</h3>
            <button 
              className="text-sm text-blue-600 hover:underline"
              onClick={() => checkForUpdates(false)}
            >
              刷新
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500">查看最新公告和系统更新信息</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <span className="text-sm font-medium text-slate-600">最新公告</span>
          </div>

          <div className="space-y-8">
            {UPDATES.map((update) => (
              <div key={update.version} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-800">系统更新 {update.version}发布</h4>
                  <span className="text-sm text-slate-400">{update.date}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{update.content}</p>
                {update.important && (
                  <span className="inline-block rounded bg-red-50 px-2 py-0.5 text-xs text-red-600 border border-red-100">
                    重要更新
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Version & Config */}
      <div className="space-y-6">
        {/* Version Update */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-slate-800">版本更新</h3>
            {hasUpdate && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                有新版本
              </span>
            )}
            {isLatest && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                已是最新
              </span>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>
                {updateState.checking ? "检查中..." : 
                 updateState.downloading ? "下载中..." :
                 updateState.installing ? "安装中..." : "进度"}
              </span>
              <span>{updateState.progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div 
                className="h-full rounded-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${updateState.progress}%` }}
              />
            </div>
          </div>

          {/* Error message */}
          {updateState.error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {updateState.error}
            </div>
          )}

          {/* Update info */}
          {hasUpdate && (
            <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              发现新版本 <strong>v{updateState.latestVersion}</strong>，点击下方按钮下载更新
            </div>
          )}

          <div className="flex gap-3">
            <button 
              className="flex-1 rounded-md bg-blue-500 py-2 text-sm text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => checkForUpdates(false)}
              disabled={updateState.checking || updateState.downloading}
            >
              {updateState.checking ? "检查中..." : "检查更新"}
            </button>
            <button 
              className="flex-1 rounded-md border border-gray-200 bg-white py-2 text-sm text-slate-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={downloadAndInstall}
              disabled={!hasUpdate || updateState.downloading || updateState.installing}
            >
              {updateState.downloading ? "下载中..." : 
               updateState.installing ? "安装中..." : "下载更新"}
            </button>
          </div>
        </div>

        {/* Version Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-base font-medium text-slate-800">版本信息</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">当前版本：</span>
              <span className="text-slate-800 font-medium">v{currentVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">最新版本：</span>
              <span className="text-slate-800 font-medium">
                {updateState.latestVersion ? `v${updateState.latestVersion}` : `v${currentVersion}`}
              </span>
            </div>
            {updateState.updateDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">更新日期：</span>
                <span className="text-slate-800 font-medium">{updateState.updateDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* System Config */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-base font-medium text-slate-800">系统配置</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600">谷歌浏览器路径</label>
              <input
                type="text"
                value={browserPath}
                onChange={(e) => setBrowserPath(e.target.value)}
                placeholder="请输入谷歌浏览器可执行文件路径"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            
            <button className="w-full rounded-md bg-blue-500 py-2 text-sm text-white hover:bg-blue-600 transition-colors">
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
