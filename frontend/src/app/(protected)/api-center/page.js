'use client';

import { useRouter } from 'next/navigation';
import ApiCenterAdminPanel from './ApiCenterAdminPanel';
import ApiCenterDemoStages from './ApiCenterDemoStages';
import ApiCenterHero from './ApiCenterHero';
import ApiCenterNotices from './ApiCenterNotices';
import ApiCenterTransactionForm from './ApiCenterTransactionForm';
import useApiCenterPageData from './useApiCenterPageData';

export default function ApiCenterPage() {
  const router = useRouter();
  const apiCenterData = useApiCenterPageData({ router });

  return (
    <section className="space-y-6">
      <ApiCenterHero
        checkedAtLabel={apiCenterData.checkedAtLabel}
        licenseConsumer={apiCenterData.licenseConsumer}
        licensePreview={apiCenterData.licensePreview}
      />

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <ApiCenterAdminPanel {...apiCenterData} />
          <ApiCenterTransactionForm {...apiCenterData} />
        </div>

        <ApiCenterDemoStages
          handleLoadStage={apiCenterData.handleLoadStage}
          loadingStageId={apiCenterData.loadingStageId}
        />
      </div>

      <ApiCenterNotices error={apiCenterData.error} success={apiCenterData.success} />
    </section>
  );
}
