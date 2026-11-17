import type { KeyboardEvent } from "react";
import type { Item } from "../types/item";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit2,
  Settings,
  Trash2,
  Package,
  List,
  Hash,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ItemCardProps = {
  item: Item;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onConfigure?: (item: Item) => void;
  onShowVariants?: (item: Item) => void;
  onClick?: (item: Item) => void;
};

export const ItemCard = ({
  item,
  onEdit,
  onDelete,
  onConfigure,
  onShowVariants,
  onClick,
}: ItemCardProps) => {
  // Optional fields: only shown when the API provides them.
  const extra = item as unknown as {
    variants?: unknown[];
    isSerialized?: boolean;
  };
  const variantCount = extra.variants?.length ?? 0;
  const hasConfiguredVariant = item.variants?.some(
    (variant) => variant.branch_configuration,
  );
  const modelLabel = Array.isArray(item.model)
    ? item.model.join(", ")
    : item.model;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(item);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(item)}
      onKeyDown={handleKeyDown}
      className="group relative flex cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border-border bg-card py-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/40 bg-[radial-gradient(ellipse_at_50%_35%,var(--background),transparent_75%)]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground/40">
            <Package className="size-10" strokeWidth={1.25} />
          </div>
        )}

        {/* Category */}
        <Badge
          variant="secondary"
          className="absolute left-2.5 top-2.5 rounded-full border-none bg-background/85 px-2.5 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur"
        >
          {item.category?.name ?? "General"}
        </Badge>

        {/* Actions: always visible on touch, revealed on hover/focus on desktop */}
        <div className="absolute right-2 top-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-full bg-background/90 shadow-md backdrop-blur hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu for {item.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(item);
                }}
              >
                <Edit2 className="mr-2 size-3.5" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure?.(item);
                }}
              >
                <Settings className="mr-2 size-3.5" />
                {hasConfiguredVariant
                  ? "Edit branch price & reorder"
                  : "Set branch price"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onShowVariants?.(item);
                }}
              >
                <List className="mr-2 size-3.5" /> Manage variants
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(item);
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 border-t border-border/60 p-3.5">
        <div className="min-w-0 space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {item.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {item.brand?.name ?? "No brand"}
            {modelLabel ? `, ${modelLabel}` : ""}
          </p>
          {item.variants?.some((variant) => variant.branch_configuration) && (
            <p className="pt-1 text-xs font-medium text-foreground">
              From ₱
              {Math.min(
                ...item.variants
                  .filter((variant) => variant.branch_configuration?.price != null)
                  .map((variant) => variant.branch_configuration!.price!),
              ).toLocaleString()}
            </p>
          )}
        </div>

        {(variantCount > 0 || extra.isSerialized !== undefined) && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            {extra.isSerialized !== undefined && (
              <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {extra.isSerialized ? (
                  <>
                    <Hash className="size-3" /> Serialized
                  </>
                ) : (
                  <>
                    <Layers className="size-3" /> By quantity
                  </>
                )}
              </span>
            )}
            {variantCount > 0 && (
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                {variantCount} {variantCount === 1 ? "variant" : "variants"}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
