<?php

namespace App\Entities;

use App\Repositories\ItemAttributeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ItemAttributeRepository::class)]
#[ORM\Table(name: 'item_attributes')]
#[ORM\UniqueConstraint(name: 'uq_attribute_name', columns: ['name'])]
class ItemAttribute
{
    public const DATA_TYPES = ['numeric', 'option', 'text'];

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'attribute_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'name', type: Types::STRING, length: 100, unique: true)]
    private string $name;

    #[ORM\Column(name: 'data_type', type: Types::STRING, length: 10)]
    private string $dataType;

    public function __construct(string $name, string $dataType = 'text')
    {
        $this->name = $name;
        $this->dataType = $dataType;
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getName(): string { return $this->name; }
    public function getDataType(): string { return $this->dataType; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function setDataType(string $dataType): self { $this->dataType = $dataType; return $this; }
}