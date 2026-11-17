import { useItemBySerial } from "@/query/useItemBySerial";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface SerialItemHoverProps {
  serial: string;
}

export function SerialItemHover({ serial }: SerialItemHoverProps) {
  const { data, isLoading, isError } = useItemBySerial(serial);
  if (isLoading)
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  if (isError || !data?.data)
    return <div className="text-xs text-destructive">No item found</div>;
  const item = data.data.item;
  const variant = data.data.variant;
  return (
    <Card className="w-full p-0 bg-background">
      <CardContent className="flex gap-3 items-center p-2">
        {item?.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-14 h-14 object-cover rounded"
          />
        ) : (
          <div className="w-14 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
        <div>
          <CardTitle className="text-base font-semibold mb-1">
            {item?.name || "Unknown Item"}
          </CardTitle>
          <CardDescription className="text-xs">
            {variant?.model || "No model"}
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}
