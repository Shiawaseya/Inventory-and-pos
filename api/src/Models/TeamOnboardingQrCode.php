<?php

namespace App\Models;

use PDO;
use PDOException;
use App\Models\Role;

class TeamOnboardingQrCode extends BaseModel
{

	public function findById($qrcodeId): ?array
	{
		$stmt = $this->pdo->prepare(
		    'SELECT qrcode_id, code, status, expires_at, used_at, referred_by, role_id, branch_id,
			    team_onboarding_id, created_by_employee_id, created_at
		     FROM team_onboarding_qr_codes
		     WHERE qrcode_id = :qrcode_id
		     LIMIT 1'
		);
		$stmt->execute([':qrcode_id' => $qrcodeId]);

		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		return $row ? $this->mapRow($row) : null;
	}

	public function findByCode(string $code): ?array
	{
		$stmt = $this->pdo->prepare(
		    'SELECT qrcode_id, code, status, expires_at, used_at, referred_by, role_id, branch_id,
			    team_onboarding_id, created_by_employee_id, created_at
		     FROM team_onboarding_qr_codes
		     WHERE code = :code
		     LIMIT 1'
		);
		$stmt->execute([':code' => trim($code)]);

		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		return $row ? $this->mapRow($row) : null;
	}

	public function findByTeamOnboardingId($teamOnboardingId): ?array
	{
		$stmt = $this->pdo->prepare(
		    'SELECT qrcode_id, code, status, expires_at, used_at, referred_by, role_id, branch_id,
			    team_onboarding_id, created_by_employee_id, created_at
		     FROM team_onboarding_qr_codes
		     WHERE team_onboarding_id = :team_onboarding_id
		     LIMIT 1'
		);
		$stmt->execute([':team_onboarding_id' => $teamOnboardingId]);

		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		return $row ? $this->mapRow($row) : null;
	}

	public function listByBranch($branchId): array
	{
		$stmt = $this->pdo->prepare(
		    'SELECT qrcode_id, code, status, expires_at, used_at, referred_by, role_id, branch_id,
			    team_onboarding_id, created_by_employee_id, created_at
		     FROM team_onboarding_qr_codes
		     WHERE branch_id = :branch_id
		     ORDER BY created_at DESC'
		);
		$stmt->execute([':branch_id' => (int)$branchId]);

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		return array_map([$this, 'mapRow'], $rows);
	}

	public function listAll(): array
	{
		$stmt = $this->pdo->query(
		    'SELECT qrcode_id, code, status, expires_at, used_at, referred_by, role_id, branch_id,
			    team_onboarding_id, created_by_employee_id, created_at
		     FROM team_onboarding_qr_codes
		     ORDER BY created_at DESC'
		);

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		return array_map([$this, 'mapRow'], $rows);
	}

	public function listByStatus(string $status): array
	{
		$stmt = $this->pdo->prepare(
		    'SELECT qrcode_id, code, status, expires_at, used_at, referred_by, role_id, branch_id,
			    team_onboarding_id, created_by_employee_id, created_at
		     FROM team_onboarding_qr_codes
		     WHERE status = :status
		     ORDER BY created_at DESC'
		);
		$stmt->execute([':status' => $status]);

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		return array_map([$this, 'mapRow'], $rows);
	}

	public function create(array $data): array
	{
		$code = isset($data['code']) && trim((string)$data['code']) !== ''
			? trim((string)$data['code'])
			: $this->generateUniqueCode();

		if (!isset($data['branch_id']) || $data['branch_id'] === '') {
			throw new \InvalidArgumentException('branch_id is required');
		}

		$stmt = $this->pdo->prepare(
			'INSERT INTO team_onboarding_qr_codes
				(code, status, expires_at, used_at, referred_by, role_id, branch_id, team_onboarding_id, created_by_employee_id)
			 VALUES
				(:code, :status, :expires_at, :used_at, :referred_by, :role_id, :branch_id, :team_onboarding_id, :created_by_employee_id)'
		);
		$stmt->execute([
			':code' => $code,
			':status' => isset($data['status']) && trim((string)$data['status']) !== '' ? trim((string)$data['status']) : 'active',
			':expires_at' => $this->normalizeDatetime($data['expires_at'] ?? null),
			':used_at' => $this->normalizeDatetime($data['used_at'] ?? null),
			':referred_by' => isset($data['referred_by']) && trim((string)$data['referred_by']) !== ''
				? trim((string)$data['referred_by'])
				: null,
			':role_id' => isset($data['role_id']) ? (int)$data['role_id'] : null,
			':branch_id' => (int)$data['branch_id'],
			':team_onboarding_id' => isset($data['team_onboarding_id']) && $data['team_onboarding_id'] !== ''
				? (int)$data['team_onboarding_id']
				: null,
			':created_by_employee_id' => isset($data['created_by_employee_id']) && $data['created_by_employee_id'] !== ''
				? (int)$data['created_by_employee_id']
				: null,
		]);

		return $this->findById((int)$this->pdo->lastInsertId());
	}

	public function markUsed($qrcodeId, $teamOnboardingId): bool
	{
		$stmt = $this->pdo->prepare(
			'UPDATE team_onboarding_qr_codes
			 SET status = :status, used_at = NOW(), team_onboarding_id = :team_onboarding_id
			 WHERE qrcode_id = :qrcode_id'
		);

		$stmt->execute([
			':status' => 'used',
			':team_onboarding_id' => $teamOnboardingId,
			':qrcode_id' => $qrcodeId,
		]);

		return $stmt->rowCount() > 0;
	}

	public function markExpired($qrcodeId): bool
	{
		$stmt = $this->pdo->prepare(
			'UPDATE team_onboarding_qr_codes
			 SET status = :status
			 WHERE qrcode_id = :qrcode_id'
		);

		$stmt->execute([
			':status' => 'expired',
			':qrcode_id' => $qrcodeId,
		]);

		return $stmt->rowCount() > 0;
	}

	public function revoke($qrcodeId): bool
	{
		$stmt = $this->pdo->prepare(
			'UPDATE team_onboarding_qr_codes
			 SET status = :status
			 WHERE qrcode_id = :qrcode_id'
		);

		$stmt->execute([
			':status' => 'revoked',
			':qrcode_id' => $qrcodeId,
		]);

		return $stmt->rowCount() > 0;
	}

	public function delete($qrcodeId): bool
	{
		$stmt = $this->pdo->prepare('DELETE FROM team_onboarding_qr_codes WHERE qrcode_id = :qrcode_id');
		$stmt->execute([':qrcode_id' => $qrcodeId]);

		return $stmt->rowCount() > 0;
	}

	public function codeExists(string $code): bool
	{
		$stmt = $this->pdo->prepare('SELECT COUNT(*) FROM team_onboarding_qr_codes WHERE code = :code');
		$stmt->execute([':code' => trim($code)]);

		return (int)$stmt->fetchColumn() > 0;
	}

	public function generateUniqueCode(): string
	{
		do {
			$candidate = strtoupper(bin2hex(random_bytes(6)));
		} while ($this->codeExists($candidate));

		return $candidate;
	}


	private function normalizeDatetime($value)
	{
		if ($value === null || $value === '') {
			return null;
		}

		$timestamp = strtotime((string)$value);
		if ($timestamp === false) {
			return null;
		}

		return date('Y-m-d H:i:s', $timestamp);
	}

	private function mapRow(array $row): array
	{
		// resolve role key from role_id when present
		$roleKey = null;
		if (!empty($row['role_id'])) {
			try {
				$roleModel = new Role($this->pdo);
				$r = $roleModel->findById((int)$row['role_id']);
				$roleKey = $r ? $r['role_key'] : null;
			} catch (\Throwable $e) {
				$roleKey = null;
			}
		}

		return [
			'qrcode_id' => (int)$row['qrcode_id'],
			'code' => $row['code'],
			'status' => $row['status'],
			'expires_at' => $row['expires_at'],
			'used_at' => $row['used_at'],
			'referred_by' => $row['referred_by'],
			'role' => $roleKey,
			'role_id' => isset($row['role_id']) ? (int)$row['role_id'] : null,
			'branch_id' => (int)$row['branch_id'],
			'team_onboarding_id' => $row['team_onboarding_id'] !== null ? (int)$row['team_onboarding_id'] : null,
			'created_by_employee_id' => $row['created_by_employee_id'] !== null ? (int)$row['created_by_employee_id'] : null,
			'created_at' => $row['created_at'],
		];
	}
}
