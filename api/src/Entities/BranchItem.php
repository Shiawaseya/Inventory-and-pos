<?php

namespace App\Entities;

use App\Repositories\BranchItemRepository;
use DateTime;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BranchItemRepository::class)]
#[ORM\Table(name: 'branch_item')]
#[ORM\UniqueConstraint(name: 'unique_variant_branch', columns: ['variant_id', 'branch_id'])]
#[ORM\Index(name: 'branch_id', columns: ['branch_id'])]
#[ORM\Index(name: 'updated_by', columns: ['updated_by'])]
#[ORM\HasLifecycleCallbacks]
class BranchItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'branch_item_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ItemVariant::class)]
    #[ORM\JoinColumn(name: 'variant_id', referencedColumnName: 'variant_id', nullable: false, onDelete: 'CASCADE')]
    private ItemVariant $variant;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: false, onDelete: 'CASCADE')]
    private Branch $branch;

    #[ORM\Column(name: 'price', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $price;

    #[ORM\Column(name: 'reorder_level', type: Types::INTEGER, nullable: true)]
    private ?int $reorderLevel = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'updated_by', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $updatedBy = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?DateTime $updatedAt = null;

    public function __construct(ItemVariant $variant, Branch $branch, float $price, ?int $reorderLevel = null, ?Employee $updatedBy = null)
    {
        $this->variant = $variant;
        $this->branch = $branch;
        $this->price = number_format($price, 2, '.', '');
        $this->reorderLevel = $reorderLevel;
        $this->updatedBy = $updatedBy;
        $this->updatedAt = new DateTime();
    }

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function onUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    // --- Getters and Setters ---

    public function getId(): ?int
    {
        return $this->id !== null ? (int) $this->id : null;
    }

    public function getVariant(): ItemVariant
    {
        return $this->variant;
    }

    public function setVariant(ItemVariant $variant): self
    {
        $this->variant = $variant;
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

    public function getPrice(): float
    {
        return (float) $this->price;
    }

    public function setPrice(float $price): self
    {
        $this->price = number_format($price, 2, '.', '');
        return $this;
    }

    public function getReorderLevel(): ?int
    {
        return $this->reorderLevel;
    }

    public function setReorderLevel(?int $reorderLevel): self
    {
        $this->reorderLevel = $reorderLevel;
        return $this;
    }

    public function getUpdatedBy(): ?Employee
    {
        return $this->updatedBy;
    }

    public function setUpdatedBy(?Employee $updatedBy): self
    {
        $this->updatedBy = $updatedBy;
        return $this;
    }

    public function getUpdatedAt(): ?DateTime
    {
        return $this->updatedAt;
    }
}