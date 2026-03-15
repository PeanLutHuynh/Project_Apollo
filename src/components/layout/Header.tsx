"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Moon, Sun, LogOut, User as UserIcon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { useLocalNotifications } from "@/hooks/use-local-notifications";

interface HeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export function Header({ user }: HeaderProps) {
  const displayName = user.name ?? user.email ?? "User";
  const initials = getInitials(displayName);
  const { items, unreadCount, markAllRead, clearAll } = useLocalNotifications();

  function formatNotificationDateTime(value: number) {
    return new Date(value).toLocaleString("vi-VN", {
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      {/* Left: mobile logo placeholder */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-semibold text-foreground">Apollo</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[22rem] max-w-[calc(100vw-1rem)]" align="end" forceMount>
            <DropdownMenuLabel className="flex items-center justify-between gap-3">
              <span className="whitespace-nowrap">Notification</span>
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                {unreadCount} news
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">No notifications</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto px-1">
                {items.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-sm border px-2 py-1.5 text-sm overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 break-words font-medium leading-snug">{item.title}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatNotificationDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p
                      className="mt-1 whitespace-normal break-words text-xs leading-5 text-muted-foreground"
                      title={item.description}
                    >
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => markAllRead()}
              disabled={items.length === 0 || unreadCount === 0}
            >
              Mark all as read
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => clearAll()}
              disabled={items.length === 0}
            >
              Clear notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {user.email && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center gap-2 cursor-pointer">
                <UserIcon className="h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
