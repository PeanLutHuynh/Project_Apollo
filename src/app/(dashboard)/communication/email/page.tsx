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

export const metadata = { title: "Send Email" };

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className={`h-${i === 2 ? "28" : "10"} w-full`} />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

const EmailForm = dynamic(
  () => import("@/components/communication/EmailForm"),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

const BulkEmailForm = dynamic(
  () => import("@/components/communication/BulkEmailForm"),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
);

export default function EmailPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Send Email</CardTitle>
          <CardDescription>
            Send emails to contacts via AWS SES with both plain text and HTML
            support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single">
            <TabsList className="mb-5">
              <TabsTrigger value="single">Single Contact</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
            </TabsList>
            <TabsContent value="single">
              <EmailForm />
            </TabsContent>
            <TabsContent value="bulk">
              <BulkEmailForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
