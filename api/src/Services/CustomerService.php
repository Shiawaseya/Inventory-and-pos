<?php

namespace App\Services;

use App\Database\DatabaseManager;
use App\Entities\Address;
use App\Entities\Customer;
use Doctrine\ORM\EntityManager;

class CustomerService
{
    private EntityManager $entityManager;
    private \App\Repositories\CustomerRepository $repository;

    public function __construct(?EntityManager $entityManager = null)
    {
        $this->entityManager = $entityManager ?? DatabaseManager::getEntityManager();
        $this->repository = $this->entityManager->getRepository(Customer::class);
    }

    /** @return Customer[] */
    public function getPaginated(int $page, int $perPage, array $filters = []): array
    {
        return $this->repository->findPaginated($page, $perPage, $filters);
    }

    public function countPaginated(array $filters = []): int
    {
        return $this->repository->countPaginated($filters);
    }

    public function create(array $data): Customer
    {
        return $this->entityManager->wrapInTransaction(function () use ($data) {
            $customer = new Customer();
            $addressData = is_array($data['address'] ?? null) ? $data['address'] : $data;
            $address = new Address();
            $addressSetters = [
                'street_address' => 'setStreetAddress',
                'barangay' => 'setBarangay',
                'city_municipality' => 'setCityMunicipality',
                'province' => 'setProvince',
                'region' => 'setRegion',
                'postal_code' => 'setPostalCode',
                'psgc_code' => 'setPsgcCode',
            ];
            $hasAddress = false;
            foreach ($addressSetters as $field => $setter) {
                if (array_key_exists($field, $addressData)) {
                    $value = $addressData[$field] === null ? null : trim((string) $addressData[$field]);
                    $address->{$setter}($value);
                    $hasAddress = $hasAddress || ($value !== null && $value !== '');
                }
            }
            if ($hasAddress) {
                $customer->setAddress($address);
            }

            $setters = [
                'first_name' => 'setFirstName',
                'middle_name' => 'setMiddleName',
                'last_name' => 'setLastName',
                'contact_number' => 'setContactNumber',
                'email_address' => 'setEmailAddress',
                'tin' => 'setTin',
                'business_style' => 'setBusinessStyle',
            ];

            foreach ($setters as $field => $setter) {
                if (array_key_exists($field, $data)) {
                    $customer->{$setter}($data[$field] === null ? null : trim((string) $data[$field]));
                }
            }

            $this->entityManager->persist($customer);
            $this->entityManager->flush();

            (new AuditLogService($this->entityManager))->record([
                'action' => 'CREATE',
                'module' => 'customers',
                'employee_id' => $data['employee_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'record_id' => (string) $customer->getId(),
                'old_values' => null,
                'new_values' => [
                    'first_name' => $customer->getFirstName(),
                    'middle_name' => $customer->getMiddleName(),
                    'last_name' => $customer->getLastName(),
                    'contact_number' => $customer->getContactNumber(),
                    'email_address' => $customer->getEmailAddress(),
                    'tin' => $customer->getTin(),
                    'business_style' => $customer->getBusinessStyle(),
                    'address_id' => $customer->getAddress()?->getId(),
                ],
                'ip_address' => $data['_audit']['ip_address'] ?? null,
                'user_agent' => $data['_audit']['user_agent'] ?? null,
            ]);

            return $customer;
        });
    }
}