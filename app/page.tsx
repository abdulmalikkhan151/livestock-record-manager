import { redirect } from "next/navigation";
import { LivestockDashboard } from "./livestock-dashboard";
import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const member = await getCurrentUser();
  if (!member) redirect("/login");
  return <LivestockDashboard identity={{ displayName: member.displayName, email: member.email, role: member.role }} />;
}
