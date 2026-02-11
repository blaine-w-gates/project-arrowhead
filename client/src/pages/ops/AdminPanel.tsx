import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AdminKeyForm from "@/components/admin/AdminKeyForm";
import DataHealthCard from "@/components/admin/DataHealthCard";

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState<string>(() => {
    return localStorage.getItem("adminKey") || "";
  });

  const handleKeyChange = (key: string) => {
    setAdminKey(key);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Operations Console</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Admin-only tools for monitoring and governance.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminKeyForm onChange={handleKeyChange} />
        </CardContent>
      </Card>

      <Separator />

      <DataHealthCard adminKey={adminKey} />
    </div>
  );
}
