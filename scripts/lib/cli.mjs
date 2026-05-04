export function parseArgs(argv, { booleanFlags = [] } = {}) {
  const options = { _: [] };
  const booleans = new Set(booleanFlags);

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--') {
      options._.push(...argv.slice(index + 1));
      break;
    }

    if (!value.startsWith('--')) {
      options._.push(value);
      continue;
    }

    const [rawName, inlineValue] = value.slice(2).split('=', 2);
    if (booleans.has(rawName)) {
      options[rawName] = inlineValue === undefined ? true : inlineValue !== 'false';
      continue;
    }

    if (inlineValue !== undefined) {
      options[rawName] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[rawName] = next;
      index += 1;
    } else {
      options[rawName] = true;
    }
  }

  return options;
}

export function hasFlag(argv, flagName) {
  return argv.includes(`--${flagName}`);
}

export function optionValue(argv, optionName, defaultValue = undefined) {
  const explicit = argv.find((value) => value.startsWith(`--${optionName}=`));
  if (explicit) {
    return explicit.slice(optionName.length + 3);
  }

  const index = argv.indexOf(`--${optionName}`);
  if (index >= 0) {
    return argv[index + 1] ?? defaultValue;
  }

  return defaultValue;
}

export function stripPassThroughSeparator(values) {
  return values[0] === '--' ? values.slice(1) : values;
}

export function parsePositiveInt(argv, optionName, fallback, { label = optionName } = {}) {
  const value = optionValue(argv, optionName);
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${label} must be a positive integer`);
  }

  return parsed;
}
