<?php

namespace App\Entities;

use App\Repositories\AttributeUnitRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AttributeUnitRepository::class)]
#[ORM\Table(name: 'attribute_units')]
#[ORM\UniqueConstraint(name: 'uq_unit_symbol', columns: ['symbol'])]
class AttributeUnit
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'unit_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'symbol', type: Types::STRING, length: 20, unique: true)]
    private string $symbol;

    #[ORM\Column(name: 'name', type: Types::STRING, length: 50)]
    private string $name;

    public function __construct(string $symbol, string $name)
    {
        $this->symbol = $symbol;
        $this->name = $name;
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getSymbol(): string { return $this->symbol; }
    public function getName(): string { return $this->name; }
    public function setSymbol(string $symbol): self { $this->symbol = $symbol; return $this; }
    public function setName(string $name): self { $this->name = $name; return $this; }
}