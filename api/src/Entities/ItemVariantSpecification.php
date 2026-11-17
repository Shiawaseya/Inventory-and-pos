<?php

namespace App\Entities;

use App\Repositories\ItemVariantSpecificationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ItemVariantSpecificationRepository::class)]
#[ORM\Table(name: 'item_variant_specifications')]
#[ORM\Index(name: 'idx_spec_attr', columns: ['attribute_id'])]
#[ORM\Index(name: 'idx_spec_option', columns: ['option_id'])]
#[ORM\Index(name: 'idx_spec_unit', columns: ['unit_id'])]
class ItemVariantSpecification
{
    #[ORM\Id]
    #[ORM\Column(name: 'variant_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private int $variantId;

    #[ORM\Id]
    #[ORM\Column(name: 'attribute_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private int $attributeId;

    #[ORM\Column(name: 'option_id', type: Types::BIGINT, nullable: true, options: ['unsigned' => true])]
    private ?int $optionId = null;

    #[ORM\Column(name: 'numeric_value', type: Types::DECIMAL, precision: 12, scale: 4, nullable: true)]
    private ?string $numericValue = null;

    #[ORM\Column(name: 'text_value', type: Types::STRING, length: 255, nullable: true)]
    private ?string $textValue = null;

    #[ORM\Column(name: 'unit_id', type: Types::BIGINT, nullable: true, options: ['unsigned' => true])]
    private ?int $unitId = null;

    public function __construct(int $variantId, int $attributeId)
    {
        $this->variantId = $variantId;
        $this->attributeId = $attributeId;
    }

    public function getVariantId(): int { return (int) $this->variantId; }
    public function getAttributeId(): int { return (int) $this->attributeId; }
    public function getOptionId(): ?int { return $this->optionId !== null ? (int) $this->optionId : null; }
    public function getNumericValue(): ?string { return $this->numericValue; }
    public function getTextValue(): ?string { return $this->textValue; }
    public function getUnitId(): ?int { return $this->unitId !== null ? (int) $this->unitId : null; }
    public function setOptionId(?int $optionId): self { $this->optionId = $optionId; return $this; }
    public function setNumericValue(?string $numericValue): self { $this->numericValue = $numericValue; return $this; }
    public function setTextValue(?string $textValue): self { $this->textValue = $textValue; return $this; }
    public function setUnitId(?int $unitId): self { $this->unitId = $unitId; return $this; }
}