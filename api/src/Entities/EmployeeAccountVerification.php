<?php

namespace App\Entities;

use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'employee_account_verifications')]
class EmployeeAccountVerification
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(name: 'verification_id', type: Types::BIGINT, options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Employee::class)]
    #[ORM\JoinColumn(name: 'employee_id', referencedColumnName: 'employee_id', nullable: false, onDelete: 'CASCADE')]
    private Employee $employee;

    #[ORM\Column(name: 'action_type', type: Types::STRING, length: 30)]
    private string $actionType;

    #[ORM\Column(name: 'new_value', type: Types::STRING, length: 255, nullable: true)]
    private ?string $newValue = null;

    #[ORM\Column(name: 'otp_hash', type: Types::STRING, length: 64)]
    private string $otpHash;

    #[ORM\Column(name: 'attempts_left', type: Types::SMALLINT, options: ['unsigned' => true, 'default' => 3])]
    private int $attemptsLeft = 3;

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private DateTimeImmutable $createdAt;

    public function __construct(Employee $employee, string $actionType, string $otpHash, DateTimeImmutable $expiresAt)
    {
        $this->employee = $employee;
        $this->actionType = $actionType;
        $this->otpHash = $otpHash;
        $this->expiresAt = $expiresAt;
        $this->createdAt = new DateTimeImmutable();
    }
}
