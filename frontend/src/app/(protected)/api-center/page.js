'use client';

import { useEffect, useState } from 'react';
import { draftkitApi } from 'lib/draftkitApi';

export default function ApiCenterPage() {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [loadingLicense, setLoadingLicense] = useState(true);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLicense() {
      setLoadingLicense(true);
      setError('');
      try {
        const data = await draftkitApi.getLicenseStatus();
        if (!cancelled) setLicenseStatus(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load license status');
      } finally {
        if (!cancelled) setLoadingLicense(false);
      }
    }

    loadLicense();
    return () => {
      cancelled = true;
    };
  }, []);

  const triggerMockTransaction = async () => {
    setError('');
    setMessage('');
    setTriggering(true);
    try {
      const data = await draftkitApi.triggerMockTransaction();
      setMessage(`Mock transaction triggered (playerId: ${data.playerId}).`);
    } catch (err) {
      setError(err.message || 'Failed to trigger mock transaction');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="panel">
        <h1 className="text-2xl font-semibold">API Center</h1>
        <p className="text-sm text-slate-600">
          license status & a simple server action test.
        </p>
      </div>

      <div className="panel space-y-2 text-sm">
        <h2 className="text-lg font-semibold">License Status</h2>
        {loadingLicense ? (
          <p className="text-slate-600">Loading license status...</p>
        ) : licenseStatus ? (
          <ul className="space-y-1 text-slate-700">
            <li>Status: {licenseStatus.status}</li>
            <li>Consumer: {licenseStatus?.license?.consumerName || 'Unknown'}</li>
            <li>Key Preview: {licenseStatus?.license?.keyPreview || 'N/A'}</li>
            <li>Checked At: {new Date(licenseStatus.checkedAt).toLocaleString()}</li>
          </ul>
        ) : (
          <p className="text-slate-600">No license status available.</p>
        )}
      </div>

      <div className="panel space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Demo Action</h2>
        <button className="btn" type="button" onClick={triggerMockTransaction} disabled={triggering}>
          {triggering ? 'Running...' : 'Trigger Mock Transaction'}
        </button>

        <p className="text-xs text-slate-600">
          Backend is reachable and auth/cookies are working.
        </p>
      </div>

      {message ? (
        <div className="panel text-sm text-emerald-700" role="status">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="panel text-sm text-red-600" role="status" aria-live="polite">
          {error}
        </div>
      ) : null}
    </section>
  );
}