import { EmployeeTablePage } from "@/components/employee/employee-pages";

export default function EmployeePartnersRoute() {
  return (
    <EmployeeTablePage
      resource="partners"
      title="Partners"
      subtitle="Basic partner profile and verification visibility."
      columns={["name", "phone", "serviceCategory", "city", "verificationStatus", "status"]}
    />
  );
}
