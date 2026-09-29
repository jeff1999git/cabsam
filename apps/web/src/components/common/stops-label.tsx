import type { Booking } from "@excelcabs/types";
import { cn } from "@excelcabs/ui/lib/utils";
import { MapPin } from "lucide-react";

import { formatRoute } from "@/lib/format";

type StopsLabelProps = Pick<Booking, "pickupPoint" | "dropPoint"> & {
  /** Primary-coloured pin at body size — the headline of a customer's booking card. */
  prominent?: boolean;
  className?: string;
};

/**
 * A passenger's own journey, "Aluva → Kakkanad", after a map pin. Stops are typed by the customer
 * and can be long, so the text wraps rather than truncating. Screen readers hear a "Pickup and
 * drop:" prefix; the visible text stays one "A → B" string.
 */
export function StopsLabel({ pickupPoint, dropPoint, prominent = false, className }: StopsLabelProps) {
  return (
    <span
      data-slot="stops-label"
      className={cn("flex min-w-0 items-start gap-1.5", prominent ? "font-medium" : "text-sm", className)}
    >
      <MapPin
        aria-hidden="true"
        className={cn(
          "shrink-0",
          prominent ? "mt-0.5 size-4 text-primary" : "mt-0.5 size-3.5 text-muted-foreground",
        )}
      />
      <span className="sr-only">Pickup and drop: </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {formatRoute({ origin: pickupPoint, destination: dropPoint })}
      </span>
    </span>
  );
}
