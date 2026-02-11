import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onChange?: (key: string) => void;
}

export default function AdminKeyForm({ onChange }: Props) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("adminKey") || "";
    setValue(existing);
  }, []);

  const save = () => {
    localStorage.setItem("adminKey", value);
    setSaved(true);
    onChange?.(value);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="flex-1 min-w-[240px]">
        <label className="block text-sm font-medium mb-1">Admin Key</label>
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter admin key"
        />
      </div>
      <Button onClick={save}>Save</Button>
      {saved && <span className="text-xs text-green-600">Saved</span>}
    </div>
  );
}
