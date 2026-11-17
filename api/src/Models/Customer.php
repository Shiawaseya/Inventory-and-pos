<?php

namespace App\Models;

use PDO;

class Customer extends BaseModel
{

    /**
     * Return customers for a given branch.
     *
     * @param int $branchId
     * @param int $limit
     * @param int $offset
     * @return array
     */
    public function getByBranch(int $branchId, int $limit = 100, int $offset = 0): array
    {
        $sql =
                        'SELECT DISTINCT c.customer_id, c.first_name, c.middle_name, c.last_name, c.contact_number,
                            c.email_address, a.street_address, a.barangay, a.city_municipality,
                            a.province, a.region, a.postal_code, a.psgc_code,
                            c.tin, c.business_style, c.created_at
             FROM customers c
             JOIN sales_invoice si ON si.customer_id = c.customer_id
             LEFT JOIN addresses a ON a.address_id = c.address_id
             WHERE si.branch_id = :branch_id
             ORDER BY c.customer_id ASC
             LIMIT :limit OFFSET :offset';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':branch_id', $branchId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO customers
                     (first_name, middle_name, last_name, contact_number, email_address,
                      address_id, tin, business_style)
             VALUES
                     (:first_name, :middle_name, :last_name, :contact_number, :email_address,
                      :address_id, :tin, :business_style)'
        );
        $addressStmt = $this->pdo->prepare(
            'INSERT INTO addresses
                (street_address, barangay, city_municipality, province, region, postal_code, psgc_code)
             VALUES
                (:street_address, :barangay, :city_municipality, :province, :region, :postal_code, :psgc_code)'
        );
        $addressStmt->execute([
            ':street_address' => $data['street_address'] ?? null,
            ':barangay' => $data['barangay'] ?? null,
            ':city_municipality' => $data['city_municipality'] ?? null,
            ':province' => $data['province'] ?? null,
            ':region' => $data['region'] ?? null,
            ':postal_code' => $data['postal_code'] ?? null,
            ':psgc_code' => $data['psgc_code'] ?? null,
        ]);
        $stmt->execute([
            ':first_name' => $data['first_name'] ?? null,
            ':middle_name' => $data['middle_name'] ?? null,
            ':last_name' => $data['last_name'] ?? null,
            ':contact_number' => $data['contact_number'] ?? null,
            ':email_address' => $data['email_address'] ?? null,
            ':address_id' => (int) $this->pdo->lastInsertId(),
            ':tin' => $data['tin'] ?? null,
            ':business_style' => $data['business_style'] ?? null,
        ]);

        $customerId = (int) $this->pdo->lastInsertId();
        $customerQuery = $this->pdo->prepare(
                    'SELECT customer_id, first_name, middle_name, last_name, contact_number,
                        email_address, address_id, tin, business_style, created_at,
                        a.street_address, a.barangay, a.city_municipality,
                        a.province, a.region, a.postal_code, a.psgc_code
             FROM customers c
             LEFT JOIN addresses a ON a.address_id = c.address_id
             WHERE c.customer_id = :customer_id'
        );
        $customerQuery->execute([':customer_id' => $customerId]);

        return $customerQuery->fetch(PDO::FETCH_ASSOC) ?: [];
    }

}
