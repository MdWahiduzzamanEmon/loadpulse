"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Activity,
  LayoutDashboard,
  List,
  Play,
  History,
  Wifi,
  WifiOff,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Connect", icon: LayoutDashboard },
  { href: "/endpoints", label: "Endpoints", icon: List },
  { href: "/run", label: "Run Tests", icon: Play },
  { href: "/history", label: "History", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const agentConnected = useAppSelector((s) => s.connection.agentConnected);
  const endpointCount = useAppSelector((s) => s.connection.endpoints.length);

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">LoadPulse</h1>
            <p className="text-xs text-muted-foreground">Testing Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {label === "Endpoints" && endpointCount > 0 && (
                <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {endpointCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Agent status + theme toggle */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {agentConnected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
