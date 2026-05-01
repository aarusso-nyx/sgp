import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PERMISSIONS } from './permission-catalog.generated';

describe('permission catalog drift', () => {
  it('keeps generated TypeScript permissions identical to the JSON seed', () => {
    const seedPath = resolve(
      __dirname,
      '../../../../database/seed/permission-catalog.json',
    );
    const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as {
      permissions: Array<{ key: string }>;
    };
    const jsonCodes = seed.permissions
      .map((permission) => permission.key)
      .sort();
    const generatedCodes = [...PERMISSIONS].sort();

    expect(generatedCodes).toEqual(jsonCodes);
  });
});
