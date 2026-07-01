export type AuthFileImportPriorityMode = 'strip' | 'set' | 'preserve';
export type AuthFileImportDisabledMode = 'enabled' | 'disabled' | 'preserve';

export type AuthFileImportOptions = {
  priorityMode: AuthFileImportPriorityMode;
  priorityValue?: number;
  disabledMode?: AuthFileImportDisabledMode;
};

export const DEFAULT_AUTH_FILE_IMPORT_OPTIONS: AuthFileImportOptions = {
  priorityMode: 'strip',
  disabledMode: 'enabled',
};

const parseJsonObject = (rawText: string): Record<string, unknown> => {
  const parsed = JSON.parse(rawText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Auth file must be a JSON object');
  }
  return { ...(parsed as Record<string, unknown>) };
};

export const transformAuthFileImportJson = (
  rawText: string,
  options: AuthFileImportOptions
): string => {
  const disabledMode = options.disabledMode ?? DEFAULT_AUTH_FILE_IMPORT_OPTIONS.disabledMode;
  if (options.priorityMode === 'preserve' && disabledMode === 'preserve') return rawText;

  const next = parseJsonObject(rawText);
  if (options.priorityMode === 'strip') {
    delete next.priority;
  } else if (options.priorityMode === 'set') {
    if (!Number.isSafeInteger(options.priorityValue)) {
      throw new Error('Priority must be a safe integer');
    }
    next.priority = options.priorityValue;
  }
  if (disabledMode === 'enabled') {
    delete next.disabled;
  } else if (disabledMode === 'disabled') {
    next.disabled = true;
  }

  return `${JSON.stringify(next, null, 2)}\n`;
};

export const transformAuthFileForImport = async (
  file: File,
  options: AuthFileImportOptions
): Promise<File> => {
  const disabledMode = options.disabledMode ?? DEFAULT_AUTH_FILE_IMPORT_OPTIONS.disabledMode;
  if (options.priorityMode === 'preserve' && disabledMode === 'preserve') return file;

  const transformedText = transformAuthFileImportJson(await file.text(), options);
  return new File([transformedText], file.name, {
    type: file.type || 'application/json',
    lastModified: file.lastModified,
  });
};

export const transformAuthFilesForImport = async (
  files: File[],
  options: AuthFileImportOptions
): Promise<File[]> => Promise.all(files.map((file) => transformAuthFileForImport(file, options)));
