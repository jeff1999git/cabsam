import type { Metadata } from "next";

import { BookingDetailScreen } from "@/features/customer/booking-detail-screen";

export const metadata: Metadata = { title: "Booking details" };

export default function BookingDetailPage() {
  return <BookingDetailScreen />;
}
