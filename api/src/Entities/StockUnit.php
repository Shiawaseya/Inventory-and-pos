<?php

namespace App\Entities;

use App\Enums\StockUnitStatus;
use App\Repositories\StockUnitRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StockUnitRepository::class)]
#[ORM\Table(name: 'stock_unit')]
#[ORM\Index(name: 'idx_status_branch', columns: ['status', 'branch_id'])]
#[ORM\Index(name: 'idx_variant', columns: ['variant_id'])]
#[ORM\Index(name: 'branch_id', columns: ['branch_id'])]
#[ORM\UniqueConstraint(name: 'serial_number', columns: ['serial_number'])]
class StockUnit
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'stock_unit_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'serial_number', type: Types::STRING, length: 100, unique: true)]
    private string $serialNumber;

    #[ORM\Column(name: 'status', type: Types::STRING, enumType: StockUnitStatus::class, options: ['default' => 'available'])]
    private StockUnitStatus $status = StockUnitStatus::AVAILABLE;

    #[ORM\ManyToOne(targetEntity: ItemVariant::class)]
    #[ORM\JoinColumn(name: 'variant_id', referencedColumnName: 'variant_id', nullable: true, onDelete: 'SET NULL')]
    private ?ItemVariant $variant = null;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: true, onDelete: 'SET NULL')]
    private ?Branch $branch = null;

    #[ORM\Column(name: 'received_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $receivedAt = null;

    public function __construct(string $serialNumber, ?Branch $branch = null, ?ItemVariant $variant = null)
    {
        $this->serialNumber = $serialNumber;
        $this->branch = $branch;
        $this->variant = $variant;
        $this->status = StockUnitStatus::AVAILABLE;
        $this->receivedAt = new DateTimeImmutable();
    }

    // --- Getters and Setters ---

    public function getId(): ?int
    {
        return $this->id !== null ? (int) $this->id : null;
    }

    public function getSerialNumber(): string
    {
        return $this->serialNumber;
    }

    public function setSerialNumber(string $serialNumber): self
    {
        $this->serialNumber = $serialNumber;
        return $this;
    }

    public function getStatus(): StockUnitStatus
    {
        return $this->status;
    }

    public function setStatus(StockUnitStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getReceivedAt(): ?DateTimeImmutable
    {
        return $this->receivedAt;
    }

    public function setReceivedAt(?DateTimeImmutable $receivedAt): self
    {
        $this->receivedAt = $receivedAt;
        return $this;
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
}