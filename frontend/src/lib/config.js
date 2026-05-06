const configuredDraftkitApiUrl = process.env.NEXT_PUBLIC_DRAFTKIT_API_URL;
const usesSameOriginApi = process.env.NODE_ENV === 'production';

if (!usesSameOriginApi && (!configuredDraftkitApiUrl || !configuredDraftkitApiUrl.trim())) {
  throw new Error('NEXT_PUBLIC_DRAFTKIT_API_URL is required');
}

export const DRAFTKIT_API_URL = usesSameOriginApi
  ? ''
  : configuredDraftkitApiUrl.replace(/\/+$/, '');
