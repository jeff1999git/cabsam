import type { Metadata } from "next";

import { BookingScreen } from "@/features/booking/booking-screen";

export const metadata: Metadata = { title: "Book a seat" };

export default function BookTripPage() {
  return <BookingScreen />;
}
