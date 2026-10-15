import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useNotificationStore } from '@/stores';
import { vertexApi } from '@/services/api/vertex';
import { apiClient } from '@/services/api/client';
import { createOAuthAttempts } from '../oauthAttempts';
import { getErrorMessage } from '@/utils/helpers';
import { notifyAuthFilesChanged } from '@/features/authFiles/authFilesEvents';

export interface VertexImportResult {
  projectId?: string;
  email?: string;
  location?: string;
  authFile?: string;
}

export interface VertexImportState {
  file?: File;
  location: string;
  loading: boolean;
  error?: string;
  result?: VertexImportResult;
}

const isJsonFile = (file: File) => file.name.toLowerCase().endsWith('.json');

/** Import a Vertex service-account JSON with an optional location. */
export function useVertexImport(options: {
  /** Display inline results while focused, or a toast after the dialog closes. */
  isFocused: () => boolean;
  onCredentialAdded: () => void;
}) {
  const { isFocused, onCredentialAdded } = options;
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const [vertex, setVertex] = useState<VertexImportState>({ location: '', loading: false });
  const attempts = useRef(
    createOAuthAttempts({
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (timer) => window.clearTimeout(timer),
    })
  );
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((current, previous) => {
      if (
        current.apiBase !== previous.apiBase ||
        current.managementKey !== previous.managementKey ||
        current.isAuthenticated !== previous.isAuthenticated
      ) {
        attempts.current.invalidateAll();
        setVertex({ location: '', loading: false });
      }
    });
    return () => {
      unsubscribe();
      attempts.current.invalidateAll();
    };
  }, []);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!isJsonFile(file)) {
      setVertex((prev) => ({ ...prev, error: t('vertex_import.file_required') }));
      return;
    }
    attempts.current.invalidateAll();
    setVertex((prev) => ({ ...prev, file, loading: false, error: undefined, result: undefined }));
  };

  const setLocation = (location: string) => setVertex((prev) => ({ ...prev, location }));

  const importCredential = async () => {
    if (!vertex.file) {
      setVertex((prev) => ({ ...prev, error: t('vertex_import.file_required') }));
      return;
    }
    const attempt = attempts.current.begin('vertex');
    const revision = apiClient.getConnectionRevision();
    const isCurrent = () => attempt.isCurrent() && revision === apiClient.getConnectionRevision();
    const location = vertex.location.trim();
    setVertex((prev) => ({ ...prev, loading: true, error: undefined, result: undefined }));
    try {
      const res = await vertexApi.importCredential(
        vertex.file,
        location || undefined,
        attempt.signal
      );
      if (!isCurrent()) return;
      const result: VertexImportResult = {
        projectId: res.project_id,
        email: res.email,
        location: res.location,
        authFile: res['auth-file'] ?? res.auth_file,
      };
      setVertex((prev) => ({ ...prev, loading: false, result }));
      notifyAuthFilesChanged();
      onCredentialAdded();
      if (!isFocused()) showNotification(t('vertex_import.success'), 'success');
    } catch (err: unknown) {
      if (!isCurrent()) return;
      const message = getErrorMessage(err);
      setVertex((prev) => ({
        ...prev,
        loading: false,
        error: message || t('notification.upload_failed'),
      }));
      if (!isFocused()) {
        showNotification(
          message
            ? `${t('notification.upload_failed')}: ${message}`
            : t('notification.upload_failed'),
          'error'
        );
      }
    }
  };

  /** Clear the selected file and result while retaining the location. */
  const resetForAnother = () => {
    attempts.current.invalidateAll();
    setVertex((prev) => ({ location: prev.location, loading: false }));
  };

  return { vertex, pickFile, setLocation, importCredential, resetForAnother };
}
