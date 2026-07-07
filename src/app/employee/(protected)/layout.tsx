import { getEmployeeSession } from "@/lib/auth";
import { EmployeeShell } from "@/components/employee/employee-shell";

export default async function EmployeeProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getEmployeeSession();
  return (
    <EmployeeShell name={session?.name || "Employee"} department={session?.department || "support"}>
      {children}
    </EmployeeShell>
  );
}
