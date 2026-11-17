<?php

namespace App\Entities;

use App\Enums\InvoiceFinancingStatus;
use App\Repositories\InvoiceFinancingRepository;
use DateTime;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InvoiceFinancingRepository::class)]
#[ORM\Table(name: 'invoice_financing')]
#[ORM\Index(name: 'idx_financing_recorder', columns: ['recorded_by_employee_id'])]
#[ORM\Index(name: 'idx_financing_status', columns: ['status'])]
#[ORM\UniqueConstraint(name: 'uq_financing_invoice', columns: ['sales_invoice_id'])]
#[ORM\UniqueConstraint(name: 'uq_financing_provider_loan', columns: ['provider', 'loan_account_number'])]
#[ORM\HasLifecycleCallbacks]
class InvoiceFinancing
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'financing_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: SalesInvoice::class, inversedBy: 'financing')]
    #[ORM\JoinColumn(name: 'sales_invoice_id', referencedColumnName: 'sales_invoice_id', nullable: false, onDelete: 'RESTRICT')]
    private SalesInvoice $salesInvoice;

    #[ORM\Column(name: 'provider', type: Types::STRING, length: 50, options: ['default' => 'Home Credit'])]
    private string $provider = 'Home Credit';

    #[ORM\Column(name: 'loan_account_number', type: Types::STRING, length: 20)]
    private string $loanAccountNumber;

    #[ORM\Column(name: 'delivery_advice_ref', type: Types::STRING, length: 100)]
    private string $deliveryAdviceRef;

    #[ORM\Column(name: 'financed_amount', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $financedAmount;

    #[ORM\Column(name: 'downpayment_amount', type: Types::DECIMAL, precision: 10, scale: 2, options: ['default' => '0.00'])]
    private string $downpaymentAmount = '0.00';

    #[ORM\Column(name: 'approved_date', type: Types::DATE_MUTABLE)]
    private DateTime $approvedDate;

    #[ORM\Column(name: 'status', type: Types::STRING, enumType: InvoiceFinancingStatus::class, options: ['default' => 'approved'])]
    private InvoiceFinancingStatus $status = InvoiceFinancingStatus::APPROVED;

    #[ORM\Column(name: 'cancelled_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $cancelledAt = null;

    #[ORM\Column(name: 'remarks', type: Types::STRING, length: 255, nullable: true)]
    private ?string $remarks = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'recorded_by_employee_id', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $recordedBy = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct(
        SalesInvoice $salesInvoice,
        string $loanAccountNumber,
        float $financedAmount,
        DateTime $approvedDate,
        float $downpaymentAmount = 0.00,
        string $provider = 'Home Credit',
        ?Employee $recordedBy = null,
        ?string $remarks = null,
        string $deliveryAdviceRef = ''
    ) {
        $this->salesInvoice = $salesInvoice;
        $this->loanAccountNumber = $loanAccountNumber;
        $this->deliveryAdviceRef = $deliveryAdviceRef;
        $this->financedAmount = number_format($financedAmount, 2, '.', '');
        $this->approvedDate = $approvedDate;
        $this->downpaymentAmount = number_format($downpaymentAmount, 2, '.', '');
        $this->provider = $provider;
        $this->recordedBy = $recordedBy;
        $this->remarks = $remarks;
        $this->status = InvoiceFinancingStatus::APPROVED;
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

    public function getSalesInvoice(): SalesInvoice
    {
        return $this->salesInvoice;
    }

    public function setSalesInvoice(SalesInvoice $salesInvoice): self
    {
        $this->salesInvoice = $salesInvoice;
        return $this;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function setProvider(string $provider): self
    {
        $this->provider = $provider;
        return $this;
    }

    public function getLoanAccountNumber(): string
    {
        return $this->loanAccountNumber;
    }

    public function setLoanAccountNumber(string $loanAccountNumber): self
    {
        $this->loanAccountNumber = $loanAccountNumber;
        return $this;
    }

    public function getDeliveryAdviceRef(): string
    {
        return $this->deliveryAdviceRef;
    }

    public function setDeliveryAdviceRef(string $deliveryAdviceRef): self
    {
        $this->deliveryAdviceRef = $deliveryAdviceRef;
        return $this;
    }

    public function getFinancedAmount(): float
    {
        return (float) $this->financedAmount;
    }

    public function setFinancedAmount(float $financedAmount): self
    {
        $this->financedAmount = number_format($financedAmount, 2, '.', '');
        return $this;
    }

    public function getDownpaymentAmount(): float
    {
        return (float) $this->downpaymentAmount;
    }

    public function setDownpaymentAmount(float $downpaymentAmount): self
    {
        $this->downpaymentAmount = number_format($downpaymentAmount, 2, '.', '');
        return $this;
    }

    public function getApprovedDate(): DateTime
    {
        return $this->approvedDate;
    }

    public function setApprovedDate(DateTime $approvedDate): self
    {
        $this->approvedDate = $approvedDate;
        return $this;
    }

    public function getStatus(): InvoiceFinancingStatus
    {
        return $this->status;
    }

    public function setStatus(InvoiceFinancingStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getCancelledAt(): ?DateTimeImmutable
    {
        return $this->cancelledAt;
    }

    public function setCancelledAt(?DateTimeImmutable $cancelledAt): self
    {
        $this->cancelledAt = $cancelledAt;
        return $this;
    }

    public function getRemarks(): ?string
    {
        return $this->remarks;
    }

    public function setRemarks(?string $remarks): self
    {
        $this->remarks = $remarks;
        return $this;
    }

    public function getRecordedBy(): ?Employee
    {
        return $this->recordedBy;
    }

    public function setRecordedBy(?Employee $recordedBy): self
    {
        $this->recordedBy = $recordedBy;
        return $this;
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}