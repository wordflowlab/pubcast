import { 
  Users, 
  Send, 
  Bot, 
  SearchCheck, 
  Settings, 
  LayoutDashboard,
  LogOut,
  Menu,
  Bell
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-blue-600 text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-900 text-white shadow-xl">
        {/* Logo Area */}
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">PubCast</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-1 px-3 py-4">
          <SidebarItem 
            icon={Users} 
            label="账号管理" 
            active={activeTab === "accounts"} 
            onClick={() => onTabChange("accounts")}
          />
          <SidebarItem 
            icon={Send} 
            label="发布管理" 
            active={activeTab === "publish"} 
            onClick={() => onTabChange("publish")}
          />
          <SidebarItem 
            icon={Bot} 
            label="AI 大模型授权" 
            active={activeTab === "ai-auth"} 
            onClick={() => onTabChange("ai-auth")}
          />
          <SidebarItem 
            icon={SearchCheck} 
            label="AI 查收录" 
            active={activeTab === "ai-check"} 
            onClick={() => onTabChange("ai-check")}
          />
          <SidebarItem 
            icon={Settings} 
            label="系统设置" 
            active={activeTab === "settings"} 
            onClick={() => onTabChange("settings")}
          />
        </div>

        {/* Bottom Action */}
        <div className="border-t border-slate-800 p-3">
          <SidebarItem icon={LogOut} label="前往管理后台" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between bg-white px-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Menu className="h-5 w-5 lg:hidden" />
            <span className="text-lg font-medium text-slate-800">
              {activeTab === "accounts" && "账号管理"}
              {activeTab === "publish" && "发布管理"}
              {activeTab === "ai-auth" && "AI 大模型授权"}
              {activeTab === "ai-check" && "AI 查收录"}
              {activeTab === "settings" && "系统设置"}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <div className="flex items-center gap-3 rounded-full bg-gray-100 px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-medium text-slate-600">
                1
              </div>
              <span className="text-sm font-medium text-slate-700">18801750108</span>
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
