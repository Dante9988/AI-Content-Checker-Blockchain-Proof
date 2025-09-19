import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class InitialSchema1758275170380 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        // Users table
        await queryRunner.createTable(
            new Table({
                name: "users",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        default: "uuid_generate_v4()",
                    },
                    {
                        name: "email",
                        type: "varchar",
                        isNullable: true,
                        isUnique: true,
                    },
                    {
                        name: "walletAddress",
                        type: "varchar",
                        isUnique: true,
                    },
                    {
                        name: "walletPrivateKey",
                        type: "varchar",
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "now()",
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "now()",
                    },
                    {
                        name: "lastLoginAt",
                        type: "timestamp",
                        isNullable: true,
                    },
                ],
            }),
            true
        );

        // API Keys table
        await queryRunner.createTable(
            new Table({
                name: "api_keys",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        default: "uuid_generate_v4()",
                    },
                    {
                        name: "key",
                        type: "varchar",
                        isUnique: true,
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        default: true,
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "now()",
                    },
                    {
                        name: "expiresAt",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "userId",
                        type: "uuid",
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["userId"],
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                ],
            }),
            true
        );

        // Request Logs table
        await queryRunner.createTable(
            new Table({
                name: "request_logs",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        default: "uuid_generate_v4()",
                    },
                    {
                        name: "method",
                        type: "varchar",
                    },
                    {
                        name: "path",
                        type: "varchar",
                    },
                    {
                        name: "ipAddress",
                        type: "varchar",
                        isNullable: true,
                    },
                    {
                        name: "headers",
                        type: "jsonb",
                        isNullable: true,
                    },
                    {
                        name: "body",
                        type: "jsonb",
                        isNullable: true,
                    },
                    {
                        name: "statusCode",
                        type: "int",
                        isNullable: true,
                    },
                    {
                        name: "responseTimeMs",
                        type: "int",
                        isNullable: true,
                    },
                    {
                        name: "timestamp",
                        type: "timestamp",
                        default: "now()",
                    },
                    {
                        name: "userId",
                        type: "uuid",
                        isNullable: true,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["userId"],
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        onDelete: "SET NULL",
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("request_logs");
        await queryRunner.dropTable("api_keys");
        await queryRunner.dropTable("users");
    }
}
