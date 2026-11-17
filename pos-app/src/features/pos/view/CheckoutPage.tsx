import {
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  PauseCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loginApi } from "@/features/authentications/api/loginApi";
import { branchInventoryItemApi } from "@/features/items/api/branchInventoryItemApi";
import { CreateCustomerForm } from "@/features/user/components";
import stockUnitApi from "@/features/items/api/stockUnitApi";
import type { StockUnitRecord } from "@/features/items/api/stockUnitApi";
import { groupBySerializedItems } from "@/features/items/lib/groupBySerializedItem";
import { buildSaleItems, customersApi, salesApi } from "../api";
import { CartPanel } from "../components/CartPanel";
import {
  HOME_CREDIT,
  emptyFinancingForm,
  isFinancingComplete,
  toFinancingPayload,
} from "../lib/financing";
import { ProductGrid } from "../components/ProductGrid";
import { SerialDialog, VariantDialog } from "../components/VariantDialog";
import { useTransactionApproval } from "../hooks/useTransactionApproval";
import type {
  CartLine,
  Customer,
  FinancingForm,
  ProductSelection,
  VariantRow,
} from "../types/pos.types";

function playItemAddedSound() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(1174.66, now + 0.07);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
  oscillator.addEventListener("ended", () => void context.close(), {
    once: true,
  });
}

export function CheckoutPage() {
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<"sku" | "serial">("serial");
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProductSelection>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantRow | null>(
    null,
  );
  const [barcodeUnits, setBarcodeUnits] = useState<
    StockUnitRecord[] | undefined
  >();
  const [serialDialogOpen, setSerialDialogOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_pickup");
  const [financing, setFinancing] = useState<FinancingForm>(emptyFinancingForm);
  const [isParking, setIsParking] = useState(false);
  const [isDirectSubmitting, setIsDirectSubmitting] = useState(false);
  const [transactionMessage, setTransactionMessage] = useState<string | null>(
    null,
  );

  const {
    state: approvalState,
    errorMessage: approvalError,
    submit: submitForApproval,
    reset: resetApproval,
  } = useTransactionApproval((response) => {
    setCart([]);
    setFinancing(emptyFinancingForm());
    setCustomer(null);
    setTransactionMessage(
      response?.message ?? "Transaction approved and sent to printer.",
    );
  });

  const inventoryQuery = useQuery({
    queryKey: ["checkout-inventory"],
    queryFn: () => branchInventoryItemApi.getSerialized({ per_page: 100 }),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const allProducts = useMemo(
    () => groupBySerializedItems(inventoryQuery.data?.data ?? []),
    [inventoryQuery.data?.data],
  );

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allProducts.filter((product) => {
      const inStock =
        product.variants.reduce(
          (sum, variant) => sum + (variant.available_count ?? 0),
          0,
        ) > 0;
      const matchesSearch =
        searchMode === "serial" ||
        !query ||
        product.variants.some(
          (variant) =>
            variant.model?.toLowerCase().includes(query) ||
            variant.sku?.toLowerCase().includes(query),
        );
      return (showOutOfStock || inStock) && matchesSearch;
    });
  }, [allProducts, search, searchMode, showOutOfStock]);

  // The API returns nulls for empty fields; keep the sale payload to the same
  // shape the cart used before (undefined instead of null, no address block).
  const handleCustomerChange = (selected: Customer | null) => {
    if (!selected) {
      setCustomer(null);
      return;
    }
    setCustomer({
      customer_id: selected.customer_id,
      first_name: selected.first_name,
      middle_name: selected.middle_name || undefined,
      last_name: selected.last_name,
      contact_number: selected.contact_number || undefined,
    });
  };

  const total = cart.reduce(
    (sum, line) => sum + line.price * (line.serial ? 1 : line.quantity),
    0,
  );

  const addVariant = (
    variant: VariantRow,
    serial?: string,
    product = selectedItem,
  ): boolean => {
    if (
      serial &&
      cart.some(
        (line) =>
          line.variantId === variant.variant_id && line.serial === serial,
      )
    ) {
      return false;
    }

    setCart((current) => {
      if (serial) {
        return [
          ...current,
          {
            variantId: variant.variant_id,
            name: product?.item.name ?? variant.item.name,
            model: variant.model,
            price: Number(variant.price ?? 0),
            quantity: 1,
            serial,
            imageUrl: variant.image_url ?? variant.item.image_url,
          },
        ];
      }
      const existing = current.find(
        (line) => line.variantId === variant.variant_id && !line.serial,
      );
      if (existing)
        return current.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + 1 } : line,
        );
      return [
        ...current,
        {
          variantId: variant.variant_id,
          name: product?.item.name ?? variant.item.name,
          model: variant.model,
          price: Number(variant.price ?? 0),
          quantity: 1,
          imageUrl: variant.image_url ?? variant.item.image_url,
        },
      ];
    });
    setSelectedItem(null);
    return true;
  };

  const handleBarcodeSearch = async (valueToSearch: string) => {
    const value = valueToSearch.trim();
    if (!value) return;
    setSearch("");

    try {
      if (searchMode === "serial") {
        const response = await stockUnitApi.getVariantBySerial(value);
        const record = response.data;
        const variant: VariantRow = {
          variant_id: record.variant_id,
          branch_item_id: record.branch_item_id ?? record.variant_id,
          model: record.model ?? "",
          sku: record.sku,
          image_url: record.image_url,
          item_id: record.item_id,
          branch_id: record.branch_id,
          price: record.price,
          reorder_level: null,
          updated_at: new Date().toISOString(),
          is_serialized: record.is_serialized,
          stock_quantity: 1,
          reserved_count: 0,
          damaged_count: 0,
          available_count: record.status === "available" ? 1 : 0,
          item: record.item,
        };
        const product: ProductSelection = {
          item_id: record.item_id,
          item: record.item,
          is_serialized: record.is_serialized,
          variants: [variant],
        };

        if (record.status !== "available") {
          setTransactionMessage("That serial number is not available.");
          return;
        }

        if (addVariant(variant, record.serial_number, product)) {
          playItemAddedSound();
        }
        setTransactionMessage(null);
        return;
      }

      const response = await stockUnitApi.getBySku(value, {
        page: 1,
        per_page: 10,
        status: "available",
      });
      const stockUnit = response.data[0];
      const variantId = Number(stockUnit?.variant_id);
      const product = allProducts.find((item) =>
        item.variants.some(
          (variant) =>
            Number(variant.variant_id) === variantId ||
            Number(variant.branch_item_id) === variantId,
        ),
      );
      const variant = product?.variants.find(
        (item) =>
          Number(item.variant_id) === variantId ||
          Number(item.branch_item_id) === variantId,
      );

      if (!stockUnit || !product || !variant) {
        setTransactionMessage("No available item found for that barcode.");
        return;
      }

      if (variant.is_serialized) {
        setSelectedVariant(variant);
        setBarcodeUnits(response.data);
        setSerialDialogOpen(true);
      } else {
        if (addVariant(variant, undefined, product)) {
          playItemAddedSound();
        }
      }
      setTransactionMessage(null);
    } catch (error) {
      setTransactionMessage(
        error instanceof Error
          ? error.message
          : "Unable to search that barcode.",
      );
    }
  };

  const buildPayload = () => {
    const user = loginApi.getUser();
    return {
      branch_id: user?.branchId ? Number(user.branchId) : undefined,
      employee_id: user?.employeeId ? Number(user.employeeId) : undefined,
      payment_method: paymentMethod,
      customer: customer ?? null,
      customer_is_verified: false,
      items: buildSaleItems(cart),
      // Sent whenever the loan details are complete. A parked Home Credit sale
      // without them is saved without a financing record.
      ...(paymentMethod === HOME_CREDIT && isFinancingComplete(financing)
        ? { financing: toFinancingPayload(financing) }
        : {}),
    };
  };

  const submitTransaction = () => {
    if (
      !cart.length ||
      approvalState === "submitting" ||
      approvalState === "pending_oic" ||
      isParking ||
      isDirectSubmitting
    ) {
      return;
    }
    setTransactionMessage(null);
    submitForApproval(buildPayload(), 15000);
  };

  const handleContinueWithoutAuth = async () => {
    resetApproval();
    setIsDirectSubmitting(true);
    setTransactionMessage(null);
    try {
      const res = await salesApi.createWithoutAuthorization(buildPayload());
      setCart([]);
      setFinancing(emptyFinancingForm());
      setCustomer(null);
      setTransactionMessage(
        `Sale completed without authorization. Invoice: ${
          res.data?.sales_invoice_number || ""
        }`,
      );
    } catch (err: any) {
      setTransactionMessage(err?.message || "Failed to finalize sale.");
    } finally {
      setIsDirectSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    resetApproval();
    submitForApproval(buildPayload(), 15000);
  };

  const handleParkSale = async () => {
    resetApproval();
    await parkSale();
  };

  const parkSale = async () => {
    if (!cart.length || isParking || isDirectSubmitting) return;
    setIsParking(true);
    setTransactionMessage(null);
    try {
      const result = await salesApi.park({
        ...buildPayload(),
        reference_note: "Paused at POS terminal; resume later.",
      });
      setCart([]);
      setFinancing(emptyFinancingForm());
      setCustomer(null);
      setTransactionMessage(
        `Sale parked${
          result.data?.sales_invoice_number
            ? ` as ${result.data.sales_invoice_number}`
            : ""
        }.`,
      );
    } catch (error) {
      setTransactionMessage(
        error instanceof Error ? error.message : "Unable to park sale.",
      );
    } finally {
      setIsParking(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Checkout Terminal
          </h1>
          <p className="text-xs text-muted-foreground">
            Scan barcode or select products to add to cart
          </p>
        </div>
      </div>

      {/* Main 2-column workspace locked to parent height */}
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_360px]">
        <ProductGrid
          search={search}
          searchMode={searchMode}
          showOutOfStock={showOutOfStock}
          onSearchChange={setSearch}
          onSearchModeChange={(mode) => {
            setSearchMode(mode);
            setSearch("");
            setTransactionMessage(null);
          }}
          onShowOutOfStockChange={setShowOutOfStock}
          products={products}
          isLoading={inventoryQuery.isLoading}
          isError={inventoryQuery.isError}
          onSelect={setSelectedItem}
          onBarcodeSearch={handleBarcodeSearch}
        />
        <CartPanel
          loadCustomers={customersApi.list}
          customer={customer}
          cart={cart}
          total={total}
          paymentMethod={paymentMethod}
          financing={financing}
          onFinancingChange={setFinancing}
          message={transactionMessage}
          isSubmitting={approvalState === "submitting" || isDirectSubmitting}
          isParking={isParking}
          isPendingApproval={approvalState === "pending_oic"}
          onCustomerChange={handleCustomerChange}
          onAddCustomer={() => setCustomerDialogOpen(true)}
          onPaymentChange={setPaymentMethod}
          onRemove={(line) =>
            setCart((current) => current.filter((item) => item !== line))
          }
          onPark={parkSale}
          onSubmit={submitTransaction}
        />
      </div>

      {/* Fallback Authorization Modal */}
      <Dialog
        open={approvalState === "fallback"}
        onOpenChange={(open) => !open && resetApproval()}
      >
        <DialogContent className="sm:max-w-md z-[99999]">
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-center text-base font-semibold">
              Authorization Required
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {approvalError || "Sales OIC is unavailable."} How would you like
              to proceed?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <Button
              onClick={handleContinueWithoutAuth}
              className="w-full text-xs"
            >
              <PlayCircle className="mr-1.5 size-4" />
              Continue without authorization
            </Button>
            <Button
              variant="outline"
              onClick={handleTryAgain}
              className="w-full text-xs"
            >
              <RefreshCw className="mr-1.5 size-4" />
              Try again for authorization
            </Button>
            <Button
              variant="secondary"
              onClick={handleParkSale}
              className="w-full text-xs"
            >
              <PauseCircle className="mr-1.5 size-4" />
              Park sale to resume later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VariantDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSelect={(variant) =>
          variant.is_serialized
            ? (setSelectedVariant(variant), setSerialDialogOpen(true))
            : addVariant(variant) && playItemAddedSound()
        }
      />
      <SerialDialog
        variant={selectedVariant}
        open={serialDialogOpen}
        units={barcodeUnits}
        onClose={() => {
          setSerialDialogOpen(false);
          setBarcodeUnits(undefined);
        }}
        onSelect={(serial) => {
          if (!selectedVariant) return;
          void stockUnitApi
            .getVariantBySerial(serial)
            .then((record) => {
              const variant: VariantRow = {
                variant_id: record.data.variant_id,
                branch_item_id:
                  record.data.branch_item_id ?? record.data.variant_id,
                model: record.data.model ?? "",
                sku: record.data.sku,
                image_url: record.data.image_url,
                item_id: record.data.item_id,
                branch_id: record.data.branch_id,
                price: record.data.price,
                reorder_level: selectedVariant.reorder_level,
                updated_at: selectedVariant.updated_at,
                is_serialized: record.data.is_serialized,
                stock_quantity: 1,
                reserved_count: 0,
                damaged_count: 0,
                available_count: record.data.status === "available" ? 1 : 0,
                item: record.data.item,
              };
              if (
                addVariant(variant, record.data.serial_number, {
                  item_id: record.data.item_id,
                  item: record.data.item,
                  is_serialized: record.data.is_serialized,
                  variants: [variant],
                })
              ) {
                playItemAddedSound();
              }
            })
            .catch((error: unknown) => {
              setTransactionMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to load the selected serial.",
              );
            });
          setSerialDialogOpen(false);
          setBarcodeUnits(undefined);
        }}
      />
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create customer</DialogTitle>
            <DialogDescription>
              Add customer details to use for this sale.
            </DialogDescription>
          </DialogHeader>
          <CreateCustomerForm
            onCancel={() => setCustomerDialogOpen(false)}
            onSuccess={(createdCustomer) => {
              if (!createdCustomer) return;
              setCustomer({
                customer_id: createdCustomer.customer_id,
                first_name: createdCustomer.first_name,
                middle_name: createdCustomer.middle_name || undefined,
                last_name: createdCustomer.last_name,
                contact_number: createdCustomer.contact_number || undefined,
              });
              setCustomerDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
