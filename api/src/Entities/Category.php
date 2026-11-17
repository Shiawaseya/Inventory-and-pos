<?php

namespace App\Entities;

use App\Repositories\CategoryRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CategoryRepository::class)]
#[ORM\Table(name: 'categories')]
#[ORM\Index(name: 'recorded_by', columns: ['recorded_by'])]
#[ORM\HasLifecycleCallbacks]
class Category
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'category_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'name', type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'recorded_by', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $recordedBy = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct(string $name, ?Employee $recordedBy = null)
    {
        $this->name = $name;
        $this->recordedBy = $recordedBy;
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