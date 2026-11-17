<?php

namespace App\Entities;

use App\Repositories\ServiceReportRepository;
use DateTime;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ServiceReportRepository::class)]
#[ORM\Table(name: 'service_reports')]
#[ORM\Index(name: 'idx_service_branch', columns: ['branch_id'])]
#[ORM\Index(name: 'idx_service_stock_unit', columns: ['stock_unit_id'])]
#[ORM\Index(name: 'idx_service_invoice', columns: ['sales_invoice_id'])]
#[ORM\Index(name: 'idx_service_address', columns: ['address_id'])]
#[ORM\Index(name: 'idx_service_prepared_by', columns: ['prepared_by_employee_id'])]
#[ORM\Index(name: 'idx_service_certified_by', columns: ['certified_by_employee_id'])]
#[ORM\UniqueConstraint(name: 'uq_service_control_number', columns: ['control_number'])]
#[ORM\HasLifecycleCallbacks]
class ServiceReport
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'service_report_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(name: 'control_number', type: Types::STRING, length: 50, unique: true)]
    private string $controlNumber;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: false, onDelete: 'RESTRICT')]
    private Branch $branch;

    #[ORM\ManyToOne(targetEntity: StockUnit::class)]
    #[ORM\JoinColumn(name: 'stock_unit_id', referencedColumnName: 'stock_unit_id', nullable: false, onDelete: 'RESTRICT')]
    private StockUnit $stockUnit;

    #[ORM\ManyToOne(targetEntity: SalesInvoice::class)]
    #[ORM\JoinColumn(name: 'sales_invoice_id', referencedColumnName: 'sales_invoice_id', nullable: false, onDelete: 'RESTRICT')]
    private SalesInvoice $salesInvoice;

    #[ORM\Column(name: 'contact_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $contactNumber = null;

    #[ORM\ManyToOne(targetEntity: Address::class)]
    #[ORM\JoinColumn(name: 'address_id', referencedColumnName: 'address_id', nullable: true, onDelete: 'SET NULL')]
    private ?Address $address = null;

    #[ORM\Column(name: 'complaint_description', type: Types::TEXT)]
    private string $complaintDescription;

    #[ORM\Column(name: 'reported_date', type: Types::DATE_MUTABLE)]
    private DateTime $reportedDate;

    #[ORM\Column(name: 'report_to', type: Types::STRING, length: 150, nullable: true)]
    private ?string $reportTo = null;

    #[ORM\Column(name: 'asc_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $ascName = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'prepared_by_employee_id', referencedColumnName: 'employee_id', nullable: false, onDelete: 'RESTRICT')]
    private Employee $preparedBy;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'certified_by_employee_id', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $certifiedBy = null;

    #[ORM\Column(name: 'certified_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?DateTimeImmutable $certifiedAt = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE)]
    private DateTime $updatedAt;

    /** @var Collection<int, ServiceReportAction> */
    #[ORM\OneToMany(targetEntity: ServiceReportAction::class, mappedBy: 'serviceReport', cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $actions;

    public function __construct(
        string $controlNumber,
        Branch $branch,
        StockUnit $stockUnit,
        SalesInvoice $salesInvoice,
        string $complaintDescription,
        DateTime $reportedDate,
        Employee $preparedBy
    ) {
        $this->controlNumber = $controlNumber;
        $this->branch = $branch;
        $this->stockUnit = $stockUnit;
        $this->salesInvoice = $salesInvoice;
        $this->complaintDescription = $complaintDescription;
        $this->reportedDate = $reportedDate;
        $this->preparedBy = $preparedBy;
        $this->createdAt = new DateTimeImmutable();
        $this->updatedAt = new DateTime();
        $this->actions = new ArrayCollection();
    }

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function updateTimestamps(): void
    {
        if (!isset($this->createdAt)) {
            $this->createdAt = new DateTimeImmutable();
        }
        $this->updatedAt = new DateTime();
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getControlNumber(): string { return $this->controlNumber; }
    public function setControlNumber(string $controlNumber): self { $this->controlNumber = $controlNumber; return $this; }
    public function getBranch(): Branch { return $this->branch; }
    public function setBranch(Branch $branch): self { $this->branch = $branch; return $this; }
    public function getStockUnit(): StockUnit { return $this->stockUnit; }
    public function setStockUnit(StockUnit $stockUnit): self { $this->stockUnit = $stockUnit; return $this; }
    public function getSalesInvoice(): SalesInvoice { return $this->salesInvoice; }
    public function setSalesInvoice(SalesInvoice $salesInvoice): self { $this->salesInvoice = $salesInvoice; return $this; }
    public function getComplaintDescription(): string { return $this->complaintDescription; }
    public function setComplaintDescription(string $complaintDescription): self { $this->complaintDescription = $complaintDescription; return $this; }
    public function getReportedDate(): DateTime { return $this->reportedDate; }
    public function setReportedDate(DateTime $reportedDate): self { $this->reportedDate = $reportedDate; return $this; }
    public function getReportTo(): ?string { return $this->reportTo; }
    public function setReportTo(?string $reportTo): self { $this->reportTo = $reportTo; return $this; }
    public function getContactNumber(): ?string { return $this->contactNumber; }
    public function setContactNumber(?string $contactNumber): self { $this->contactNumber = $contactNumber; return $this; }
    public function getAddress(): ?Address { return $this->address; }
    public function setAddress(?Address $address): self { $this->address = $address; return $this; }
    public function getAscName(): ?string { return $this->ascName; }
    public function setAscName(?string $ascName): self { $this->ascName = $ascName; return $this; }
    public function getPreparedBy(): Employee { return $this->preparedBy; }
    public function setPreparedBy(Employee $preparedBy): self { $this->preparedBy = $preparedBy; return $this; }
    public function getCertifiedBy(): ?Employee { return $this->certifiedBy; }
    public function setCertifiedBy(?Employee $certifiedBy): self { $this->certifiedBy = $certifiedBy; return $this; }
    public function getCertifiedAt(): ?DateTimeImmutable { return $this->certifiedAt; }
    public function setCertifiedAt(?DateTimeImmutable $certifiedAt): self { $this->certifiedAt = $certifiedAt; return $this; }
    public function getCreatedAt(): DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): DateTime { return $this->updatedAt; }
    /** @return Collection<int, ServiceReportAction> */
    public function getActions(): Collection { return $this->actions; }
    public function addAction(ServiceReportAction $action): self { if (!$this->actions->contains($action)) { $this->actions->add($action); $action->setServiceReport($this); } return $this; }
    public function removeAction(ServiceReportAction $action): self { $this->actions->removeElement($action); return $this; }
}