<?php

namespace App\Entities;

use App\Repositories\AttributeOptionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AttributeOptionRepository::class)]
#[ORM\Table(name: 'attribute_options')]
#[ORM\UniqueConstraint(name: 'uq_attribute_option', columns: ['attribute_id', 'option_value'])]
class AttributeOption
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'option_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'attribute_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private int $attributeId;

    #[ORM\Column(name: 'option_value', type: Types::STRING, length: 100)]
    private string $value;

    public function __construct(int $attributeId, string $value)
    {
        $this->attributeId = $attributeId;
        $this->value = $value;
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getAttributeId(): int { return (int) $this->attributeId; }
    public function getValue(): string { return $this->value; }
    public function setAttributeId(int $attributeId): self { $this->attributeId = $attributeId; return $this; }
    public function setValue(string $value): self { $this->value = $value; return $this; }
}