import { Button } from "@excelcabs/ui/components/button";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold tracking-tight">EXCEL CABS</h1>
      <p className="text-muted-foreground">Private Shuttle Bus Service</p>
      <Button className="mt-4">Book Your Trip</Button>
    </main>
  );
}
