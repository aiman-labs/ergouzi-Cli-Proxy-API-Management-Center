#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const registryPath = 'docs/features/registry.json';
const states = new Set(['planned', 'implemented', 'retired']);
const origins = new Set(['downstream', 'hybrid', 'upstream']);
const strategies = new Set(['preserve', 'reconcile', 'replace-if-equivalent', 'drop']);
const array = value => Array.isArray(value) ? value : [];

export function safeRelative(value) {
  return typeof value === 'string' && value.length > 0 &&
    !value.startsWith('/') && !value.includes('\\') && !value.includes('\0') &&
    !/^[A-Za-z]:/.test(value) && !value.split('/').some(p => p === '..' || p === '.' || !p);
}

export function matches(file, pattern) {
  if (!safeRelative(file) || !safeRelative(pattern)) return false;
  let expression = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      i++;
      if (pattern[i + 1] === '/') { expression += '(?:.*/)?'; i++; }
      else expression += '.*';
    } else if (c === '*') expression += '[^/]*';
    else if (c === '?') expression += '[^/]';
    else expression += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${expression}$`).test(file);
}

export function validateRegistry(registry, files) {
  const errors = [];
  if (registry?.schema_version !== 1) errors.push('schema_version must be 1');
  if (typeof registry?.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(registry.repository))
    errors.push('repository must identify owner/repository');
  if (!Array.isArray(registry?.source_paths) || !registry.source_paths.length)
    errors.push('source_paths must identify business source surfaces');
  for (const p of array(registry?.source_paths)) {
    if (!safeRelative(p) || ['*', '**', '**/*'].includes(p)) errors.push(`Invalid source path: ${p}`);
  }
  if (!Array.isArray(registry?.features) || !registry.features.length) {
    errors.push('features must be a nonempty array');
    return errors;
  }
  const seen = new Set();
  for (const f of registry.features) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) { errors.push('Feature must be an object'); continue; }
    const id = f?.id;
    if (typeof id !== 'string' || !/^[A-Z][A-Z0-9]*-F\d{3,}$/.test(id) || seen.has(id))
      errors.push(`Invalid or duplicate feature ID: ${id}`);
    seen.add(id);
    for (const key of ['title', 'summary'])
      if (typeof f[key] !== 'string' || !f[key].trim()) errors.push(`${id}: ${key} is required`);
    if (!states.has(f.state)) errors.push(`${id}: invalid state`);
    if (!origins.has(f.origin)) errors.push(`${id}: invalid origin`);
    if (!strategies.has(f.upstream_strategy)) errors.push(`${id}: invalid upstream_strategy`);
    if (f.origin === 'upstream' && f.upstream_strategy === 'preserve')
      errors.push(`${id}: inherited upstream behavior must not be labelled downstream preservation`);
    for (const key of ['invariants', 'paths', 'verification', 'docs']) {
      if (!Array.isArray(f[key]) || !f[key].length || f[key].some(v => typeof v !== 'string' || !v.trim()))
        errors.push(`${id}: ${key} must be a nonempty string array`);
    }
    for (const p of array(f.paths)) {
      if (!safeRelative(p) || ['*', '**', '**/*'].includes(p)) errors.push(`${id}: invalid path: ${p}`);
      else if (f.state === 'implemented' && !files.some(file => matches(file, p)))
        errors.push(`${id}: source pattern matches no candidate file: ${p}`);
    }
    for (const p of array(f.docs)) {
      if (!safeRelative(p) || !files.includes(p)) errors.push(`${id}: missing repository document: ${p}`);
    }
    if (!Array.isArray(f.dependencies)) errors.push(`${id}: dependencies must be an array`);
    for (const dependency of array(f.dependencies)) {
      if (!dependency || !/^[A-Za-z0-9_.-]+$/.test(dependency.repository ?? '') ||
          !/^[A-Z][A-Z0-9]*-F\d{3,}$/.test(dependency.feature ?? '') ||
          typeof dependency.contract !== 'string' || !dependency.contract.trim())
        errors.push(`${id}: dependency needs repository, feature and contract`);
    }
    if ((f.upstream_strategy === 'drop' || f.state === 'retired') &&
        (!safeRelative(f.retirement_decision) || !files.includes(f.retirement_decision)))
      errors.push(`${id}: dropping a feature needs a recorded retirement decision`);
  }
  if (registry.upstream_path_mappings !== undefined && !Array.isArray(registry.upstream_path_mappings))
    errors.push('upstream_path_mappings must be an array');
  for (const mapping of array(registry.upstream_path_mappings)) {
    for (const key of ['from', 'to'])
      if (typeof mapping?.[key] !== 'string' || !mapping[key].endsWith('/') || !safeRelative(mapping[key].slice(0, -1)))
        errors.push(`Invalid upstream path mapping ${key}`);
  }
  return errors;
}

export function impacts(registry, changed, upstream = false) {
  const mappings = [...(registry.upstream_path_mappings ?? [])].sort((a, b) => b.from.length - a.from.length);
  const mapped = changed.map(file => {
    const mapping = upstream && mappings.find(m => file.startsWith(m.from));
    return mapping ? mapping.to + file.slice(mapping.from.length) : file;
  });
  return registry.features.filter(f => f.state === 'implemented').map(f => ({
    id: f.id, title: f.title, origin: f.origin, upstream_strategy: f.upstream_strategy,
    touched: mapped.filter(file => f.paths.some(pattern => matches(file, pattern))),
    invariants: f.invariants, verification: f.verification, docs: f.docs, dependencies: f.dependencies,
  })).filter(f => f.touched.length);
}

export function checkChange(registry, changed, branch, previous = null, candidateFiles = null) {
  const errors = [];
  const affected = impacts(registry, changed);
  const business = changed.filter(file => registry.source_paths.some(p => matches(file, p)));
  // A recorded retirement can cover deleted files, never surviving business code.
  const retiredDeletions = previous && candidateFiles ? impacts(previous, business).filter(f =>
    registry.features.some(n => n.id === f.id && n.state === 'retired' && n.retirement_decision))
    .flatMap(f => f.touched.filter(file => !candidateFiles.includes(file))) : [];
  const uncovered = business.filter(file => !affected.some(f => f.touched.includes(file)) && !retiredDeletions.includes(file));
  const isSync = /^(sync\/upstream-|integration\/upstream-)/.test(branch);
  if (business.length && !/^(feature\/|feat\/|fix\/|sync\/upstream-|integration\/upstream-)/.test(branch))
    errors.push('Business changes must use feature/, fix/, or an upstream sync branch; direct main development is refused');
  if (business.length && /^(feature|feat)\//.test(branch) && !changed.includes(registryPath))
    errors.push('Feature development must add or update its registry record in the same change');
  if (previous) {
    for (const old of previous.features ?? []) {
      if (!registry.features.some(f => f.id === old.id)) errors.push(`${old.id}: keep the record and retire it with a decision instead of deleting its identity`);
    }
    if (business.length && /^(feature|feat)\//.test(branch) && affected.length &&
        !affected.some(f => JSON.stringify(registry.features.find(n => n.id === f.id)) !==
          JSON.stringify(previous.features.find(n => n.id === f.id))))
      errors.push('Feature development must update an affected record; unrelated registry edits do not count');
    const previousBusiness = changed.filter(file => array(previous.source_paths).some(p => matches(file, p)));
    if (previousBusiness.some(file => !business.includes(file)))
      errors.push('Changed business surfaces were removed from source_paths; keep their coverage during this change');
  }
  if (business.length && isSync && !changed.includes('docs/upstream-sync/sync-history.md'))
    errors.push('Upstream sync must update sync-history.md with target, protected features and actual checks');
  if (!isSync && uncovered.length)
    errors.push(`Business files lack an implemented feature record: ${uncovered.join(', ')}`);
  return { errors, affected, uncovered, business_files: business, upstream_sync: isSync };
}

function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function resolveRevision(repo, ref) {
  if (!ref || ref.startsWith('-')) throw new Error('An explicit Git revision is required');
  return git(repo, 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
}

function assertNoSymlink(repo, relative) {
  let current = repo;
  for (const component of relative.split('/')) {
    current = path.join(current, component);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Refusing symbolic-link registry: ${relative}`);
  }
}

export function inspectRepository(options) {
  const repo = fs.realpathSync(path.resolve(options.repo ?? '.'));
  assertNoSymlink(repo, registryPath);
  const registry = JSON.parse(fs.readFileSync(path.join(repo, registryPath), 'utf8'));
  const listed = git(repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  const files = [...new Set(listed)].filter(file => {
    try { return fs.lstatSync(path.join(repo, file)).isFile(); } catch { return false; }
  });
  const errors = validateRegistry(registry, files);
  if (!listed.includes(registryPath)) errors.push('Feature registry is ignored by Git; explicitly include it in version control');
  const report = { repository: registry.repository, feature_count: registry.features?.length ?? 0, errors };
  if (errors.length) return report;
  if (options.base) {
    const base = resolveRevision(repo, options.base);
    const head = options.head ? resolveRevision(repo, options.head) : null;
    if (head && (head !== resolveRevision(repo, 'HEAD') || git(repo, 'status', '--porcelain').trim()))
      throw new Error('--head requires a clean checkout of that exact candidate; omit --head to inspect local edits');
    // PR changes start at the common ancestor, not at an advancing base branch tip.
    const mergeBase = git(repo, 'merge-base', base, head ?? 'HEAD').trim();
    const changed = git(repo, 'diff', '--name-only', '--no-renames', '-z', mergeBase, ...(head ? [head] : []))
      .split('\0').filter(Boolean);
    if (!head) changed.push(...git(repo, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean));
    const branch = options.branch ?? git(repo, 'branch', '--show-current').trim();
    let previous = null;
    if (git(repo, 'ls-tree', '--name-only', mergeBase, '--', registryPath).trim())
      previous = JSON.parse(git(repo, 'show', `${mergeBase}:${registryPath}`));
    const result = checkChange(registry, [...new Set(changed)], branch, previous, files);
    report.change = { base, merge_base: mergeBase, head: head ?? 'working-tree', branch, ...result };
    errors.push(...result.errors);
  }
  if (options.upstreamBase || options.upstreamTarget) {
    const base = resolveRevision(repo, options.upstreamBase);
    const target = resolveRevision(repo, options.upstreamTarget);
    // Endpoint delta is intentional: squash/snapshot forks cannot use a fork/upstream merge-base diff.
    const changed = git(repo, 'diff', '--name-only', '--no-renames', '-z', base, target).split('\0').filter(Boolean);
    report.upstream = { base, target, changed_files: changed.length, affected: impacts(registry, changed, true) };
  }
  return report;
}

function main() {
  const options = {};
  const names = { '--repo': 'repo', '--base': 'base', '--head': 'head', '--branch': 'branch', '--upstream-base': 'upstreamBase', '--upstream-target': 'upstreamTarget' };
  for (let i = 2; i < process.argv.length; i++) {
    const key = process.argv[i];
    if (key === '--json') { options.json = true; continue; }
    if (key === '--help') {
      console.log('feature-contract.mjs --repo PATH [--base REF [--head REF] --branch feature/NAME] [--upstream-base REF --upstream-target REF] [--json]');
      console.log('Read-only validation and overlap analysis. Verification commands are printed, never executed.');
      return;
    }
    if (!names[key] || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${key}`);
    options[names[key]] = process.argv[++i];
  }
  if (options.head && !options.base) throw new Error('--head requires --base');
  const report = inspectRepository(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${report.repository}: ${report.feature_count} features; ${report.errors.length ? 'FAILED' : 'PASS'}`);
    for (const error of report.errors) console.error(`ERROR: ${error}`);
    for (const [mode, result] of [['change', report.change], ['upstream', report.upstream]]) {
      if (!result) continue;
      for (const f of result.affected) {
        console.log(`${mode}: ${f.id} ${f.title} [${f.upstream_strategy}] (${f.touched.length} paths)`);
        for (const command of f.verification) console.log(`  verify: ${command}`);
        for (const dependency of f.dependencies) console.log(`  contract: ${dependency.repository}/${dependency.feature}: ${dependency.contract}`);
      }
      if (result.uncovered?.length) console.log(`Unregistered upstream surfaces require classification: ${result.uncovered.join(', ')}`);
    }
  }
  if (report.errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}
