import { ShareLinkMenuItem } from '../../../admin/components/share/ShareLinkMenuItem';
import { getModuleShareLink } from '../../../services/deepLinks';

interface ModuleShareLinkMenuItemProps {
    moduleId: string;
}

export const ModuleShareLinkMenuItem = ({ moduleId }: ModuleShareLinkMenuItemProps) => {
    return (
        <ShareLinkMenuItem
            getShareLink={() => getModuleShareLink(moduleId)}
            idleLabel="Ссылка для соцсетей"
            logLabel="module"
        />
    );
};
