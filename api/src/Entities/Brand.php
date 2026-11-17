<?php

namespace App\Entities;

use App\Repositories\BrandRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BrandRepository::class)]
#[ORM\Table(name: 'brands')]
#[ORM\Index(name: 'idx_is_active', columns: ['is_active'])]
#[ORM\Index(name: 'recorded_by', columns: ['recorded_by'])]
#[ORM\UniqueConstraint(name: 'name', columns: ['name'])]
#[ORM\HasLifecycleCallbacks]
class Brand
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'brand_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'name', type: Types::STRING, length: 100, unique: true)]
    private string $name;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, nullable: true, options: ['default' => 1])]
    private ?bool $isActive = true;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'recorded_by', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $recordedBy = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct(string $name, ?Employee $recordedBy = null)
    {
        $this->name = $name;
        $this->recordedBy = $recordedBy;
        $this->isActive = true;
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

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function isActive(): ?bool
    {
        return $this->isActive;
    }

    public function setIsActive(?bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getRecordedBy(): ?Employee
    {
        return $this->recordedBy;
    }

    public function setRecordedBy(?Employee $recordedBy): self
    {
        $this->recordedBy = $recordedBy;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}