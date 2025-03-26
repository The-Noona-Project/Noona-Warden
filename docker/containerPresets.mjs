// containerPresets.mjs

import dotenv from 'dotenv';
dotenv.config({ path: '/noona/family/noona-warden/settings/config.env' });

const FAMILY_MOUNT_BASE = '/noona/family';

export const containerPresets = {
    // ───── Redis ─────
    'noona-redis': {
        Image: 'redis:8.0-M04-alpine',
        name: 'noona-redis',
        ExposedPorts: { '6379/tcp': {} },
        HostConfig: {
            PortBindings: {
                '6379/tcp': [{ HostPort: process.env.REDIS_PORT || '6379' }]
            },
            Binds: [
                `${FAMILY_MOUNT_BASE}/noona-vault/depends/noona-redis/files:/data`
            ],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: ['CMD', 'redis-cli', 'ping'],
            Interval: 5e9,
            Timeout: 2e9,
            Retries: 3
        }
    },

    // ───── MongoDB ─────
    'noona-mongodb': {
        Image: 'mongo:8.0.6-noble',
        name: 'noona-mongodb',
        ExposedPorts: { '27017/tcp': {} },
        Env: [
            `MONGO_INITDB_ROOT_USERNAME=${process.env.MONGO_USER}`,
            `MONGO_INITDB_ROOT_PASSWORD=${process.env.MONGO_PASSWORD}`,
            `MONGO_INITDB_DATABASE=${process.env.MONGO_DATABASE}`,
            `MONGO_URL=${process.env.MONGO_URL}` // <-- included for services
        ],
        HostConfig: {
            PortBindings: {
                '27017/tcp': [{ HostPort: process.env.MONGODB_PORT || '27017' }]
            },
            Binds: [
                `${FAMILY_MOUNT_BASE}/noona-vault/depends/noona-mongodb/files:/data/db`
            ],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: [
                'CMD-SHELL',
                'echo "db.runCommand(\'ping\').ok" | mongosh localhost:27017/test --quiet'
            ],
            Interval: 10e9,
            Timeout: 5e9,
            Retries: 5,
            StartPeriod: 30e9
        }
    },

    // ───── MariaDB ─────
    'noona-mariadb': {
        Image: 'mariadb:11.8.1-ubi-rc',
        name: 'noona-mariadb',
        ExposedPorts: { '3306/tcp': {} },
        Env: [
            `MYSQL_ROOT_PASSWORD=${process.env.MARIADB_PASSWORD}`,
            `MYSQL_DATABASE=${process.env.MARIADB_DATABASE}`,
            `MYSQL_USER=${process.env.MARIADB_USER}`,
            `MYSQL_PASSWORD=${process.env.MARIADB_PASSWORD}`
        ],
        HostConfig: {
            PortBindings: {
                '3306/tcp': [{ HostPort: process.env.MARIADB_PORT || '3306' }]
            },
            Binds: [
                `${FAMILY_MOUNT_BASE}/noona-vault/depends/noona-mariadb/files:/var/lib/mysql`
            ],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: ['CMD', 'bash', '-c', 'mariadb-admin ping --silent'],
            Interval: 10e9,
            Timeout: 5e9,
            Retries: 5,
            StartPeriod: 60e9
        }
    },

    // ───── Noona-Vault ─────
    'noona-vault': {
        Image: 'captainpax/noona-vault:latest',
        name: 'noona-vault',
        Env: [
            `NODE_ENV=${process.env.NODE_ENV}`,
            `PORT=${process.env.VAULT_PORT}`,
            `MONGO_URL=${process.env.MONGO_URL}`,
            `REDIS_URL=${process.env.REDIS_URL}`,
            `MARIADB_USER=${process.env.MARIADB_USER}`,
            `MARIADB_PASSWORD=${process.env.MARIADB_PASSWORD}`,
            `MARIADB_DATABASE=${process.env.MARIADB_DATABASE}`,
            `MARIADB_HOST=noona-mariadb`,
            `MARIADB_PORT=${process.env.MARIADB_PORT || 3306}`,

            // 🔐 Inject only the private key
            `JWT_PRIVATE_KEY=${process.env.JWT_PRIVATE_KEY}`
        ],
        ExposedPorts: {
            [`${process.env.VAULT_PORT}/tcp`]: {}
        },
        HostConfig: {
            PortBindings: {
                [`${process.env.VAULT_PORT}/tcp`]: [
                    { HostPort: process.env.VAULT_PORT }
                ]
            },
            Binds: [
                `${FAMILY_MOUNT_BASE}/noona-vault/files:/app/files`
            ],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: {
                'bridge': {},
                'noona-network': {}
            }
        },
        Healthcheck: {
            Test: ['CMD', 'curl', '-f', `http://localhost:${process.env.VAULT_PORT || '3120'}/v1/system/health`],
            Interval: 10e9,
            Timeout: 5e9,
            Retries: 5,
            StartPeriod: 15e9
        }
    }

};
