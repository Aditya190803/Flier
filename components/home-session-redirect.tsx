"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Session loading must never replace the public content in the server response.
export function HomeSessionRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session && !session.error) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  return null;
}
