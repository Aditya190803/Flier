"use client";

import { Suspense, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { signIn, getSession } from "next-auth/react";

import { GoogleIcon } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Only same-origin paths may be used as the post-sign-in destination. */
function safeCallbackUrl(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function SignInCard() {
  const router = useRouter();
  const callbackUrl = safeCallbackUrl(useSearchParams().get("callbackUrl"));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl);
      }
    });
  }, [router, callbackUrl]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl });
    } catch (_err) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/80">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Welcome to Flier</CardTitle>
        <p className="text-muted-foreground mt-2">
          Sign in with the Google account you want to send email from.
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full font-medium"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <GoogleIcon className="h-4 w-4 mr-2" />
              Continue with Google
            </>
          )}
        </Button>

        <div className="flex gap-3 rounded-lg border border-info/20 bg-info/10 p-4 text-sm">
          <ShieldCheck className="h-4 w-4 shrink-0 text-info mt-0.5" />
          <p className="text-muted-foreground">
            Google handles your sign-in, so Flier never sees your password. Flier asks to send email
            on your behalf and to read your Google contacts for importing.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link href="/tos" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignIn() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Matches PublicHeader's logo treatment */}
      <header className="border-b">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">Flier</span>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense>
          <SignInCard />
        </Suspense>
      </main>
    </div>
  );
}
