import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { LogoMark } from "@/components/shared/logo";
import type { CurrentUser } from "@/lib/auth/session";

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6">
      <MobileNav permissions={[...user.permissions]} />
      <LogoMark className="size-7 lg:hidden" />
      <div className="flex-1" />
      <UserMenu fullName={user.fullName} email={user.email} roleCode={user.roleCode} />
    </header>
  );
}
