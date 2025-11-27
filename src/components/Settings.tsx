import { useState } from "react";

const UPDATES = [
  {
    version: "v1.4.2",
    date: "2025-11-24",
    content: "1、修复deepseek查询；2、修复千问授权",
    important: true
  },
  {
    version: "v1.4.0",
    date: "2025-11-19",
    content: "优化上个版本异常问题",
    important: true
  },
  {
    version: "v1.3.9",
    date: "2025-11-18",
    content: "1、修复企鹅号垂直文章问题；2、修复个别Deepseek查询收录问题；3、优化同个任务重复发布错误问题；",
    important: true
  },
  {
    version: "v1.3.7",
    date: "2025-11-07",
    content: "1、修复千问收录；2、修复公众号发布；",
    important: true
  },
];

export function Settings() {
  const [browserPath, setBrowserPath] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column: Announcements */}
      <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-800">系统公告</h3>
            <button className="text-sm text-blue-600 hover:underline">刷新</button>
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
          <h3 className="mb-4 text-base font-medium text-slate-800">版本更新</h3>
          
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>进度</span>
              <span>0%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-full w-0 rounded-full bg-blue-500" />
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 rounded-md bg-blue-500 py-2 text-sm text-white hover:bg-blue-600 transition-colors">
              检查并更新
            </button>
            <button className="flex-1 rounded-md border border-gray-200 bg-white py-2 text-sm text-slate-600 hover:bg-gray-50 transition-colors">
              下载更新
            </button>
          </div>
        </div>

        {/* Version Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-base font-medium text-slate-800">版本信息</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">当前版本：</span>
              <span className="text-slate-800 font-medium">V1.4.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">最新版本：</span>
              <span className="text-slate-800 font-medium">V1.4.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">更新日期：</span>
              <span className="text-slate-800 font-medium">2025-11-24</span>
            </div>
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
