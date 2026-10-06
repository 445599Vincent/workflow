# Workflow

**Control de materia prima y órdenes de trabajo** para una empresa de letreros,
vallas publicitarias, impresión, rotulación e instalaciones.

Workflow responde, en todo momento:

- ¿Qué material **tenemos**?
- ¿Qué material está **comprometido**?
- ¿Qué material se **utilizó** y en **qué trabajo**?
- ¿Cuánto se **desperdició**?
- ¿Cuánto **costó realmente** cada trabajo?

> Workflow **no** es un ERP y **no** reemplaza ADM Cloud. ADM Cloud sigue
> manejando facturación, contabilidad y cuentas por cobrar. Workflow se especializa
> en operaciones y consumo de materiales.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura, capas, estructura de carpetas, seguridad, registro de decisiones |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de datos, tablas, funciones, RLS, migraciones |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | Reglas de inventario, costos, órdenes, reservas, consumos, mermas, permisos |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Fases de desarrollo y estado actual |
| [src/services/integrations/adm/README.md](src/services/integrations/adm/README.md) | Puntos de integración futura con ADM Cloud |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind CSS 4 ·
shadcn/ui · Supabase (PostgreSQL, Auth, RLS) · Vercel.

## Requisitos

- Node.js ≥ 20.9
- Un proyecto de [Supabase](https://supabase.com) (o Supabase CLI + Docker para desarrollo local)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar con los datos del proyecto Supabase
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (Supabase → Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (`sb_publishable_…` o la clave `anon` en proyectos antiguos) |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la app (para enlaces de recuperación de contraseña) |

La `service_role` key **no** se usa en la aplicación.

### Base de datos

Aplicar las migraciones de `supabase/migrations/` en orden.

**Con Supabase CLI (recomendado):**

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push          # aplica las migraciones
npm run db:types              # regenera src/types/database.ts
```

**Desarrollo local:** `npx supabase start` y luego `npx supabase db reset`
(aplica migraciones + `supabase/seed.sql` con datos de demostración).

**Sin CLI:** copiar el contenido de cada archivo de `supabase/migrations/` (en
orden) en el SQL Editor del panel de Supabase.

### Primer administrador

No hay registro público. Para crear el primer usuario:

1. Supabase → **Authentication → Users → Add user** (email + contraseña).
   Se crea automáticamente su perfil con rol **Consulta**.
2. En el SQL Editor, promoverlo a administrador:

   ```sql
   update public.profiles set role_code = 'admin', full_name = 'Nombre Apellido'
   where email = 'correo@empresa.com';
   ```

3. Configurar en Supabase → **Authentication → URL Configuration** la *Site URL*
   y agregar `https://<tu-dominio>/auth/confirm` a *Redirect URLs* (recuperación
   de contraseña).

## Scripts

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos (TypeScript) |
| `npm run format` | Prettier |
| `npm run db:types` | Regenerar tipos desde el proyecto Supabase vinculado |

## Despliegue (Vercel)

1. Importar el repositorio en Vercel.
2. Definir las variables de entorno anteriores.
3. Cada push a `main` despliega producción; cada PR genera un preview.

## Estructura

```
docs/                     Documentación del sistema
supabase/migrations/      Esquema de base de datos (SQL versionado)
supabase/seed.sql         Datos de demostración (solo local)
src/app/                  Rutas (auth y app autenticada)
src/components/           UI (shadcn), layout y componentes compartidos
src/features/             Dominios: auth, dashboard, materials…
src/lib/                  Supabase, sesión/permisos, formato, utilidades
src/services/integrations Capa desacoplada para integraciones (ADM Cloud)
src/types/database.ts     Tipos del esquema
```

Detalle en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#5-capas-y-estructura-de-carpetas).

## Convenciones de commits

`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:` — commits pequeños y
agrupados por tema.
