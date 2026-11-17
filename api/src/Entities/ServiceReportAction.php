<?php

namespace App\Entities;

use App\Repositories\ServiceReportActionRepository;
use DateTime;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ServiceReportActionRepository::class)]
#[ORM\Table(name: 'service_report_actions')]
#[ORM\Index(name: 'idx_action_report', columns: ['service_report_id'])]
#[ORM\Index(name: 'idx_action_employee', columns: ['employee_id'])]
#[ORM\Index(name: 'idx_action_date', columns: ['action_date'])]
class ServiceReportAction
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'action_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ServiceReport::class, inversedBy: 'actions')]
    #[ORM\JoinColumn(name: 'service_report_id', referencedColumnName: 'service_report_id', nullable: false, onDelete: 'CASCADE')]
    private ServiceReport $serviceReport;

    #[ORM\Column(name: 'action_date', type: Types::DATE_MUTABLE)]
    private DateTime $actionDate;

    #[ORM\Column(name: 'action_taken', type: Types::TEXT)]
    private string $actionTaken;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'employee_id', referencedColumnName: 'employee_id', nullable: false, onDelete: 'RESTRICT')]
    private Employee $employee;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $createdAt;

    public function __construct(DateTime $actionDate, string $actionTaken, Employee $employee)
    {
        $this->actionDate = $actionDate;
        $this->actionTaken = $actionTaken;
        $this->employee = $employee;
        $this->createdAt = new DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getServiceReport(): ServiceReport { return $this->serviceReport; }
    public function setServiceReport(ServiceReport $serviceReport): self { $this->serviceReport = $serviceReport; return $this; }
    public function getActionDate(): DateTime { return $this->actionDate; }
    public function setActionDate(DateTime $actionDate): self { $this->actionDate = $actionDate; return $this; }
    public function getActionTaken(): string { return $this->actionTaken; }
    public function setActionTaken(string $actionTaken): self { $this->actionTaken = $actionTaken; return $this; }
    public function getEmployee(): Employee { return $this->employee; }
    public function setEmployee(Employee $employee): self { $this->employee = $employee; return $this; }
    public function getCreatedAt(): DateTimeImmutable { return $this->createdAt; }
}