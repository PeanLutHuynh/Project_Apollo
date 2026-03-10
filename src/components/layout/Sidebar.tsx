"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Mail,
  History,
  Settings,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
  },
  {
    label: "Send SMS",
    href: "/communication/sms",
    icon: MessageSquare,
  },
  {
    label: "Send Email",
    href: "/communication/email",
    icon: Mail,
  },
  {
    label: "History",
    href: "/communication/history",
    icon: History,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card hidden md:flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
        <Phone className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-foreground tracking-tight">
          Apollo
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">Apollo CRM v1.0</p>
      </div>
    </aside>
  );
}
