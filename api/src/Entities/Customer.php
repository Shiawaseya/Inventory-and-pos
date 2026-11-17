<?php

namespace App\Entities;

use App\Repositories\CustomerRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CustomerRepository::class)]
#[ORM\Table(name: 'customers')]
#[ORM\HasLifecycleCallbacks]
class Customer
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'customer_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'first_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $firstName = null;

    #[ORM\Column(name: 'middle_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $middleName = null;

    #[ORM\Column(name: 'last_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $lastName = null;

    #[ORM\Column(name: 'contact_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $contactNumber = null;

    #[ORM\Column(name: 'email_address', type: Types::STRING, length: 255, nullable: true)]
    private ?string $emailAddress = null;

    #[ORM\ManyToOne(targetEntity: Address::class, cascade: ['persist'])]
    #[ORM\JoinColumn(name: 'address_id', referencedColumnName: 'address_id', nullable: true, onDelete: 'SET NULL')]
    private ?Address $address = null;

    #[ORM\Column(name: 'tin', type: Types::STRING, length: 50, nullable: true)]
    private ?string $tin = null;

    #[ORM\Column(name: 'business_style', type: Types::STRING, length: 100, nullable: true)]
    private ?string $businessStyle = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new DateTimeImmutable();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if ($this->createdAt === null) {
            $this->createdAt = new DateTimeImmutable();
        }
    }

    // --- Getters & Setters ---

    public function getId(): ?int
    {
        return $this->id !== null ? (int) $this->id : null;
    }

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function setFirstName(?string $firstName): self
    {
        $this->firstName = $firstName;
        return $this;
    }

    public function getMiddleName(): ?string
    {
        return $this->middleName;
    }

    public function setMiddleName(?string $middleName): self
    {
        $this->middleName = $middleName;
        return $this;
    }

    public function getLastName(): ?string
    {
        return $this->lastName;
    }

    public function setLastName(?string $lastName): self
    {
        $this->lastName = $lastName;
        return $this;
    }

    public function getContactNumber(): ?string
    {
        return $this->contactNumber;
    }

    public function setContactNumber(?string $contactNumber): self
    {
        $this->contactNumber = $contactNumber;
        return $this;
    }

    public function getEmailAddress(): ?string
    {
        return $this->emailAddress;
    }

    public function getAddress(): ?Address { return $this->address; }
    public function setAddress(?Address $address): self { $this->address = $address; return $this; }

    public function setEmailAddress(?string $emailAddress): self
    {
        $this->emailAddress = $emailAddress;
        return $this;
    }

    public function getStreetAddress(): ?string { return $this->address?->getStreetAddress(); }
    public function getBarangay(): ?string { return $this->address?->getBarangay(); }
    public function getCityMunicipality(): ?string { return $this->address?->getCityMunicipality(); }
    public function getProvince(): ?string { return $this->address?->getProvince(); }
    public function getRegion(): ?string { return $this->address?->getRegion(); }
    public function getPostalCode(): ?string { return $this->address?->getPostalCode(); }
    public function getPsgcCode(): ?string { return $this->address?->getPsgcCode(); }

    public function getTin(): ?string
    {
        return $this->tin;
    }

    public function setTin(?string $tin): self
    {
        $this->tin = $tin;
        return $this;
    }

    public function getBusinessStyle(): ?string
    {
        return $this->businessStyle;
    }

    public function setBusinessStyle(?string $businessStyle): self
    {
        $this->businessStyle = $businessStyle;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getFullName(): string
    {
        return trim(sprintf('%s %s %s', $this->firstName ?? '', $this->middleName ?? '', $this->lastName ?? ''));
    }
}