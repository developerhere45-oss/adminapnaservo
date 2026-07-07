import { EmployeeTablePage } from "@/components/employee/employee-pages";

export default function EmployeeBookingsRoute() {
  return (
    <EmployeeTablePage
      resource="bookings"
      title="Bookings"
      subtitle="View live bookings with limited employee access."
      columns={["bookingCode", "customer", "customerPhone", "service", "partner", "date", "status"]}
    />
  );
}
