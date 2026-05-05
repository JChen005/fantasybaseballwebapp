import { useEffect, useMemo, useState } from 'react';
import { draftkitApi } from 'lib/draftkitApi';

export default function useApiCenterPageData({ router }) {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [consumerName, setConsumerName] = useState('DraftKit API Center');
  const [generatedKey, setGeneratedKey] = useState('');
  const [refreshingData, setRefreshingData] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [playerQuery, setPlayerQuery] = useState('');
  const [transactionDetail, setTransactionDetail] = useState('');
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [transactionMessage, setTransactionMessage] = useState('');

  const [loadingStageId, setLoadingStageId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLicense() {
      try {
        const data = await draftkitApi.getLicenseStatus();
        if (!cancelled) {
          setLicenseStatus(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load license status');
        }
      }
    }

    loadLicense();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkedAtLabel = useMemo(() => {
    if (!licenseStatus?.checkedAt) return 'Not checked yet';
    return new Date(licenseStatus.checkedAt).toLocaleString();
  }, [licenseStatus]);

  const licenseConsumer = licenseStatus?.license?.consumerName || 'Unknown';
  const licensePreview = licenseStatus?.license?.keyPreview || 'N/A';

  function resetNotices() {
    setError('');
    setSuccess('');
  }

  async function handleRefreshPlayerData() {
    resetNotices();
    setRefreshingData(true);
    try {
      const data = await draftkitApi.refreshPlayerData();
      setSuccess(`Player list updated. Added ${data.inserted ?? 0} new players.`);
    } catch (err) {
      setError(err.message || 'Could not update the player list');
    } finally {
      setRefreshingData(false);
    }
  }

  async function handleGenerateKey() {
    resetNotices();
    setGeneratedKey('');
    setGeneratingKey(true);
    try {
      const data = await draftkitApi.generatePlayerKey({ consumerName });
      setGeneratedKey(data.apiKey || '');
      setSuccess(`Created a new access key for ${data?.license?.consumerName || consumerName}.`);
    } catch (err) {
      setError(err.message || 'Could not create a new access key');
    } finally {
      setGeneratingKey(false);
    }
  }

  async function handleCreateTransaction(event) {
    event.preventDefault();
    resetNotices();
    setTransactionMessage('');
    setCreatingTransaction(true);
    try {
      const data = await draftkitApi.createPlayerTransaction({
        playerQuery,
        detail: transactionDetail,
      });
      setTransactionMessage(`Posted update for ${data?.resolvedPlayer?.name || 'that player'}.`);
    } catch (err) {
      setError(err.message || 'Could not create that player update');
    } finally {
      setCreatingTransaction(false);
    }
  }

  async function handleLoadStage(stageId) {
    resetNotices();
    setLoadingStageId(stageId);
    try {
      const data = await draftkitApi.loadDemoStage({ stage: stageId });
      setSuccess('Demo league loaded.');
      router.push(data.route || `/league/${data.leagueId}/draft`);
    } catch (err) {
      setError(err.message || 'Could not load that demo league');
    } finally {
      setLoadingStageId('');
    }
  }

  return {
    checkedAtLabel,
    consumerName,
    creatingTransaction,
    error,
    generatedKey,
    generatingKey,
    handleCreateTransaction,
    handleGenerateKey,
    handleLoadStage,
    handleRefreshPlayerData,
    licenseConsumer,
    licensePreview,
    loadingStageId,
    playerQuery,
    refreshingData,
    setConsumerName,
    setPlayerQuery,
    setTransactionDetail,
    success,
    transactionDetail,
    transactionMessage,
  };
}
