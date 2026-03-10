import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata = { title: "Send SMS" };

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

const SMSForm = dynamic(() => import("@/components/communication/SMSForm"), {
  loading: () => <FormSkeleton />,
  ssr: false,
});

const BulkSMSForm = dynamic(
  () => import("@/components/communication/BulkSMSForm"),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

export default function SMSPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Send SMS</CardTitle>
          <CardDescription>
            Send text messages to contacts via AWS SNS. Delivery status will be
            tracked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single">
            <TabsList className="mb-5">
              <TabsTrigger value="single">Single Contact</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
            </TabsList>
            <TabsContent value="single">
              <SMSForm />
            </TabsContent>
            <TabsContent value="bulk">
              <BulkSMSForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
