import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppLayout from "@/components/app-layout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
