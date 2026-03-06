const configuredDraftkitApiUrl = process.env.NEXT_PUBLIC_DRAFTKIT_API_URL;

if (!configuredDraftkitApiUrl || !configuredDraftkitApiUrl.trim()) {
  throw new Error('NEXT_PUBLIC_DRAFTKIT_API_URL is required');
}

export const DRAFTKIT_API_URL = configuredDraftkitApiUrl.replace(/\/+$/, '');
