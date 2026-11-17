import type { Item } from '../types/item';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit2, Settings, Trash2, Package } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ItemCardProps = {
  item: Item;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onConfigure?: (item: Item) => void;
  onClick?: (item: Item) => void;
}

export const ItemCard = ({ item, onEdit, onDelete, onConfigure, onClick }: ItemCardProps) => {
  return (
    <Card 
      onClick={() => onClick?.(item)}
      className="group relative flex flex-col overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-primary/20 cursor-pointer border-muted/60"
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/30">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Category Overlay */}
        <div className="absolute left-2 top-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-md shadow-sm border-none font-medium">
            {item.category?.name ?? "General"}
          </Badge>
        </div>

        {/* Actions Dropdown - Improved Hit Area */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 rounded-full shadow-lg bg-background/90 backdrop-blur hover:bg-background"
                onClick={(e) => e.stopPropagation()} // Prevent card click
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit?.(item)}>
                <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onConfigure?.(item)}>
                <Settings className="mr-2 h-3.5 w-3.5" /> Configure
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                variant="destructive" 
                onClick={() => onDelete?.(item)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Section */}
      <CardHeader className="p-4 pb-2 space-y-1">
        <CardTitle className="text-sm font-bold leading-none tracking-tight group-hover:text-primary transition-colors">
          {item.name}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
          {item.brand?.name ?? "No Brand"} • {item.model ?? "Generic"}
        </p>
      </CardHeader>
    </Card>
  );
};