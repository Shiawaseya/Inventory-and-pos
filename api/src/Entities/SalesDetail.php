<?php

namespace App\Entities;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'sales_details')]
#[ORM\Index(name: 'idx_sales_invoice', columns: ['sales_invoice_id'])]
#[ORM\Index(name: 'idx_stock_unit', columns: ['stock_unit_id'])]
#[ORM\Index(name: 'idx_inventory', columns: ['inventory_id'])]
class SalesDetail
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'detail_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: SalesInvoice::class, inversedBy: 'details')]
    #[ORM\JoinColumn(name: 'sales_invoice_id', referencedColumnName: 'sales_invoice_id', nullable: true, onDelete: 'SET NULL')]
    private ?SalesInvoice $salesInvoice = null;

    #[ORM\ManyToOne(targetEntity: StockUnit::class)]
    #[ORM\JoinColumn(name: 'stock_unit_id', referencedColumnName: 'stock_unit_id', nullable: true, onDelete: 'RESTRICT')]
    private ?StockUnit $stockUnit = null;

    #[ORM\ManyToOne(targetEntity: Inventory::class)]
    #[ORM\JoinColumn(name: 'inventory_id', referencedColumnName: 'inventory_id', nullable: true, onDelete: 'RESTRICT')]
    private ?Inventory $inventory = null;

    #[ORM\Column(name: 'quantity', type: Types::INTEGER, nullable: true)]
    private ?int $quantity = null;

    #[ORM\Column(name: 'unit_price_at_sale', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $unitPriceAtSale = null;

    // --- Getters & Setters ---

    public function getId(): ?int
    {
        return $this->id !== null ? (int) $this->id : null;
    }

    public function getSalesInvoice(): ?SalesInvoice
    {
        return $this->salesInvoice;
    }

    public function setSalesInvoice(?SalesInvoice $invoice): self
    {
        $this->salesInvoice =$invoice;
        return $this;
    }

    public function getStockUnit(): ?StockUnit
    {
        return $this->stockUnit;
    }

    public function setStockUnit(?StockUnit $stockUnit): self
    {
        $this->stockUnit =$stockUnit;
        return $this;
    }

    public function getInventory(): ?Inventory
    {
        return $this->inventory;
    }

    public function setInventory(?Inventory $inventory): self
    {
        $this->inventory =$inventory;
        return $this;
    }

    public function getQuantity(): int
    {
        return (int) $this->quantity;
    }

    public function setQuantity(int $quantity): self
    {
        $this->quantity =$quantity;
        return $this;
    }

    public function getUnitPriceAtSale(): float
    {
        return (float) $this->unitPriceAtSale;
    }

    public function setUnitPriceAtSale(float $unitPrice): self
    {
        $this->unitPriceAtSale = number_format($unitPrice, 2, '.', '');
        return $this;
    }
}