<?php

namespace App\Entities;

use DateTimeImmutable;
use App\Repositories\ItemVariantRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ItemVariantRepository::class)]
#[ORM\Table(name: 'item_variants')]
#[ORM\Index(name: 'idx_item_id', columns: ['item_id'])]
#[ORM\UniqueConstraint(name: 'uniq_item_model', columns: ['item_id', 'model'])]
#[ORM\HasLifecycleCallbacks]
class ItemVariant
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'variant_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Item::class)]
    #[ORM\JoinColumn(name: 'item_id', referencedColumnName: 'item_id', nullable: false, onDelete: 'CASCADE')]
    private Item $item;

    #[ORM\Column(name: 'model', type: Types::STRING, length: 255, nullable: true)]
    private ?string $model = null;

    #[ORM\Column(name: 'sku', type: Types::STRING, length: 100, nullable: true)]
    private ?string $sku = null;

    #[ORM\Column(name: 'initial_serial_number', type: Types::STRING, length: 100, nullable: true)]
    private ?string $initialSerialNumber = null;

    #[ORM\Column(name: 'image_url', type: Types::STRING, length: 255, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, nullable: true, options: ['default' => 1])]
    private ?bool $isActive = true;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct(Item $item, ?string $model = null, ?string $sku = null)
    {
        $this->item = $item;
        $this->model = $model;
        $this->sku = $sku;
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

    public function getItem(): Item
    {
        return $this->item;
    }

    public function setItem(Item $item): self
    {
        $this->item = $item;
        return $this;
    }

    public function getModel(): ?string
    {
        return $this->model;
    }

    public function setModel(?string $model): self
    {
        $this->model = $model;
        return $this;
    }

    public function getSku(): ?string
    {
        return $this->sku;
    }

    public function setSku(?string $sku): self
    {
        $this->sku = $sku;
        return $this;
    }

    public function getInitialSerialNumber(): ?string
    {
        return $this->initialSerialNumber;
    }

    public function setInitialSerialNumber(?string $initialSerialNumber): self
    {
        $this->initialSerialNumber = $initialSerialNumber;
        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): self
    {
        $this->imageUrl = $imageUrl;
        return $this;
    }

    public function isActive(): ?bool
    {
        return $this->isActive;
    }
public function getIsActive(): ?bool
    {
        return $this->isActive;
    }
    public function setIsActive(?bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}