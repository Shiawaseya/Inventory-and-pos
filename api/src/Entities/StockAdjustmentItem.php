<?php

namespace App\Entities;

use App\Enums\StockUnitStatus;
use App\Repositories\StockAdjustmentItemRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StockAdjustmentItemRepository::class)]
#[ORM\Table(name: 'stock_adjustment_items')]
#[ORM\Index(name: 'idx_adj_parent', columns: ['stock_adjustment_id'])]
#[ORM\Index(name: 'idx_adj_stock_unit', columns: ['stock_unit_id'])]
#[ORM\HasLifecycleCallbacks]
class StockAdjustmentItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'adjustment_item_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: StockAdjustment::class, inversedBy: 'items')]
    #[ORM\JoinColumn(name: 'stock_adjustment_id', referencedColumnName: 'stock_adjustment_id', nullable: false, onDelete: 'CASCADE')]
    private StockAdjustment $stockAdjustment;

    #[ORM\ManyToOne(targetEntity: StockUnit::class)]
    #[ORM\JoinColumn(name: 'stock_unit_id', referencedColumnName: 'stock_unit_id', nullable: false, onDelete: 'RESTRICT')]
    private StockUnit $stockUnit;

    #[ORM\Column(name: 'previous_status', type: Types::STRING, enumType: StockUnitStatus::class)]
    private StockUnitStatus $previousStatus;

    #[ORM\Column(name: 'new_status', type: Types::STRING, enumType: StockUnitStatus::class)]
    private StockUnitStatus $newStatus;

    #[ORM\Column(name: 'notes', type: Types::STRING, length: 255, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct(
        StockAdjustment $stockAdjustment,
        StockUnit $stockUnit,
        StockUnitStatus $previousStatus,
        StockUnitStatus $newStatus,
        ?string $notes = null
    ) {
        $this->stockAdjustment = $stockAdjustment;
        $this->stockUnit = $stockUnit;
        $this->previousStatus = $previousStatus;
        $this->newStatus = $newStatus;
        $this->notes = $notes;
        $this->createdAt = new DateTimeImmutable();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if ($this->createdAt === null) {
            $this->createdAt = new DateTimeImmutable();
        }
    }

    // --- Getters and Setters ---

    public function getId(): ?int
    {
        return $this->id !== null ? (int) $this->id : null;
    }

    public function getStockAdjustment(): StockAdjustment
    {
        return $this->stockAdjustment;
    }

    public function setStockAdjustment(StockAdjustment $stockAdjustment): self
    {
        $this->stockAdjustment = $stockAdjustment;
        return $this;
    }

    public function getStockUnit(): StockUnit
    {
        return $this->stockUnit;
    }

    public function setStockUnit(StockUnit $stockUnit): self
    {
        $this->stockUnit = $stockUnit;
        return $this;
    }

    public function getPreviousStatus(): StockUnitStatus
    {
        return $this->previousStatus;
    }

    public function setPreviousStatus(StockUnitStatus $previousStatus): self
    {
        $this->previousStatus = $previousStatus;
        return $this;
    }

    public function getNewStatus(): StockUnitStatus
    {
        return $this->newStatus;
    }

    public function setNewStatus(StockUnitStatus $newStatus): self
    {
        $this->newStatus = $newStatus;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $this->notes = $notes;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}