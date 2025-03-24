// docker/healthChecker.mjs

import Docker from 'dockerode';
import {
    printResult,
    printSection,
    printError,
    printNote,
    printStep
} from '../noona/logger/logUtils.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Waits for a Docker container to report healthy based on its healthcheck.
 *
 * @param {string} containerName - Name of the container to monitor.
 * @param {number} timeoutMs - Maximum time to wait for a healthy state (default: 180000ms = 3min).
 * @throws {Error} If the container does not become healthy in time.
 */
export const waitForContainerHealth = async (containerName, timeoutMs = 180000) => {
    printSection(`🩺 Waiting for container to become healthy: ${containerName}`);

    const start = Date.now();
    const pollInterval = 5000;
    const logInterval = 30000;
    let lastLogTime = 0;

    const container = docker.getContainer(containerName);

    while (Date.now() - start < timeoutMs) {
        try {
            const data = await container.inspect();
            const health = data?.State?.Health?.Status;

            if (health === 'healthy') {
                printResult(`✔ ${containerName} is healthy`);
                return;
            }

            const now = Date.now();
            if (now - lastLogTime >= logInterval) {
                printNote(`⌛ Still waiting on ${containerName}... Status: ${health || 'unknown'}`);
                lastLogTime = now;
            }
        } catch (err) {
            printError(`❌ Failed to inspect ${containerName}: ${err.message}`);
        }

        await new Promise(res => setTimeout(res, pollInterval));
    }

    printError(`⏱️ Timeout: ${containerName} did not become healthy within ${timeoutMs / 1000}s`);
    throw new Error(`Timeout waiting for healthy container: ${containerName}`);
};
