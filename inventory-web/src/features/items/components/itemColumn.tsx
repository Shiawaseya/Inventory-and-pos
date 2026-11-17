import type { Item } from '../types/item';
import { Badge } from '@/components/ui/badge';

type ItemRowProps = {
  item: Item;
};

export const ItemRow = ({ item }: ItemRowProps) => {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      {/* Item Name & Image */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={item.imageUrl ?? "/no-picture-icon-no-image-sign-no-album-photo-icon-vector.jpg"}
            alt={item.name}
            className="h-10 w-10 object-cover rounded-md shrink-0 bg-muted"
          />
          <div className="min-w-0">
            <p className="font-medium text-sm line-clamp-1">{item.name}</p>
            <p className="text-xs text-muted-foreground">#{item.id}</p>
          </div>
        </div>
      </td>

      {/* Model */}
      <td className="px-6 py-4">
        <p className="text-sm">{item.model ?? '—'}</p>
      </td>

      {/* Category */}
      <td className="px-6 py-4">
        <Badge variant="secondary" className="text-xs">
          {item.category?.name ?? 'Uncategorized'}
        </Badge>
      </td>

      {/* Brand */}
      <td className="px-6 py-4">
        <p className="text-sm">{item.brand?.name ?? 'Unknown'}</p>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${item.isSerialized ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className={`text-sm font-medium ${item.isSerialized ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {item.isSerialized ? 'Serialized' : 'Not Serialized'}
          </span>
        </div>
      </td>
    </tr>
  );
};
