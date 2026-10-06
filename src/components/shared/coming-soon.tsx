import Link from "next/link";
import { ConstructionIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ComingSoonProps = {
  title: string;
  description: string;
  phase: string;
  features: string[];
};

/** Placeholder for modules planned in later phases (see docs/ROADMAP.md). */
export function ComingSoon({ title, description, phase, features }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ConstructionIcon className="size-6" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">Este módulo está en desarrollo</p>
              <Badge variant="info">{phase}</Badge>
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Volver al dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
