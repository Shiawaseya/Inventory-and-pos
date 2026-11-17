<?php

namespace App\Entities;

use App\Repositories\EmployeeRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EmployeeRepository::class)]
#[ORM\Table(name: 'employees')]
#[ORM\Index(name: 'fk_employees_branch', columns: ['branch_id'])]
#[ORM\Index(name: 'idx_role_id', columns: ['role_id'])]
#[ORM\Index(name: 'idx_is_active', columns: ['is_active'])]
#[ORM\UniqueConstraint(name: 'username', columns: ['username'])]
#[ORM\HasLifecycleCallbacks]
class Employee
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'employee_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'first_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $firstName = null;

    #[ORM\Column(name: 'middle_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $middleName = null;

    #[ORM\Column(name: 'last_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $lastName = null;

    #[ORM\Column(name: 'email', type: Types::STRING, length: 255, nullable: true, unique: true)]
    private ?string $email = null;

    #[ORM\Column(name: 'contact_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $contactNumber = null;

    #[ORM\ManyToOne(targetEntity: Address::class, cascade: ['persist'])]
    #[ORM\JoinColumn(name: 'address_id', referencedColumnName: 'address_id', nullable: true, onDelete: 'SET NULL')]
    private ?Address $address = null;

    #[ORM\Column(name: 'username', type: Types::STRING, length: 50, unique: true, nullable: true)]
    private ?string $username = null;

    #[ORM\Column(name: 'pin_hash', type: Types::TEXT, nullable: true)]
    private ?string $pinHash = null;

    #[ORM\Column(name: 'role_id', type: Types::BIGINT, nullable: true, options: ['unsigned' => true])]
    private ?int $roleId = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, nullable: true, options: ['default' => true])]
    private ?bool $isActive = true;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: false)]
    private Branch $branch;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'deactivated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $deactivatedAt = null;

    public function __construct(Branch $branch)
    {
        $this->branch = $branch;
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

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): self { $this->email = $email; return $this; }
    public function getContactNumber(): ?string { return $this->contactNumber; }
    public function setContactNumber(?string $contactNumber): self { $this->contactNumber = $contactNumber; return $this; }
    public function getAddress(): ?Address { return $this->address; }
    public function setAddress(?Address $address): self { $this->address = $address; return $this; }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(?string $username): self
    {
        $this->username = $username;
        return $this;
    }

    public function getPinHash(): ?string
    {
        return $this->pinHash;
    }

    public function setPinHash(?string $pinHash): self
    {
        $this->pinHash = $pinHash;
        return $this;
    }

    public function getRoleId(): ?int
    {
        return $this->roleId !== null ? (int) $this->roleId : null;
    }

    public function setRoleId(?int $roleId): self
    {
        $this->roleId = $roleId;
        return $this;
    }

    public function isActive(): bool
    {
        return (bool) $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        if (!$isActive && $this->deactivatedAt === null) {
            $this->deactivatedAt = new DateTimeImmutable();
        }
        return $this;
    }

    public function getBranch(): Branch
    {
        return $this->branch;
    }

    public function setBranch(Branch $branch): self
    {
        $this->branch = $branch;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getDeactivatedAt(): ?DateTimeImmutable
    {
        return $this->deactivatedAt;
    }

    public function setDeactivatedAt(?DateTimeImmutable $deactivatedAt): self
    {
        $this->deactivatedAt = $deactivatedAt;
        return $this;
    }
}