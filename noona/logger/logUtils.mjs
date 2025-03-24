// noona/logger/logUtils.mjs

import chalk from 'chalk';
import boxen from 'boxen';

const timestamp = () => new Date().toISOString();

export function printDivider() {
    console.log(`${timestamp()} ${chalk.gray('─'.repeat(60))}`);
}

export function printSection(title = '') {
    printDivider();
    if (title) {
        console.log(`${timestamp()} ${chalk.greenBright('✔')} ${chalk.bold(title)}`);
    }
}

export function printSpacer() {
    console.log(`${timestamp()} ${chalk.greenBright('✔')}`);
}

export function printHeader(title) {
    const box = boxen(chalk.bold(title), {
        padding: 0,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'cyan',
        align: 'center'
    });
    const lines = box.split('\n');
    lines.forEach(line => {
        console.log(`${timestamp()} ${line}`);
    });
}

export function printSubHeader(text) {
    console.log(`${timestamp()} ${chalk.bold('✔')} ${chalk.cyan(text)}`);
}

export function printNote(text) {
    console.log(`${timestamp()} ${chalk.gray('›')} ${chalk.italic(text)}`);
}

export function printAction(text) {
    console.log(`${timestamp()} ${chalk.blue('⚙')} ${text}`);
}

export function printResult(text) {
    console.log(`${timestamp()} ${chalk.green('✔')} ${chalk.bold(text)}`);
}

export function printError(text) {
    console.log(`${timestamp()} ${chalk.red('❌')} ${text}`);
}

export function printWarning(text) {
    console.log(`${timestamp()} ${chalk.yellow('!')} ${text}`);
}

export function printStep(text) {
    console.log(`${timestamp()} ${chalk.yellow('⚙')} ${text}`);
}

export function printProgressBar(label, percent, size = '') {
    const filledLength = Math.round((percent / 100) * 20);
    const bar = chalk.green('█'.repeat(filledLength)) + chalk.gray('░'.repeat(20 - filledLength));
    const paddedPercent = percent.toString().padStart(3, ' ') + '%';
    const paddedLabel = label.padEnd(24);
    const suffix = size ? chalk.gray(`(${size})`) : '';
    console.log(`${timestamp()} [${bar}] ${paddedPercent} ${chalk.gray(paddedLabel)} ${suffix}`);
}

export function printBanner(label = 'Noona') {
    const banner = `
 _______                         
(_______)                        
 _     _  ___   ___  ____  _____ 
| |   | |/ _ \\ / _ \\|  _ \\(____ |
| |   | | |_| | |_| | | | / ___ |
|_|   |_|\\___/ \\___/|_| |_|\\_____|
                                
`;
    banner.trim().split('\n').forEach(line => {
        console.log(`${timestamp()} ${chalk.cyanBright(line)}`);
    });
    printDivider();
    printResult(`🌙 ${label}-Warden Booting`);
    printDivider();
}

export function printDebug(text) {
    console.log(`${timestamp()} ${chalk.magenta('DEBUG:')} ${text}`);
}
