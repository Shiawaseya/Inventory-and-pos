<?php

namespace App\Entities;

use App\Repositories\ItemRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use DateTime;

#[ORM\Entity(repositoryClass: ItemRepository::class)]
#[ORM\Table(name: 'items')]
#[ORM\HasLifecycleCallbacks]
class Item
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'item_id', type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(name: 'name', type: 'string', length: 255)]
    private string $name = '';

    #[ORM\Column(name: 'image_url', type: 'string', length: 500, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(name: 'is_serialized', type: 'boolean', options: ['default' => false])]
    private bool $isSerialized = false;

    #[ORM\ManyToOne(targetEntity: Brand::class)]
    #[ORM\JoinColumn(name: 'brand_id', referencedColumnName: 'brand_id', nullable: true)]
    private ?Brand $brand = null;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'category_id', nullable: true)]
    private ?Category $category = null;

    #[ORM\OneToMany(mappedBy: 'item', targetEntity: ItemVariant::class, cascade: ['persist', 'remove'])]
    private Collection $variants;

    #[ORM\Column(name: 'created_at', type: 'datetime', nullable: true)]
    private ?DateTime $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: 'datetime', nullable: true)]
    private ?DateTime $updatedAt = null;

    public function __construct()
    {
        $this->variants = new ArrayCollection();
        $this->createdAt = new DateTime();
        $this->updatedAt = new DateTime();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new DateTime();
        $this->updatedAt = new DateTime();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): self
    {
        $this->imageUrl = $imageUrl;
        return $this;
    }

    public function getIsSerialized(): bool
    {
        return $this->isSerialized;
    }
    public function isSerialized(): bool
    {
        return $this->isSerialized;
    }

    public function setIsSerialized(bool $isSerialized): self
    {
        $this->isSerialized = $isSerialized;
        return $this;
    }

    public function getBrand(): ?Brand
    {
        return $this->brand;
    }

    public function setBrand(?Brand $brand): self
    {
        $this->brand = $brand;
        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): self
    {
        $this->category = $category;
        return $this;
    }

    /**
     * @return Collection<int, ItemVariant>
     */
    public function getVariants(): Collection
    {
        return $this->variants;
    }

    public function addVariant(ItemVariant $variant): self
    {
        if (!$this->variants->contains($variant)) {
            $this->variants->add($variant);
            $variant->setItem($this);
        }
        return $this;
    }

    public function removeVariant(ItemVariant $variant): self
    {
        if ($this->variants->removeElement($variant)) {
            if ($variant->getItem() === $this) {
                $variant->setItem(null);
            }
        }
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