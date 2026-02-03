"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NODE_TYPES } from "@/lib/constants/nodeTypes";

export default function AddNodeForm({
  action,
  onAdded,
}: {
  action: (formData: FormData) => Promise<any>;
  onAdded?: (node: any) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const createdNode = await action(formData);
    if (createdNode && onAdded) {
      onAdded(createdNode);
    } else {
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <label htmlFor="nodeType">New Node Type</label>
      <select
        id="nodeType"
        name="type"
        defaultValue="TRIGGER"
        style={{ marginLeft: 8, marginRight: 8 }}
      >
        {NODE_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <button type="submit">Add Step</button>
    </form>
  );
}
