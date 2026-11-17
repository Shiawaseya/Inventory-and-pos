<?php

namespace App\Entities;

use App\Repositories\InventoryRepository;
use DateTime;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InventoryRepository::class)]
#[ORM\Table(name: 'inventory')]
#[ORM\UniqueConstraint(name: 'inventory_variant_branch', columns: ['variant_id', 'branch_id'])]
#[ORM\Index(name: 'idx_branch', columns: ['branch_id'])]
#[ORM\Index(name: 'updated_by', columns: ['updated_by'])]
#[ORM\HasLifecycleCallbacks]
class Inventory
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'inventory_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ItemVariant::class)]
    #[ORM\JoinColumn(name: 'variant_id', referencedColumnName: 'variant_id', nullable: true, onDelete: 'SET NULL')]
    private ?ItemVariant $variant = null;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: true, onDelete: 'SET NULL')]
    private ?Branch $branch = null;

    #[ORM\Column(name: 'quantity', type: Types::INTEGER, nullable: true)]
    private ?int $quantity = 0;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'updated_by', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $updatedBy = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?DateTime $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?DateTime $updatedAt = null;

    public function __construct(?ItemVariant $variant = null, ?Branch $branch = null, int $quantity = 0, ?Employee $updatedBy = null)
    {
        $this->variant = $variant;
        $this->branch = $branch;
        $this->quantity = $quantity;
        $this->updatedBy = $updatedBy;
        $this->createdAt = new DateTime();
        $this->updatedAt = new DateTime();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if ($this->createdAt === null) {
            $this->createdAt = new DateTime();
        }
        $this->updatedAt = new DateTime();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    // --- Getters & Setters ---

    public function getId(): ?int
    {
        return $this->id !== null ? (int) $this->id : null;
    }

    public function getVariant(): ?ItemVariant
    {
        return $this->variant;
    }

    public function setVariant(?ItemVariant $variant): self
    {
        $this->variant = $variant;
        return $this;
    }

    public function getBranch(): ?Branch
    {
        return $this->branch;
    }

    public function setBranch(?Branch $branch): self
    {
        $this->branch = $branch;
        return $this;
    }

    public function getQuantity(): int
    {
        return (int) $this->quantity;
    }

    public function setQuantity(int $quantity): self
    {
        $this->quantity = $quantity;
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

    public function getCreatedAt(): ?DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?DateTime
    {
        return $this->updatedAt;
    }
}