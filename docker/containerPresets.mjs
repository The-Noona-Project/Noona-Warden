// containerPresets.mjs

import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '/noona/family/noona-warden/settings/config.env' });

const FAMILY_MOUNT_BASE = '/noona/family';

// Load private JWT key inline if path exists
let jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
const jwtPrivateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
if (!jwtPrivateKey && jwtPrivateKeyPath && fs.existsSync(jwtPrivateKeyPath)) {
    jwtPrivateKey = fs.readFileSync(jwtPrivateKeyPath, 'utf-8');
}

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
            `MONGO_INITDB_DATABASE=${process.env.MONGO_DATABASE}`
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
            Test: [
                'CMD-SHELL',
                'mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} || exit 1'
            ],
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
            `JWT_PRIVATE_KEY=${jwtPrivateKey}`,
            `PROJECT_NAME=${process.env.PROJECT_NAME || 'The Noona Project'}`
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
    },

    // ───── Noona-Portal ─────
    'noona-portal': {
        Image: 'captainpax/noona-portal:latest',
        name: 'noona-portal',
        Env: [
            // 🌐 Kavita API
            `KAVITA_URL=${process.env.KAVITA_URL}`,
            `KAVITA_API_KEY=${process.env.KAVITA_API_KEY}`,
            `KAVITA_LIBRARY_IDS=${process.env.KAVITA_LIBRARY_IDS}`,

            // 🤖 Discord Bot
            `DISCORD_TOKEN=${process.env.DISCORD_TOKEN}`,
            `DISCORD_CLIENT_ID=${process.env.DISCORD_CLIENT_ID}`,
            `REQUIRED_GUILD_ID=${process.env.REQUIRED_GUILD_ID}`,

            // 🎭 Role Requirements
            `REQUIRED_ROLE_ADMIN=${process.env.REQUIRED_ROLE_ADMIN}`,
            `REQUIRED_ROLE_MOD=${process.env.REQUIRED_ROLE_MOD}`,
            `REQUIRED_ROLE_USER=${process.env.REQUIRED_ROLE_USER}`,

            // 🔔 Notifications
            `NOTIFICATION_CHANNEL_ID=${process.env.NOTIFICATION_CHANNEL_ID}`,
            `CHECK_INTERVAL_HOURS=${process.env.CHECK_INTERVAL_HOURS}`,
            `KAVITA_LOOKBACK_HOURS=${process.env.KAVITA_LOOKBACK_HOURS}`,

            // 🧠 Vault Integration
            `VAULT_URL=${process.env.VAULT_URL}`,
            `VAULT_JWT=${process.env.VAULT_JWT}`,

            // 🔑 Redis
            `REDIS_URL=redis://noona-redis:6379`,

            // 🧾 Optional Add-ons
            `JWT_PRIVATE_KEY=${process.env.PORTAL_JWT_SECRET || ''}`,
            `JWT_PUBLIC_KEY=${process.env.JWT_PUBLIC_KEY || ''}`,
            `PROJECT_NAME=${process.env.PROJECT_NAME || 'The Noona Project'}`,

            // General Node settings
            `NODE_ENV=${process.env.NODE_ENV}`,
            `PORTAL_PORT=${process.env.PORTAL_PORT}`
        ],
            ExposedPorts: {
            [`${process.env.PORTAL_PORT}/tcp`]: {}
        },
        HostConfig: {
            PortBindings: {
                [`${process.env.PORTAL_PORT}/tcp`]: [
                    { HostPort: process.env.PORTAL_PORT }
                ]
            },
            Binds: [
                `${FAMILY_MOUNT_BASE}/noona-portal/files:/app/files`
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
            Test: ['CMD-SHELL', 'pgrep -f initmain.mjs || exit 1'],
            Interval: 10e9,
            Timeout: 5e9,
            Retries: 5,
            StartPeriod: 15e9
        }
    }
};
