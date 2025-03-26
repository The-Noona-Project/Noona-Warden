// containerManager.mjs

import dotenv from 'dotenv';
dotenv.config({ path: '/noona/family/noona-warden/settings/config.env' });

import Docker from 'dockerode';
import {
    printResult,
    printError,
    printNote,
    printAction,
    printDivider
} from '../noona/logger/logUtils.mjs';

import { createOrStartContainer } from './createOrStartContainer.mjs';
import { waitForContainerHealth } from './healthChecker.mjs';

// Core service dependencies for Vault and Portal
const DEPEND_CONTAINERS = [
    'noona-redis',
    'noona-mongodb',
    'noona-mariadb'
];

/**
 * Stops all running containers that start with 'noona-' except for 'noona-warden'.
 */
export const stopRunningNoonaContainers = async () => {
    const Docker = (await import('dockerode')).default;
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });

    try {
        const containers = await docker.listContainers({ all: true });
        const allNames = containers.map(c => c.Names[0]);
        printNote(`🧪 All containers: ${JSON.stringify(allNames)}`);

        const targets = containers.filter((c) => {
            const name = c.Names[0]?.replace(/^\//, '');
            return name.startsWith('noona-') && name !== 'noona-warden' && c.State === 'running';
        });

        printNote(`🔍 Found ${targets.length} Noona container(s) to stop...`);

        if (targets.length === 0) {
            printResult('✔ No running Noona containers found');
            return;
        }

        for (const containerInfo of targets) {
            const containerName = containerInfo.Names[0]?.replace(/^\//, '');
            try {
                printAction(`Stopping container: ${containerName}`);
                const container = docker.getContainer(containerInfo.Id);
                await container.stop();
                printResult(`✔ Stopped container: ${containerName}`);
            } catch (err) {
                printError(`❌ Failed to stop ${containerName}: ${err.message}`);
            }
        }
    } catch (err) {
        printError('❌ Error during container stop phase: ' + err.message);
        throw err;
    }
};

/**
 * Boots all required dependency containers and waits for them to become healthy.
 */
export const startDependencies = async () => {
    printDivider();
    printAction('🚦 Starting Dependency Containers');

    for (const name of DEPEND_CONTAINERS) {
        await createOrStartContainer(name);
    }

    printDivider();
    printAction('⏳ Waiting for Dependencies to become Healthy');

    for (const name of DEPEND_CONTAINERS) {
        await waitForContainerHealth(name);
    }

    printResult('✔ All dependencies are up and healthy');
    printDivider();
};

/**
 * Starts a single container by name and waits for it to become healthy.
 */
export const startContainer = async (containerName) => {
    await createOrStartContainer(containerName);
    await waitForContainerHealth(containerName);
};
