import DraftkitPagePlaceholder from 'components/DraftkitPagePlaceholder';
import SideBar from 'components/sidebar'

export default function Page({}) {
  return (
  <div>
    <SideBar/>
    <DraftkitPagePlaceholder
      title={`League / Config`}
      note="Placeholder for DraftKit — navigation works, page content coming soon."
    />
  </div>
  );
}