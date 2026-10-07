"use client";

import { useEffect, useCallback, useState } from "react";

import { LogOut, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AuthButtonProps = Pick<ButtonProps, "size" | "variant" | "className">;

export function AuthButton({ size = "sm", variant = "default", className }: AuthButtonProps = {}) {
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Secure logout: revoke tokens before signing out
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // Call logout API to revoke tokens
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue with signOut even if API call fails
    } finally {
      // Always sign out regardless of API result
      signOut({ callbackUrl: "/" });
    }
  }, []);

  // Auto sign out if there's a refresh token error
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      // Token refresh failed, sign out and redirect to sign in
      handleLogout();
    }
  }, [session?.error, handleLogout]);

  if (status === "loading") {
    return (
      <Button variant="ghost" size={size} disabled className={cn("gap-2", className)}>
        <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  // Show sign in button if there's a session error
  if (session?.error) {
    return (
      <Button
        onClick={() => signIn("google")}
        variant="destructive"
        size={size}
        className={cn("gap-2", className)}
      >
        <AlertCircle className="h-4 w-4" />
        <span>Session Expired - Sign in</span>
      </Button>
    );
  }

  if (session) {
    const initials =
      session.user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium max-w-[150px] truncate">
              {session.user?.name || session.user?.email}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{session.user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={() => signIn("google")}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      <GoogleIcon className="h-4 w-4" />
      <span>Sign in with Google</span>
    </Button>
  );
}

/** Google "G" mark, monochrome (inherits text colour). */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
