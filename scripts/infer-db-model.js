const fs = require('node:fs');
const path = require('node:path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function toSnake(text) {
  return clean(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function singularizePt(token) {
  const t = String(token || '');
  if (!t) return t;
  if (t.endsWith('acoes')) return `${t.slice(0, -5)}acao`;
  if (t.endsWith('oes')) return `${t.slice(0, -3)}ao`;
  if (t.endsWith('ais')) return `${t.slice(0, -3)}al`;
  if (t.endsWith('eis')) return `${t.slice(0, -3)}el`;
  if (t.endsWith('is') && t.length > 3) return `${t.slice(0, -2)}il`;
  if (t.endsWith('s') && !t.endsWith('ss') && t.length > 3) return t.slice(0, -1);
  return t;
}

function canonicalEntityName(rawName) {
  let n = toSnake(rawName);
  if (!n) return '';

  // Strip helper prefixes from API utility endpoints.
  n = n.replace(/^lista_/, '');
  n = n.replace(/^list_/, '');
  n = n.replace(/_dto$/, '');

  const alias = {
    convenios: 'convenio',
    programas: 'programa',
    notificacoes: 'notificacao',
    relatorios: 'relatorio',
    menus: 'menu',
    usuarios: 'usuario',
    vinculos: 'vinculo',
    filiais: 'filial',
    empresas: 'empresa',
    lista_empresas_filiais: 'empresa_filial',
    lista_empresas_nao_matrizes_ativas: 'empresa_filial',
    lista_sigla_empresa_filial: 'empresa_filial',
    sigla_empresa_filial: 'empresa_filial',
    lista_filiais: 'filial',
    lista_vinculos: 'vinculo',
    empresa_nao_matrizes_ativas: 'empresa_filial',
    empresa_nao_matrize_ativa: 'empresa_filial',
    lista_situacoes_funcionais: 'situacao_funcional',
    lista_situacoes_funcionais_dto: 'situacao_funcional',
    situacoes_funcionais: 'situacao_funcional',
    situacao_funcional_dto: 'situacao_funcional'
  };
  if (alias[n]) return alias[n];

  // Singularize each token conservatively.
  const parts = n.split('_').filter(Boolean).map((p) => singularizePt(p));
  return parts.join('_');
}

function routeToEntity(route) {
  const m = String(route || '').match(/^#!\/([^/?#]+)/);
  if (!m) return '';
  return canonicalEntityName(m[1]);
}

function parseTableColumns(tableLabel) {
  const m = String(tableLabel || '').match(/\(([^)]+)\)/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((x) => canonicalEntityName(x))
    .filter(Boolean);
}

function ngModelToColumn(ngModel) {
  const raw = String(ngModel || '');
  if (!raw || raw.includes('$') || raw.includes('(') || raw.includes(' in ')) return '';
  const parts = raw.split('.');
  const tail = parts[parts.length - 1];
  return canonicalEntityName(tail);
}

function fromApiPath(apiPath) {
  // /detran-am/api/relatorioServidorPagBloqueado/empresa/filial/search
  const parts = String(apiPath || '')
    .split('/api/')[1];
  if (!parts) return [];
  return parts
    .split('/')
    .filter(Boolean)
    .map((p) => canonicalEntityName(p))
    .filter((p) => p !== 'search' && p !== 'publico' && p !== 'downloadfile' && p !== 'true' && p !== 'false' && p !== 'dto' && !/^\d+$/.test(p));
}

function ensureTable(map, name) {
  const canonical = canonicalEntityName(name);
  if (!canonical) return null;
  if (!map.has(canonical)) {
    map.set(canonical, {
      table: canonical,
      status: 'inferred',
      aliases: new Set([name, canonical].filter(Boolean)),
      evidence: [],
      columns: new Map(),
      primaryKey: { name: '', status: 'unverified', rationale: '' },
      foreignKeys: []
    });
  }
  const table = map.get(canonical);
  table.aliases.add(name);
  table.aliases.add(canonical);
  return table;
}

function addEvidence(table, ev) {
  if (!ev) return;
  if (!table.evidence.includes(ev)) table.evidence.push(ev);
}

function addColumn(table, colName, status, source, constraintHints = []) {
  const normalized = canonicalEntityName(colName);
  if (!normalized) return;
  if (!table.columns.has(normalized)) {
    table.columns.set(normalized, {
      name: normalized,
      status,
      sources: [source],
      constraintHints: [...constraintHints]
    });
    return;
  }
  const existing = table.columns.get(normalized);
  if (!existing.sources.includes(source)) existing.sources.push(source);
  for (const hint of constraintHints) {
    if (!existing.constraintHints.includes(hint)) existing.constraintHints.push(hint);
  }
  if (existing.status !== 'observed' && status === 'observed') existing.status = 'observed';
}

function tableFromColumnName(col, knownTables) {
  if (col.endsWith('_id')) {
    const base = col.slice(0, -3);
    const canonical = canonicalEntityName(base);
    if (knownTables.has(canonical)) return canonical;
    return canonical;
  }
  const directCandidates = ['empresa', 'filial', 'usuario', 'perfil', 'vinculo', 'situacao_funcional', 'cargo', 'funcao', 'banco', 'lotacao', 'sindicato', 'verba', 'tipo_documento', 'tipo_contrato', 'empresa_filial', 'programa', 'convenio'];
  const canonical = canonicalEntityName(col);
  if (directCandidates.includes(canonical)) return canonical;
  return '';
}

function finalizeTable(table, knownTables) {
  const colNames = Array.from(table.columns.keys());
  const idCol = colNames.find((c) => c === 'id');
  const codeCol = colNames.find((c) => c === 'codigo' || c.endsWith('_id'));

  if (idCol) {
    table.primaryKey = {
      name: idCol,
      status: 'observed',
      rationale: 'Column observed in screen fields/table headers.'
    };
  } else if (codeCol) {
    table.primaryKey = {
      name: codeCol,
      status: 'inferred',
      rationale: 'Likely key based on naming convention (codigo/*_id).'
    };
  } else {
    table.primaryKey = {
      name: `${table.table}_id`,
      status: 'unverified',
      rationale: 'Fallback convention; no direct key-like column observed.'
    };
  }

  for (const col of colNames) {
    const ref = tableFromColumnName(col, knownTables);
    if (!ref || ref === table.table) continue;
    if (!table.foreignKeys.find((fk) => fk.column === col && fk.referencesTable === ref)) {
      table.foreignKeys.push({
        column: col,
        referencesTable: ref,
        referencesColumn: 'id',
        status: col.endsWith('_id') ? 'inferred' : 'unverified',
        rationale: col.endsWith('_id') ? 'Name pattern *_id suggests relation.' : 'Domain-name column may reference another entity.'
      });
    }
  }
}

function main() {
  const cwd = process.cwd();
  const screens = readJson(path.join(cwd, 'inventories', 'screens.json'));
  const routes = readJson(path.join(cwd, 'inventories', 'routes.json'));
  const apiCalls = readJson(path.join(cwd, 'inventories', 'api-calls.json'));

  const tables = new Map();

  for (const screen of screens.screens || []) {
    const entity = routeToEntity(screen.route);
    if (!entity) continue;
    const t = ensureTable(tables, entity);
    t.status = 'observed';
    for (const ev of screen.evidence || []) addEvidence(t, ev);

    for (const f of (screen.details && screen.details.fields) || []) {
      const names = [
        canonicalEntityName(f.name || ''),
        canonicalEntityName(f.id || ''),
        canonicalEntityName(f.label || ''),
        ngModelToColumn(f.ngModel || '')
      ].filter(Boolean);
      const col = names.find((n) => n && !/^input_\d+$/.test(n) && !/^fl_input_\d+$/.test(n) && !/^username$|^password$/.test(n));
      if (!col) continue;
      const hints = [];
      if (f.required) hints.push('required');
      if (f.minlength != null) hints.push(`minlength:${f.minlength}`);
      if (f.maxlength != null) hints.push(`maxlength:${f.maxlength}`);
      addColumn(t, col, 'observed', `screen:${screen.route}`, hints);
    }

    for (const tableLabel of (screen.elements && screen.elements.tables) || []) {
      for (const c of parseTableColumns(tableLabel)) {
        if (c === 'acoes' || c === 'acao') continue;
        addColumn(t, c, 'observed', `table:${screen.route}`);
      }
    }
  }

  for (const r of routes.routes || []) {
    const entity = routeToEntity(r.path);
    if (!entity) continue;
    const t = ensureTable(tables, entity);
    for (const ev of r.evidence || []) addEvidence(t, ev);
  }

  for (const c of apiCalls.calls || []) {
    const parts = fromApiPath(c.path);
    if (parts.length === 0) continue;
    const primary = parts[0];
    const t = ensureTable(tables, primary);
    addEvidence(t, 'inventories/api-calls.json');
    addColumn(t, 'id', 'inferred', `api:${c.path}`);
    for (const p of parts.slice(1)) {
      if (p.length < 2) continue;
      addColumn(t, p, 'inferred', `api:${c.path}`);
    }
    for (const q of c.queryKeys || []) {
      addColumn(t, canonicalEntityName(q), 'inferred', `api-query:${c.path}`);
    }
  }

  const known = new Set(Array.from(tables.keys()));
  for (const t of tables.values()) finalizeTable(t, known);

  const tableList = Array.from(tables.values())
    .map((t) => ({
      table: t.table,
      status: t.status,
      aliases: Array.from(t.aliases).filter(Boolean).sort(),
      evidence: t.evidence,
      columns: Array.from(t.columns.values()).sort((a, b) => a.name.localeCompare(b.name)),
      primaryKey: t.primaryKey,
      foreignKeys: t.foreignKeys.sort((a, b) => a.column.localeCompare(b.column))
    }))
    .sort((a, b) => a.table.localeCompare(b.table));

  const out = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'inference-from-inventories-and-api-calls',
      confidenceLegend: ['observed', 'inferred', 'unverified'],
      tableCount: tableList.length
    },
    tables: tableList
  };

  fs.writeFileSync(path.join(cwd, 'inventories', 'database-model.json'), JSON.stringify(out, null, 2));

  const md = [];
  md.push('# Inferred Database Model');
  md.push('');
  md.push(`Generated at: ${out.meta.generatedAt}`);
  md.push(`Total inferred tables: ${out.meta.tableCount}`);
  md.push('');
  md.push('Confidence legend: `observed`, `inferred`, `unverified`.');
  md.push('');
  md.push('## Tables');

  for (const t of tableList) {
    md.push('');
    md.push(`### ${t.table}`);
    md.push(`- Status: ${t.status}`);
    if (t.aliases && t.aliases.length > 1) {
      md.push(`- Aliases merged: ${t.aliases.join(', ')}`);
    }
    md.push(`- Primary key: ${t.primaryKey.name} (${t.primaryKey.status})`);
    md.push(`- PK rationale: ${t.primaryKey.rationale}`);
    md.push(`- Evidence: ${t.evidence.slice(0, 5).join(', ') || 'none'}`);
    md.push('- Columns:');
    for (const c of t.columns) {
      const hints = c.constraintHints.length > 0 ? `; constraints=${c.constraintHints.join('|')}` : '';
      md.push(`  - ${c.name} (${c.status})${hints}`);
    }
    if (t.foreignKeys.length > 0) {
      md.push('- Foreign keys:');
      for (const fk of t.foreignKeys) {
        md.push(`  - ${fk.column} -> ${fk.referencesTable}.${fk.referencesColumn} (${fk.status})`);
      }
    } else {
      md.push('- Foreign keys: none inferred');
    }
  }

  fs.writeFileSync(path.join(cwd, 'docs', 'database-model.md'), `${md.join('\n')}\n`);

  console.log(JSON.stringify({
    tables: tableList.length,
    json: 'inventories/database-model.json',
    md: 'docs/legacy-reverse/database-model.md'
  }, null, 2));
}

main();
