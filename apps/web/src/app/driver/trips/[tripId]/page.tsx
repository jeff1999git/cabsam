import type { Metadata } from "next";

import { DriverTripScreen } from "@/features/driver/trip-detail-screen";

export const metadata: Metadata = { title: "Trip details" };

export default function DriverTripPage() {
  return <DriverTripScreen />;
}
