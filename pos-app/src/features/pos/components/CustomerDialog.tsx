import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Customer } from "../types/pos.types";

type CustomerDialogProps = {
  open: boolean;
  value: Customer;
  onChange: (value: Customer) => void;
  onClose: () => void;
  onSave: () => void;
};

export function CustomerDialog({
  open,
  value,
  onChange,
  onClose,
  onSave,
}: CustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>
            Attach customer details to this sale.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>First name</Label>
            <Input
              value={value.first_name}
              onChange={(event) =>
                onChange({ ...value, first_name: event.target.value })
              }
            />
          </div>
          <div>
            <Label>Last name</Label>
            <Input
              value={value.last_name}
              onChange={(event) =>
                onChange({ ...value, last_name: event.target.value })
              }
            />
          </div>
          <div>
            <Label>Contact number</Label>
            <Input
              value={value.contact_number}
              onChange={(event) =>
                onChange({ ...value, contact_number: event.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!value.first_name || !value.last_name}
            onClick={onSave}
          >
            <Check size={16} /> Save customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
