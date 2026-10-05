import { Footer } from "@/components/footer";
import { PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to main content
      </a>
      <PublicHeader />
      {/* pt-16 accounts for the fixed header height */}
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
