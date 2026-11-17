<?php

namespace App\Entities;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'addresses')]
#[ORM\HasLifecycleCallbacks]
class Address
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'address_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'street_address', type: Types::STRING, length: 255, nullable: true)]
    private ?string $streetAddress = null;

    #[ORM\Column(name: 'barangay', type: Types::STRING, length: 100, nullable: true)]
    private ?string $barangay = null;

    #[ORM\Column(name: 'city_municipality', type: Types::STRING, length: 100, nullable: true)]
    private ?string $cityMunicipality = null;

    #[ORM\Column(name: 'province', type: Types::STRING, length: 100, nullable: true)]
    private ?string $province = null;

    #[ORM\Column(name: 'region', type: Types::STRING, length: 100, nullable: true)]
    private ?string $region = null;

    #[ORM\Column(name: 'postal_code', type: Types::STRING, length: 10, nullable: true)]
    private ?string $postalCode = null;

    #[ORM\Column(name: 'psgc_code', type: Types::STRING, length: 20, nullable: true)]
    private ?string $psgcCode = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->createdAt = new DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
    }

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function updateTimestamps(): void
    {
        $this->updatedAt = new DateTimeImmutable();
        if ($this->createdAt === null) {
            $this->createdAt = $this->updatedAt;
        }
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getStreetAddress(): ?string { return $this->streetAddress; }
    public function setStreetAddress(?string $value): self { $this->streetAddress = $value; return $this; }
    public function getBarangay(): ?string { return $this->barangay; }
    public function setBarangay(?string $value): self { $this->barangay = $value; return $this; }
    public function getCityMunicipality(): ?string { return $this->cityMunicipality; }
    public function setCityMunicipality(?string $value): self { $this->cityMunicipality = $value; return $this; }
    public function getProvince(): ?string { return $this->province; }
    public function setProvince(?string $value): self { $this->province = $value; return $this; }
    public function getRegion(): ?string { return $this->region; }
    public function setRegion(?string $value): self { $this->region = $value; return $this; }
    public function getPostalCode(): ?string { return $this->postalCode; }
    public function setPostalCode(?string $value): self { $this->postalCode = $value; return $this; }
    public function getPsgcCode(): ?string { return $this->psgcCode; }
    public function setPsgcCode(?string $value): self { $this->psgcCode = $value; return $this; }
}
