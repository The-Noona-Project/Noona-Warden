// docker/containerManager.mjs

import Docker from 'dockerode';
import {
    printResult,
    printError,
    printNote,
    printAction
} from '../noona/logger/logUtils.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Stops all running containers that start with 'noona-' except for 'noona-warden'.
 */
export const stopRunningNoonaContainers = async () => {
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
 * Starts a single Docker container by name.
 *
 * @param {string} containerName - The name of the container.
 * @param {Object} [envVars] - Optional environment variables (not supported without recreate).
 */
export const startContainer = async (containerName, envVars = {}) => {
    try {
        const container = docker.getContainer(containerName);
        const containerInfo = await container.inspect();

        if (!containerInfo) {
            throw new Error(`Container "${containerName}" not found`);
        }

        await container.start();
        printResult(`✔ Started container: ${containerName}`);
    } catch (err) {
        printError(`❌ Failed to start container "${containerName}": ${err.message}`);
        throw err;
    }
};
