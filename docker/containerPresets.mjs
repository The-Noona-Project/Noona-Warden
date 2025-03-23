// docker/containerPresets.mjs

/**
 * Preset Docker container definitions for Noona-Warden to manage.
 * These are used for both image pulling and container creation.
 */
export const containerPresets = {
    'noona-redis': {
        Image: 'redis:alpine',
        name: 'noona-redis',
        ExposedPorts: { '6379/tcp': {} },
        HostConfig: {
            PortBindings: {
                '6379/tcp': [{ HostPort: process.env.REDIS_PORT || '6379' }]
            },
            Binds: ['/noona/Noona-Vault/Redis:/data'],
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

    'noona-mongodb': {
        Image: 'mongo:latest',
        name: 'noona-mongodb',
        ExposedPorts: { '27017/tcp': {} },
        Env: [
            `MONGO_INITDB_ROOT_USERNAME=${process.env.MONGO_USER}`,
            `MONGO_INITDB_ROOT_PASSWORD=${process.env.MONGO_PASSWORD}`,
            `MONGO_INITDB_DATABASE=${process.env.MONGO_DATABASE}`
        ],
        HostConfig: {
            PortBindings: {
                '27017/tcp': [{ HostPort: '27017' }]
            },
            Binds: ['/noona/Noona-Vault/MongoDB:/data/db'],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: ['CMD-SHELL', 'echo "db.runCommand(\'ping\').ok" | mongosh localhost:27017/test --quiet'],
            Interval: 10e9,
            Timeout: 5e9,
            Retries: 5,
            StartPeriod: 30e9
        }
    },

    'noona-mariadb': {
        Image: 'mariadb:latest',
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
                '3306/tcp': [{ HostPort: '3306' }]
            },
            Binds: ['/noona/Noona-Vault/MariaDB:/var/lib/mysql'],
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

    'milvus-etcd': {
        Image: 'quay.io/coreos/etcd:v3.5.5',
        name: 'milvus-etcd',
        Cmd: [
            'etcd',
            '-advertise-client-urls=http://127.0.0.1:2379',
            '-listen-client-urls=http://0.0.0.0:2379',
            '--data-dir=/etcd'
        ],
        HostConfig: {
            Binds: ['/noona/Noona-Vault/Etcd:/etcd'],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: ['CMD', 'etcdctl', 'endpoint', 'health'],
            Interval: 30e9,
            Timeout: 20e9,
            Retries: 3
        }
    },

    'milvus-minio': {
        Image: 'minio/minio:RELEASE.2023-03-20T20-16-18Z',
        name: 'milvus-minio',
        Env: [
            'MINIO_ACCESS_KEY=minioadmin',
            'MINIO_SECRET_KEY=minioadmin'
        ],
        Cmd: ['minio', 'server', '/minio_data'],
        ExposedPorts: { '9000/tcp': {} },
        HostConfig: {
            PortBindings: {
                '9000/tcp': [{ HostPort: '9000' }]
            },
            Binds: ['/noona/Noona-Vault/Minio:/minio_data'],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live'],
            Interval: 30e9,
            Timeout: 20e9,
            Retries: 3
        }
    },

    'noona-milvus': {
        Image: 'milvusdb/milvus:v2.3.3',
        name: 'noona-milvus',
        Cmd: ['milvus', 'run', 'standalone'],
        Env: [
            'ETCD_ENDPOINTS=etcd:2379',
            'MINIO_ADDRESS=minio:9000'
        ],
        ExposedPorts: {
            '19530/tcp': {},
            '9091/tcp': {}
        },
        HostConfig: {
            PortBindings: {
                '19530/tcp': [{ HostPort: '19530' }],
                '9091/tcp': [{ HostPort: '9091' }]
            },
            Binds: ['/noona/Noona-Vault/Milvus:/var/lib/milvus'],
            RestartPolicy: { Name: 'unless-stopped' }
        },
        NetworkingConfig: {
            EndpointsConfig: { 'noona-network': {} }
        },
        Healthcheck: {
            Test: ['CMD', 'curl', '-f', 'http://localhost:9091/api/v1/health'],
            Interval: 30e9,
            Timeout: 20e9,
            Retries: 3
        }
    }
};
