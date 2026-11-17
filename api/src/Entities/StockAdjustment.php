<?php

namespace App\Entities;

use App\Enums\StockAdjustmentReason;
use App\Repositories\StockAdjustmentRepository;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StockAdjustmentRepository::class)]
#[ORM\Table(name: 'stock_adjustments')]
#[ORM\Index(name: 'idx_adjustment_branch', columns: ['branch_id'])]
#[ORM\Index(name: 'idx_adjusted_by', columns: ['adjusted_by'])]
#[ORM\Index(name: 'idx_created_at', columns: ['created_at'])]
#[ORM\UniqueConstraint(name: 'uq_adjustment_number', columns: ['adjustment_number'])]
#[ORM\HasLifecycleCallbacks]
class StockAdjustment
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'stock_adjustment_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'adjustment_number', type: Types::STRING, length: 50, unique: true)]
    private string $adjustmentNumber;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: false, onDelete: 'RESTRICT')]
    private Branch $branch;

    #[ORM\Column(name: 'reason', type: Types::STRING, enumType: StockAdjustmentReason::class)]
    private StockAdjustmentReason $reason;

    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'adjusted_by', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $adjustedBy = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    /**
     * @var Collection<int, StockAdjustmentItem>
     */
    #[ORM\OneToMany(targetEntity: StockAdjustmentItem::class, mappedBy: 'stockAdjustment', cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $items;

    public function __construct(Branch $branch, string $adjustmentNumber, StockAdjustmentReason $reason)
    {
        $this->branch = $branch;
        $this->adjustmentNumber = $adjustmentNumber;
        $this->reason = $reason;
        $this->items = new ArrayCollection();
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

    public function getAdjustmentNumber(): string
    {
        return $this->adjustmentNumber;
    }

    public function setAdjustmentNumber(string $adjustmentNumber): self
    {
        $this->adjustmentNumber = $adjustmentNumber;
        return $this;
    }

    public function getBranch(): Branch
    {
        return $this->branch;
    }

    public function setBranch(Branch $branch): self
    {
        $this->branch = $branch;
        return $this;
    }

    public function getReason(): StockAdjustmentReason
    {
        return $this->reason;
    }

    public function setReason(StockAdjustmentReason $reason): self
    {
        $this->reason = $reason;
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

    public function getAdjustedBy(): ?Employee
    {
        return $this->adjustedBy;
    }

    public function setAdjustedBy(?Employee $adjustedBy): self
    {
        $this->adjustedBy = $adjustedBy;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }

    /**
     * @return Collection<int, StockAdjustmentItem>
     */
    public function getItems(): Collection
    {
        return $this->items;
    }

    public function addItem(StockAdjustmentItem $item): self
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setStockAdjustment($this);
        }
        return $this;
    }

    public function removeItem(StockAdjustmentItem $item): self
    {
        $this->items->removeElement($item);
        return $this;
    }
}