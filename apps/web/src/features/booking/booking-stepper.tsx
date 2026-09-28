import { Stepper } from "@excelcabs/ui/composites/stepper";

export const BOOKING_STEPS = ["Trip", "Passenger", "Confirm"] as const;

/** The booking flow's progress card, shared by the home page (step 0) and the booking page. */
export function BookingStepper({ current }: { current: number }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 shadow-card sm:px-6">
      <Stepper steps={BOOKING_STEPS} current={current} />
    </div>
  );
}
