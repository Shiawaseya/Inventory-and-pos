<?php

namespace App\Services;

use App\Models\TeamOnboarding;

class TeamOnboardingService
{
    private TeamOnboarding $teamOnboarding;
    private EmployeeService $employeeService;

    public function __construct(?TeamOnboarding $teamOnboarding = null, ?EmployeeService $employeeService = null)
    {
        $this->teamOnboarding = $teamOnboarding instanceof TeamOnboarding
            ? $teamOnboarding
            : new TeamOnboarding();
        $this->employeeService = $employeeService instanceof EmployeeService
            ? $employeeService
            : new EmployeeService();
    }

    public function listPending(): array
    {
        return $this->teamOnboarding->listPending();
    }

    public function getById(int $teamOnboardingId): array
    {
        $row = $this->teamOnboarding->findById($teamOnboardingId);
        if (!$row) {
            throw new \InvalidArgumentException('Team onboarding record not found');
        }

        return $row;
    }

    public function approve(int $teamOnboardingId, array $authUser): array
    {
        return $this->employeeService->create($teamOnboardingId, $authUser);
    }
}