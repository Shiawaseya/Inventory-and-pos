<?php

namespace App\Database;

use App\Models\BaseModel;
use Doctrine\DBAL\DriverManager;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\ORMSetup;
use PDO;

class DatabaseManager
{
    private static ?PDO $pdo = null;
    private static ?EntityManager $entityManager = null;

    /**
     * Get or create the shared singleton PDO instance.
     */
    public static function getPdo(): PDO
    {
        if (self::$pdo === null) {
            self::$pdo = BaseModel::createConnection();
        }

        return self::$pdo;
    }

    /**
     * Get or create the Doctrine EntityManager reusing the existing PDO connection.
     */
    public static function getEntityManager(): EntityManager
    {
        if (self::$entityManager === null) {
            $config = ORMSetup::createAttributeMetadataConfiguration(
                paths: [__DIR__ . '/../Entities'],
                isDevMode: true
            );

            $connection = DriverManager::getConnection([
                'driver' => 'pdo_mysql',
                'host' => DB_HOST,
                'port' => DB_PORT,
                'dbname' => DB_NAME,
                'user' => DB_USER,
                'password' => DB_PASSWORD,
                'charset' => 'utf8mb4',
                'driverOptions' => [
                    PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
                ],
            ], $config);

            self::$entityManager = new EntityManager($connection, $config);
        }

        return self::$entityManager;
    }
}
