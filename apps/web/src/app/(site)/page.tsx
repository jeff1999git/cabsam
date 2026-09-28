import type { Metadata } from "next";
import { Suspense } from "react";

import { CenteredSpinner } from "@/components/common/centered-spinner";
import { HomeScreen } from "@/features/booking/home-screen";

export const metadata: Metadata = { title: "Book Your Trip" };

export default function HomePage() {
  return (
    <Suspense fallback={<CenteredSpinner label="Loading trips" />}>
      <HomeScreen />
    </Suspense>
  );
}
