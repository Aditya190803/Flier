import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}

export function EmptyStateCard({ icon, title, description, children }: EmptyStateCardProps) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
