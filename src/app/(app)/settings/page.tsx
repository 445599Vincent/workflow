import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRightIcon,
  MapPinIcon,
  RulerIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThresholdsDialog } from "@/features/catalogs/components/thresholds-dialog";
import { getAppSettings, getCatalogCounts } from "@/features/catalogs/queries";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Configuración" };

type SettingsLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
  soon?: boolean;
};

function settingValue(settings: Record<string, { value: unknown }>, key: string) {
  const value = settings[key]?.value;
  return value === undefined || value === null ? "—" : String(value);
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [counts, settings] = await Promise.all([getCatalogCounts(), getAppSettings()]);

  const links: SettingsLink[] = [
    {
      href: "/settings/categories",
      title: "Categorías",
      description: "Agrupación de materiales.",
      icon: ShapesIcon,
      meta: `${counts.categories} activas`,
    },
    {
      href: "/settings/units",
      title: "Unidades de medida",
      description: "Unidades de inventario y decimales permitidos.",
      icon: RulerIcon,
      meta: `${counts.units} activas`,
    },
    {
      href: "/settings/locations",
      title: "Ubicaciones",
      description: "Estantes, racks y áreas del almacén.",
      icon: MapPinIcon,
      meta: `${counts.locations} activas`,
    },
  ];
  if (can(user, "users.manage")) {
    links.push({
      href: "/users",
      title: "Usuarios y roles",
      description: "Crear usuarios, asignar roles y restablecer contraseñas.",
      icon: UsersIcon,
    });
  }

  const parameters: [string, string][] = [
    [
      "Moneda",
      `${settingValue(settings, "currency")} (${settingValue(settings, "currency_symbol")})`,
    ],
    ["Zona horaria", settingValue(settings, "timezone")],
    [
      "Alerta de variación de consumo",
      `${settingValue(settings, "consumption_variance_alert_pct")} %`,
    ],
    ["Alerta de merma considerable", `${settingValue(settings, "waste_alert_pct")} %`],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Configuración"
        description="Catálogos y parámetros generales de Workflow."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ href, title, description, icon: Icon, meta, soon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Card className="h-full flex-row items-center gap-4 px-5 transition-colors group-hover:border-primary/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {title}
                  {soon && <Badge variant="muted">Pronto</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">{description}</p>
                {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
            Parámetros
          </CardTitle>
          <CardDescription>
            Valores generales del sistema. Los umbrales de alertas los puede cambiar un
            administrador.
          </CardDescription>
          {can(user, "settings.manage") && (
            <CardAction>
              <ThresholdsDialog
                key={`${String(settings.consumption_variance_alert_pct?.value)}-${String(settings.waste_alert_pct?.value)}`}
                varianceAlertPct={Number(settings.consumption_variance_alert_pct?.value ?? 10)}
                wasteAlertPct={Number(settings.waste_alert_pct?.value ?? 5)}
              />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm">
            {parameters.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
