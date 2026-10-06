import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { FlashMessage } from "@/components/shared/flash-message";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const permissions = [...user.permissions];

  return (
    <div className="min-h-svh">
      <AppSidebar permissions={permissions} />
      <div className="flex min-h-svh flex-col lg:pl-72">
        <AppHeader user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8 xl:px-8">
          {children}
        </main>
      </div>
      <Suspense>
        <FlashMessage />
      </Suspense>
    </div>
  );
}
