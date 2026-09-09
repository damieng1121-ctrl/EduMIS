import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ParentNav } from "./parent-nav";

export default async function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/parent/login");
  if (session.user.role !== "PARENT") redirect("/portal");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <ParentNav userName={session.user.name ?? session.user.email ?? "Account"} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-8 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
