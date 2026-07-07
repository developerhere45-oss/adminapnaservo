import { EmployeeTablePage } from "@/components/employee/employee-pages";

export default function EmployeeUsersRoute() {
  return (
    <EmployeeTablePage
      resource="users"
      title="Users"
      subtitle="Customer summaries with private data masked."
      columns={["name", "phone", "city", "totalBookings", "lastBookingDate", "status"]}
    />
  );
}
