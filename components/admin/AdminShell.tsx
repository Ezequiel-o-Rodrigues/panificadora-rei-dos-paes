"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function ShellInner({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <div className="admin-scope flex min-h-dvh bg-onyx-950 text-ivory-50">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-onyx-800/70 bg-onyx-950/80 backdrop-blur-xl md:flex md:flex-col transition-all duration-300 overflow-hidden",
          collapsed ? "w-0 border-r-0" : "w-64",
        )}
      >
        <div className={cn("w-64 flex flex-col h-full", collapsed && "invisible")}>
          {sidebar}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellInner sidebar={sidebar} header={header}>
        {children}
      </ShellInner>
    </SidebarProvider>
  );
}
