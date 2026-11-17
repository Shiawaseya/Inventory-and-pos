<?php

namespace App\Entities;

use App\Repositories\AuditLogRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AuditLogRepository::class)]
#[ORM\Table(name: 'audit_logs')]
#[ORM\Index(name: 'idx_employee', columns: ['employee_id'])]
#[ORM\Index(name: 'idx_branch', columns: ['branch_id'])]
#[ORM\Index(name: 'idx_module_action', columns: ['module', 'action'])]
#[ORM\Index(name: 'idx_created_at', columns: ['created_at'])]
class AuditLog
{
    public const ACTIONS = [
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'STOCK_IN',
        'STOCK_OUT',
        'SALE',
        'PRICE_CHANGE',
        'STOCK_ADJUSTMENT',
        'ONBOARDING',
        'AUTHORIZE',
        'RESUME',
        'VOID',
        'VERIFY',
        'REJECT',
    ];

    public const MODULES = [
        'inventory',
        'items',
        'item_variants',
        'branch_item',
        'stock_unit',
        'stock_adjustments',
        'sales',
        'customers',
        'employees',
        'team_onboarding',
        'brands',
        'categories',
        'addresses',
        'attribute_options',
        'attribute_units',
        'item_attributes',
        'item_variant_specifications',
        'sales_details',
        'service_reports',
        'service_report_actions',
        'supervisors',
        'team_onboarding_qr_codes',
        'employee_account_verifications',
        'roles',
        'branches',
        'inventory_clerk',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'audit_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'employee_id', referencedColumnName: 'employee_id', nullable: true, onDelete: 'SET NULL')]
    private ?Employee $employee = null;

    #[ORM\Column(name: 'employee_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $employeeName = null;

    #[ORM\ManyToOne(targetEntity: Branch::class)]
    #[ORM\JoinColumn(name: 'branch_id', referencedColumnName: 'branch_id', nullable: true, onDelete: 'SET NULL')]
    private ?Branch $branch = null;

    #[ORM\Column(name: 'action', type: Types::STRING, length: 30)]
    private string $action;

    #[ORM\Column(name: 'module', type: Types::STRING, length: 50)]
    private string $module;

    #[ORM\Column(name: 'record_id', type: Types::STRING, length: 50, nullable: true)]
    private ?string $recordId = null;

    #[ORM\Column(name: 'old_values', type: Types::JSON, nullable: true)]
    private ?array $oldValues = null;

    #[ORM\Column(name: 'new_values', type: Types::JSON, nullable: true)]
    private ?array $newValues = null;

    #[ORM\Column(name: 'ip_address', type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(name: 'user_agent', type: Types::STRING, length: 255, nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $createdAt;

    public function __construct(string $action, string $module)
    {
        $action = strtoupper($action);
        $module = strtolower($module);

        if (!in_array($action, self::ACTIONS, true) || !in_array($module, self::MODULES, true)) {
            throw new \InvalidArgumentException("Invalid audit action ({$action}) or module ({$module})");
        }

        $this->action = $action;
        $this->module = $module;
        $this->createdAt = new DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id !== null ? (int) $this->id : null; }
    public function getEmployee(): ?Employee { return $this->employee; }
    public function getEmployeeName(): ?string { return $this->employeeName; }
    public function getBranch(): ?Branch { return $this->branch; }
    public function getAction(): string { return $this->action; }
    public function getModule(): string { return $this->module; }
    public function getRecordId(): ?string { return $this->recordId; }
    public function getOldValues(): ?array { return $this->oldValues; }
    public function getNewValues(): ?array { return $this->newValues; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function getCreatedAt(): DateTimeImmutable { return $this->createdAt; }

    public function setEmployee(?Employee $employee): self { $this->employee = $employee; return $this; }
    public function setEmployeeName(?string $employeeName): self { $this->employeeName = $employeeName; return $this; }
    public function setBranch(?Branch $branch): self { $this->branch = $branch; return $this; }
    public function setRecordId(?string $recordId): self { $this->recordId = $recordId; return $this; }
    public function setOldValues(?array $oldValues): self { $this->oldValues = $oldValues; return $this; }
    public function setNewValues(?array $newValues): self { $this->newValues = $newValues; return $this; }
    public function setIpAddress(?string $ipAddress): self { $this->ipAddress = $ipAddress; return $this; }
    public function setUserAgent(?string $userAgent): self { $this->userAgent = $userAgent; return $this; }
}