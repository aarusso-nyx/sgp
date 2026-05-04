import { spawn, spawnSync } from 'node:child_process';

import { stripPassThroughSeparator } from './cli.mjs';
import { npmCommand } from './repo-paths.mjs';

export function resolveCommand(command) {
  if (command === 'npm') return npmCommand;
  if (command === 'node') return process.execPath;
  return command;
}

export function runCommand(commandName, commandArgs, options = {}) {
  const result = runCommandResult(commandName, commandArgs, options);

  if (typeof result.status === 'number') {
    return result.status;
  }

  if (result.error) {
    const label = [resolveCommand(commandName), ...commandArgs].join(' ');
    console.error(`[run] failed to execute ${label}: ${result.error.message}`);
  }

  return 1;
}

export function runCommandResult(commandName, commandArgs, options = {}) {
  const resolvedCommand = resolveCommand(commandName);
  return spawnSync(resolvedCommand, commandArgs, {
    stdio: options.stdio ?? 'inherit',
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    encoding: options.encoding,
    shell: options.shell ?? process.platform === 'win32',
    maxBuffer: options.maxBuffer,
  });
}

export function runSequence(steps) {
  for (const step of steps) {
    const status = step();
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

export function runNpm(argsToRun, options = {}) {
  return runCommand(npmCommand, argsToRun, options);
}

export function runNpmScript(scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }
  return runNpm(commandArgs, options);
}

export function runWorkspaceScript(workspace, scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['--workspace', workspace, 'run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }
  return runNpm(commandArgs, options);
}

export function runWorkspaceExec(workspace, execArgs, options = {}) {
  return runNpm(['--workspace', workspace, 'exec', '--', ...execArgs], options);
}

export function spawnNpm(argsToRun, options = {}) {
  return spawn(npmCommand, argsToRun, {
    stdio: options.stdio ?? 'inherit',
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    shell: options.shell ?? process.platform === 'win32',
  });
}

export function spawnNpmScript(scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }
  return spawnNpm(commandArgs, options);
}

export function spawnWorkspaceScript(workspace, scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['--workspace', workspace, 'run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }
  return spawnNpm(commandArgs, options);
}
