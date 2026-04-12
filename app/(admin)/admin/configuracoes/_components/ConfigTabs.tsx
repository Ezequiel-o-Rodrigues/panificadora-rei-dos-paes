"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Building2, Users, Percent } from "lucide-react";
import { SystemSettingsForm } from "./SystemSettingsForm";
import { WaitersManagement } from "./WaitersManagement";
import { TipConfigForm } from "./TipConfigForm";

interface Garcom {
  id: number;
  nome: string;
  codigo: string;
  ativo: boolean;
  createdAt: Date;
}

interface ConfigTabsProps {
  configs: Record<string, string>;
  garcons: Garcom[];
}

const tabs = [
  { key: "geral", label: "Geral", icon: Building2 },
  { key: "garcons", label: "Garçons", icon: Users },
  { key: "gorjeta", label: "Gorjeta", icon: Percent },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function ConfigTabs({ configs, garcons }: ConfigTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("geral");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl border border-onyx-800/70 bg-onyx-900/60 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition cursor-pointer",
                isActive
                  ? "bg-flame-500/15 text-flame-400 shadow-sm"
                  : "text-onyx-400 hover:text-onyx-200 hover:bg-onyx-800/50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "geral" && <SystemSettingsForm configs={configs} />}
      {activeTab === "garcons" && <WaitersManagement garcons={garcons} />}
      {activeTab === "gorjeta" && <TipConfigForm configs={configs} />}
    </div>
  );
}
