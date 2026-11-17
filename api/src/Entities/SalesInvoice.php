<?php

namespace App\Entities;

use App\Enums\SalesInvoiceStatus;
use App\Repositories\SalesInvoiceRepository;
use DateTime;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SalesInvoiceRepository::class)]
#[ORM\Table(name: 'sales_invoice')]
#[ORM\Index(name: 'idx_branch', columns: ['branch_id'])]
#[ORM\Index(name: 'idx_date_branch', columns: ['date_of_purchase', 'branch_id'])]
#[ORM\Index(name: 'idx_created_at', columns: ['created_at'])]
#[ORM\Index(name: 'idx_employee', columns: ['employee_id'])]
#[ORM\Index(name: 'customer_id', columns: ['customer_id'])]
#[ORM\Index(name: 'fk_sales_invoice_authorizer', columns: ['authorized_by_employee_id'])]
#[ORM\Index(name: 'idx_branch_status', columns: ['branch_id', 'status'])]
#[ORM\UniqueConstraint(name: 'sales_invoice_number', columns: ['sales_invoice_number'])]
#[ORM\HasLifecycleCallbacks]
class SalesInvoice
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'sales_invoice_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'sales_invoice_number', type: Types::STRING, length: 50, unique: true, nullable: true)]
    private ?string $invoiceNumber = null;

    #[ORM\Column(name: 'date_of_purchase', type: Types::DATE_MUTABLE, nullable: true)]
    private ?DateTime $dateOfPurchase = null;

    #[ORM\Column(name: 'total_amount', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $totalAmount = null;

    #[ORM\Column(name: 'payment_method', type: Types::STRING, length: 255, nullable: true)]
    private ?string $paymentMethod = null;

    #[ORM\ManyToOne(targetEntity: Customer::class)]
    #[ORM\JoinColumn(name: 'customer_id', referencedColumnName: 'customer_id', nullable: true, onDelete: 'SET NULL')]
    private ?Customer $customer = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'employee_id', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $employee = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'authorized_by_employee_id', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $authorizedBy = null;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: false, onDelete: 'RESTRICT')]
    private Branch $branch;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'authorized_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $authorizedAt = null;

    #[ORM\Column(name: 'voided_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $voidedAt = null;

    #[ORM\Column(name: 'status', type: Types::STRING, enumType: SalesInvoiceStatus::class, options: ['default' => 'completed'])]
    private SalesInvoiceStatus $status;

    #[ORM\Column(name: 'reference_note', type: Types::STRING, length: 100, nullable: true)]
    private ?string $referenceNote = null;

    #[ORM\OneToMany(mappedBy: 'salesInvoice', targetEntity: SalesDetail::class)]
    private Collection $details;

    #[ORM\OneToOne(mappedBy: 'salesInvoice', targetEntity: SalesSettlement::class, cascade: ['persist', 'remove'])]
    private ?SalesSettlement $settlement = null;

    #[ORM\OneToOne(mappedBy: 'salesInvoice', targetEntity: InvoiceFinancing::class, cascade: ['persist', 'remove'])]
    private ?InvoiceFinancing $financing = null;

    public function __construct(Branch $branch)
    {
        $this->branch = $branch;
        $this->status = SalesInvoiceStatus::COMPLETED;
        $this->createdAt = new DateTimeImmutable();
        $this->details = new ArrayCollection();
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

    public function getInvoiceNumber(): ?string
    {
        return $this->invoiceNumber;
    }

    public function setInvoiceNumber(?string $invoiceNumber): self
    {
        $this->invoiceNumber = $invoiceNumber;
        return $this;
    }

    public function getDateOfPurchase(): ?DateTime
    {
        return $this->dateOfPurchase;
    }

    public function setDateOfPurchase(?DateTime $dateOfPurchase): self
    {
        $this->dateOfPurchase = $dateOfPurchase;
        return $this;
    }

    public function getTotalAmount(): ?float
    {
        return $this->totalAmount !== null ? (float) $this->totalAmount : null;
    }

    public function setTotalAmount(?float $totalAmount): self
    {
        $this->totalAmount = $totalAmount !== null ? number_format($totalAmount, 2, '.', '') : null;
        return $this;
    }

    public function getPaymentMethod(): ?string
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(?string $paymentMethod): self
    {
        $this->paymentMethod = $paymentMethod;
        return $this;
    }

    public function getCustomer(): ?Customer
    {
        return $this->customer;
    }

    public function setCustomer(?Customer $customer): self
    {
        $this->customer = $customer;
        return $this;
    }

    public function getEmployee(): ?Employee
    {
        return $this->employee;
    }

    public function setEmployee(?Employee $employee): self
    {
        $this->employee = $employee;
        return $this;
    }

    public function getAuthorizedBy(): ?Employee
    {
        return $this->authorizedBy;
    }

    public function setAuthorizedBy(?Employee $authorizedBy): self
    {
        $this->authorizedBy = $authorizedBy;
        return $this;
    }

    public function getAuthorizedAt(): ?DateTimeImmutable
    {
        return $this->authorizedAt;
    }

    public function setAuthorizedAt(?DateTimeImmutable $authorizedAt): self
    {
        $this->authorizedAt = $authorizedAt;
        return $this;
    }

    public function getStatus(): SalesInvoiceStatus
    {
        return $this->status;
    }

    public function setStatus(SalesInvoiceStatus $status): self
    {
        // Stamp the void time automatically so no caller can forget it.
        if ($status->value === 'voided' && $this->voidedAt === null) {
            $this->voidedAt = new DateTimeImmutable();
        }

        $this->status = $status;
        return $this;
    }

    public function getVoidedAt(): ?DateTimeImmutable
    {
        return $this->voidedAt;
    }

    public function setVoidedAt(?DateTimeImmutable $voidedAt): self
    {
        $this->voidedAt = $voidedAt;
        return $this;
    }

    public function getReferenceNote(): ?string
    {
        return $this->referenceNote;
    }

    public function setReferenceNote(?string $referenceNote): self
    {
        $this->referenceNote = $referenceNote;
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

    /**
     * @return Collection<int, SalesDetail>
     */
    public function getDetails(): Collection
    {
        return $this->details;
    }

    public function getSettlement(): ?SalesSettlement
    {
        return $this->settlement;
    }

    public function setSettlement(?SalesSettlement $settlement): self
    {
        if ($settlement !== null && $settlement->getSalesInvoice() !== $this) {
            $settlement->setSalesInvoice($this);
        }

        $this->settlement = $settlement;
        return $this;
    }

    public function getFinancing(): ?InvoiceFinancing
    {
        return $this->financing;
    }

    public function setFinancing(?InvoiceFinancing $financing): self
    {
        if ($financing !== null && $financing->getSalesInvoice() !== $this) {
            $financing->setSalesInvoice($this);
        }

        $this->financing = $financing;
        return $this;
    }
}