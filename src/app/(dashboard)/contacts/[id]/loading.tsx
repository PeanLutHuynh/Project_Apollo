import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ContactDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {["Phone Number", "Email", "Address", "Notes"].map((field) => (
            <div key={field} className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-64" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
