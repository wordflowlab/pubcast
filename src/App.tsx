import { useState } from "react";
import { AccountList, TaskList, Layout, AIAuth, AICheck, Settings } from "./components";

type TabKey = "accounts" | "publish" | "ai-auth" | "ai-check" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("accounts");

  return (
    <Layout activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabKey)}>
      {activeTab === "accounts" && <AccountList />}
      {activeTab === "publish" && <TaskList />}
      {activeTab === "ai-auth" && <AIAuth />}
      {activeTab === "ai-check" && <AICheck />}
      {activeTab === "settings" && <Settings />}
    </Layout>
  );
}

export default App;
