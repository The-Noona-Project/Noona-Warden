import Docker from 'dockerode';
import { containerPresets } from './containerPresets.mjs';
import {
    printResult,
    printError,
    printSection,
    printProgressBar
} from '../noona/logger/logUtils.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Pulls a Docker image and prints a Noona-style visual loading bar.
 * Pulls one image at a time.
 * @param {string} image - Image name to pull
 */
async function pullImageWithNoonaBar(image) {
    return new Promise((resolve, reject) => {
        docker.pull(image, (err, stream) => {
            if (err) return reject(err);

            // ✅ Always show 0% at start
            printProgressBar(image, 0);

            docker.modem.followProgress(
                stream,
                () => {
                    printProgressBar(image, 100);
                    printResult(`Pulled: ${image}`);
                    resolve();
                },
                (event) => {
                    if (event.progressDetail && event.progressDetail.total && event.progressDetail.current) {
                        const { current, total } = event.progressDetail;
                        const percent = Math.floor((current / total) * 100);
                        printProgressBar(image, percent);
                    }
                }
            );
        });
    });
}

/**
 * Pulls all required Docker images one at a time.
 */
export async function pullDependencyImages() {
    printSection('Pulling Docker Images');

    const uniqueImages = [
        ...new Set(Object.values(containerPresets).map((preset) => preset.Image))
    ];

    for (let image of uniqueImages) {
        try {
            await pullImageWithNoonaBar(image);
        } catch (err) {
            printError(`Failed to pull ${image}: ${err.message}`);
        }
    }

    printResult('All dependency images downloaded');
}
