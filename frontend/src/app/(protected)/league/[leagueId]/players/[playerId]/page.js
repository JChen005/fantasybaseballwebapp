import DraftkitPagePlaceholder from 'components/DraftkitPagePlaceholder';
import SideBar from 'components/sidebar';

export default function Page() {
  return (
    <>
      <SideBar />
      <DraftkitPagePlaceholder
        title="League / Player Details"
        note="Placeholder for DraftKit — navigation works, page content coming soon."
      />
    </>
  );
}
