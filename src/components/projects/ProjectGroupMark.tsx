import { GitBranch, GraduationCap, Handshake } from 'lucide-react';
import swanDigitalLogo from '@/assets/swan-digital-logo.png';
import hostingBabaLogo from '@/assets/hosting-baba-logo.png';
import { VENTURE, type ProjectGroupId } from '@/lib/projects';

// The logo or icon that stands for a project group. Used by the cards under the
// photo on the home page and by the headings of the Projects section, so the same
// mark is seen before and after the jump.
const ProjectGroupMark = ({ id, large = false }: { id: ProjectGroupId; large?: boolean }) => {
  const size = large ? ' group-mark-lg' : '';
  const iconSize = large ? 24 : 19;

  switch (id) {
    case 'hosting-baba':
      return (
        <span className={`group-mark group-mark-wide${size}`}>
          <img src={hostingBabaLogo} alt="" width={227} height={62} />
        </span>
      );
    case 'swan-digital':
      return (
        <span className={`group-mark group-mark-round${size}`}>
          <img src={swanDigitalLogo} alt="" width={96} height={96} />
        </span>
      );
    case 'venture':
      return (
        <span className={`group-mark group-mark-tile${size}`}>
          <img src={VENTURE.logo} alt="" width={96} height={96} />
        </span>
      );
    case 'client':
      return (
        <span className={`group-mark group-mark-icon${size}`}>
          <Handshake size={iconSize} aria-hidden />
        </span>
      );
    case 'personal':
      return (
        <span className={`group-mark group-mark-icon${size}`}>
          <GitBranch size={iconSize} aria-hidden />
        </span>
      );
    case 'academic':
      return (
        <span className={`group-mark group-mark-icon${size}`}>
          <GraduationCap size={iconSize} aria-hidden />
        </span>
      );
  }
};

export default ProjectGroupMark;
