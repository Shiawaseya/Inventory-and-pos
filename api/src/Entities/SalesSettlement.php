<?php

namespace App\Entities;

use App\Repositories\SalesSettlementRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SalesSettlementRepository::class)]
#[ORM\Table(name: 'sales_settlements')]
#[ORM\Index(name: 'idx_settlement_receiver', columns: ['received_by_employee_id'])]
#[ORM\Index(name: 'idx_settlement_remitted_at', columns: ['remitted_at'])]
#[ORM\UniqueConstraint(name: 'uq_settlement_invoice', columns: ['sales_invoice_id'])]
#[ORM\HasLifecycleCallbacks]
class SalesSettlement
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'settlement_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: SalesInvoice::class, inversedBy: 'settlement')]
    #[ORM\JoinColumn(name: 'sales_invoice_id', referencedColumnName: 'sales_invoice_id', nullable: false, onDelete: 'RESTRICT')]
    private SalesInvoice $salesInvoice;

    #[ORM\Column(name: 'driver_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $driverName = null;

    #[ORM\Column(name: 'amount_due', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amountDue;

    #[ORM\Column(name: 'amount_remitted', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $amountRemitted;

    #[ORM\Column(name: 'remitted_at', type: Types::DATETIME_IMMUTABLE, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private DateTimeImmutable $remittedAt;

    #[ORM\Column(name: 'conforme_received', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $conformeReceived = false;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'received_by_employee_id', referencedColumnName: 'employee_id', nullable: false, onDelete: 'RESTRICT')]
    private Employee $receivedBy;

    #[ORM\Column(name: 'remarks', type: Types::STRING, length: 255, nullable: true)]
    private ?string $remarks = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true, options: ['default' => 'CURRENT_TIMESTAMP'])]
    private ?DateTimeImmutable $createdAt = null;

    public function __construct(
        SalesInvoice $salesInvoice,
        float $amountDue,
        float $amountRemitted,
        Employee $receivedBy,
        ?string $driverName = null,
        bool $conformeReceived = false,
        ?string $remarks = null
    ) {
        $this->salesInvoice = $salesInvoice;
        $this->amountDue = number_format($amountDue, 2, '.', '');
        $this->amountRemitted = number_format($amountRemitted, 2, '.', '');
        $this->receivedBy = $receivedBy;
        $this->driverName = $driverName;
        $this->conformeReceived = $conformeReceived;
        $this->remarks = $remarks;
        $this->remittedAt = new DateTimeImmutable();
        $this->createdAt = new DateTimeImmutable();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if ($this->createdAt === null) {
            $this->createdAt = new DateTimeImmutable();
        }
        if (!isset($this->remittedAt)) {
            $this->remittedAt = new DateTimeImmutable();
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

    public function getDriverName(): ?string
    {
        return $this->driverName;
    }

    public function setDriverName(?string $driverName): self
    {
        $this->driverName = $driverName;
        return $this;
    }

    public function getAmountDue(): float
    {
        return (float) $this->amountDue;
    }

    public function setAmountDue(float $amountDue): self
    {
        $this->amountDue = number_format($amountDue, 2, '.', '');
        return $this;
    }

    public function getAmountRemitted(): float
    {
        return (float) $this->amountRemitted;
    }

    public function setAmountRemitted(float $amountRemitted): self
    {
        $this->amountRemitted = number_format($amountRemitted, 2, '.', '');
        return $this;
    }

    public function getRemittedAt(): DateTimeImmutable
    {
        return $this->remittedAt;
    }

    public function setRemittedAt(DateTimeImmutable $remittedAt): self
    {
        $this->remittedAt = $remittedAt;
        return $this;
    }

    public function isConformeReceived(): bool
    {
        return $this->conformeReceived;
    }

    public function setConformeReceived(bool $conformeReceived): self
    {
        $this->conformeReceived = $conformeReceived;
        return $this;
    }

    public function getReceivedBy(): Employee
    {
        return $this->receivedBy;
    }

    public function setReceivedBy(Employee $receivedBy): self
    {
        $this->receivedBy = $receivedBy;
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

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}