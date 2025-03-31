// /noona/containerPresets.mjs

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '/noona/family/noona-warden/settings/config.env' });

// The family mount base where host folders reside
const FAMILY_MOUNT_BASE = '/noona/family';

// 🔐 Load the private JWT key from the Noona-Warden key folder
const jwtPrivateKeyPath = '/noona/family/noona-warden/files/keys/private.pem';
let jwtPrivateKey = '';

if (fs.existsSync(jwtPrivateKeyPath)) {
    jwtPrivateKey = fs.readFileSync(jwtPrivateKeyPath, 'utf-8');
    console.log('✅ Loaded JWT private key from:', jwtPrivateKeyPath);
} else {
    console.warn('⚠️ Private key file not found at:', jwtPrivateKeyPath);
}

export const containerPresets = {
    // ───── Redis ─────
    'noona-redis': {
        Image: 'redis:8.0-M04-alpine',
        name: 'noona-redis',
        ExposedPorts: { '6379/tcp': {} },
        Volumes: {
            '/data': {} // use Docker-managed volume for persistence
        },
        HostConfig: {
            PortBindings: {
                '6379/tcp': [{ HostPort: process.env.REDIS_PORT || '6379' }]
            },
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: {
                'bridge': {},
                'noona-network': {}
            }
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
            // Use dedicated init variables if available; otherwise fall back to MONGO_USER/MONGO_PASSWORD/MONGO_DATABASE.
            `MONGO_INITDB_ROOT_USERNAME=${process.env.MONGO_INITDB_ROOT_USERNAME || process.env.MONGO_USER}`,
            `MONGO_INITDB_ROOT_PASSWORD=${process.env.MONGO_INITDB_ROOT_PASSWORD || process.env.MONGO_PASSWORD}`,
            `MONGO_INITDB_DATABASE=${process.env.MONGO_INITDB_DATABASE || process.env.MONGO_DATABASE}`
            // The official Mongo image auto-creates the root user and database on first run.
        ],
        Volumes: {
            '/data/db': {} // Docker volume for MongoDB data
        },
        HostConfig: {
            PortBindings: {
                '27017/tcp': [{ HostPort: process.env.MONGODB_PORT || '27017' }]
            },
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: {
                'bridge': {},
                'noona-network': {}
            }
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
        Volumes: {
            '/var/lib/mysql': {} // Docker volume for MariaDB data
        },
        HostConfig: {
            PortBindings: {
                '3306/tcp': [{ HostPort: process.env.MARIADB_PORT || '3306' }]
            },
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: {
                'bridge': {},
                'noona-network': {}
            }
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
            `MONGO_URL=${process.env.MONGO_URL}`, // Full URL with credentials from config.env
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
        // Use a bind mount from the family folder for Vault data
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
            Test: ['CMD-SHELL', 'pgrep -f initmain.mjs || exit 1'],
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
            `KAVITA_URL=${process.env.KAVITA_URL}`,
            `KAVITA_API_KEY=${process.env.KAVITA_API_KEY}`,
            `KAVITA_LIBRARY_IDS=${process.env.KAVITA_LIBRARY_IDS}`,
            `DISCORD_TOKEN=${process.env.DISCORD_TOKEN}`,
            `DISCORD_CLIENT_ID=${process.env.DISCORD_CLIENT_ID}`,
            `REQUIRED_GUILD_ID=${process.env.REQUIRED_GUILD_ID}`,
            `REQUIRED_ROLE_ADMIN=${process.env.REQUIRED_ROLE_ADMIN}`,
            `REQUIRED_ROLE_MOD=${process.env.REQUIRED_ROLE_MOD}`,
            `REQUIRED_ROLE_USER=${process.env.REQUIRED_ROLE_USER}`,
            `NOTIFICATION_CHANNEL_ID=${process.env.NOTIFICATION_CHANNEL_ID}`,
            `CHECK_INTERVAL_HOURS=${process.env.CHECK_INTERVAL_HOURS}`,
            `KAVITA_LOOKBACK_HOURS=${process.env.KAVITA_LOOKBACK_HOURS}`,
            `VAULT_URL=${process.env.VAULT_URL}`,
            `VAULT_JWT=${process.env.VAULT_JWT}`,
            `REDIS_URL=${process.env.REDIS_URL}`,
            `JWT_PRIVATE_KEY=${jwtPrivateKey}`,
            `PROJECT_NAME=${process.env.PROJECT_NAME || 'The Noona Project'}`,
            `NODE_ENV=${process.env.NODE_ENV}`,
            `PORTAL_PORT=${process.env.PORTAL_PORT}`
        ],
        ExposedPorts: {
            [`${process.env.PORTAL_PORT}/tcp`]: {}
        },
        HostConfig: {
            PortBindings: {
                [`${process.env.PORTAL_PORT}/tcp`]: [{ HostPort: process.env.PORTAL_PORT }]
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
