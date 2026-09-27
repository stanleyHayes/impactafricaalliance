import { PROJECT_DOCUMENT_LIMIT } from '@iaa/shared';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import { useCan } from '../../auth/useCan';
import { DetailSection } from '../../components/detail/DetailSection';
import { FileAttachmentList } from '../../components/files/FileAttachmentList';
import { countLabel } from '../../components/projects/project-format';
import { READ_ONLY_NOTE, useProjectOutlet } from '../../components/projects/useProjectOutlet';
import { useAddProjectDocument, useRemoveProjectDocument } from '../../lib/projects';

/**
 * The project's Documents tab: reports, budgets, agreements and minutes kept
 * with the project. Uploads stay out of the media library (`register: false`).
 */
const ProjectDocumentsTab = (): JSX.Element => {
  const { project } = useProjectOutlet();
  const can = useCan();
  const canUpdate = can('update', 'projects');
  const add = useAddProjectDocument(project.id);
  const remove = useRemoveProjectDocument(project.id);
  return (
    <Stack spacing={3}>
      {!canUpdate && <Alert severity="info">{READ_ONLY_NOTE}</Alert>}
      <DetailSection
        title="Documents"
        icon={<FolderOutlinedIcon />}
        description={`${countLabel(project.documents.length, 'document')}. PDF, Word, Excel, PowerPoint, CSV, text or images, up to 10 MB each.`}
      >
        <FileAttachmentList
          items={project.documents}
          canEdit={canUpdate}
          onAdd={(input) => add.mutateAsync(input)}
          onRemove={(id) => remove.mutateAsync(id)}
          max={PROJECT_DOCUMENT_LIMIT}
          folder="projects"
          emptyText="No documents attached to this project yet. Reports, budgets and agreements belong here."
        />
      </DetailSection>
    </Stack>
  );
};

export default ProjectDocumentsTab;
