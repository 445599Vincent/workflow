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
| `SUPABASE_SERVICE_ROLE_KEY` | **Opcional, solo servidor.** Permite crear usuarios y restablecer contraseñas desde la pantalla Usuarios (Supabase → Project Settings → API Keys → *secret*). Nunca con prefijo `NEXT_PUBLIC_`. |

La clave secreta solo la usa el servidor, en un único módulo
(`src/lib/supabase/admin.ts`), para administrar cuentas (ver ARCHITECTURE D-022).

### Base de datos

Aplicar las migraciones de `supabase/migrations/` en orden.

**Con Supabase CLI (recomendado):**

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push          # aplica las migraciones
npm run db:types              # regenera src/types/database.ts
```

**Desarrollo local (Docker):** `npx supabase start` y luego `npx supabase db reset`
(aplica migraciones + `supabase/seed.sql` con datos de demostración). Use la URL
y la clave pública que imprime `supabase start` en `.env.local`.
Usuario demo: `admin@workflow.local` / `workflow-demo` (solo local).

**Sin CLI:** copiar el contenido de cada archivo de `supabase/migrations/` (en
orden) en el SQL Editor del panel de Supabase.

**Actualizar una base ya instalada:** ejecutar solo las migraciones nuevas, en
orden, que todavía no se hayan aplicado (con CLI: `npx supabase db push` lo hace
automáticamente). Nunca volver a ejecutar una migración ya aplicada.

> **Desde la versión con Fase 2/Usuarios (migraciones hasta 010):** aplicar
> `…_011_work_order_execution.sql`, `…_012_usage_voiding_warehouse_waste.sql` y
> `…_013_reports_alerts.sql`, en ese orden.
> Desde la 011 el estado de una orden solo se modifica con la función
> `change_work_order_status` (la app ya la usa).

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
4. Desactivar el registro público: **Authentication → Sign In / Providers →
   Allow new users to sign up = off** (los usuarios los crea un administrador).

### Resto del equipo

Con el administrador creado, los demás usuarios se crean desde **Usuarios** en la
app (requiere `SUPABASE_SERVICE_ROLE_KEY`): nombre, correo, rol y una contraseña
temporal que el usuario cambia en su primer ingreso. Sin esa variable, la pantalla
permite cambiar roles y activar o desactivar, y las cuentas se crean desde el panel
de Supabase como el primer administrador.

### Recuperación de contraseña

Funciona con la plantilla de correo por defecto. Para que el enlace funcione
aunque se abra en otro dispositivo, se recomienda cambiar la plantilla
**Reset Password** (Authentication → Emails) a:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
  Crear nueva contraseña
</a>
```

### Pruebas de base de datos

Sobre una base con las migraciones aplicadas y **sin** semilla:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/inventory_rules_test.sql
```

Corre dentro de una transacción con `ROLLBACK` (no deja datos). CI ejecuta lo
mismo en cada PR sobre PostgreSQL 17 (`.github/workflows/ci.yml`).

## Scripts

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint |
| `npm run format:check` | Verificar formato (Prettier) |
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
supabase/tests/           Pruebas de reglas de BD (+ emulación de Supabase para CI)
supabase/seed.sql         Datos de demostración (solo local)
src/app/                  Rutas (auth y app autenticada)
src/components/           UI (shadcn), layout y componentes compartidos
src/features/             Dominios: auth, dashboard, materials…
src/lib/                  Supabase, sesión/permisos, formato, utilidades
src/services/integrations Capa desacoplada para integraciones (ADM Cloud)
src/types/database.ts     Tipos del esquema
```

Detalle en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#5-capas-y-estructura-de-carpetas).

## Estado actual

Fases 0, 1, 2, 3 y 3b completas, Fase 4 casi completa: **Usuarios**, **Materias
primas** (con kardex), **Proveedores**, **Compras / Entradas** (con anulación),
**Ajustes**, **Movimientos**, **Mermas** (de órdenes y de almacén), catálogos en
**Configuración**, **Clientes**, **Órdenes de trabajo** (materiales planificados,
reservas, consumo, merma, anulaciones, costo real en vivo, cierre, cancelación y
reapertura), **Inventario** (valor por categoría), **Alertas**, **Reportes** con
exportación a Excel (CSV) y **Auditoría**. Ver [docs/ROADMAP.md](docs/ROADMAP.md).

## Convenciones de commits

`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:` — commits pequeños y
agrupados por tema.
