// docker/buildNetwork.mjs

import Docker from 'dockerode';
import {
    printResult,
    printError
} from '../noona/logger/logUtils.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Ensures a Docker network exists.
 * - Skips creation if network is "bridge"
 * - Uses bridge driver for custom networks
 *
 * @param {string} networkName - Name of the Docker network to ensure
 */
export const ensureNetworkExists = async (networkName) => {
    try {
        if (networkName === 'bridge') {
            return; // Do not try to create the default bridge network
        }

        const networks = await docker.listNetworks();
        const exists = networks.some(net => net.Name === networkName);

        if (!exists) {
            await docker.createNetwork({
                Name: networkName,
                Driver: 'bridge'
            });
            printResult(`Created Docker network: ${networkName}`);
        } else {
            printResult(`Docker network "${networkName}" already exists`);
        }
    } catch (err) {
        printError(`❌ Failed to ensure Docker network "${networkName}": ${err.message}`);
        throw err;
    }
};
