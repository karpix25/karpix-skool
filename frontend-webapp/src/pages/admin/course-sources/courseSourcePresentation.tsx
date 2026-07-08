import { Link2 } from 'lucide-react';

import type { CourseGenerationSourceKind } from './courseSourcesTypes';
import { sourceModes } from './courseSourceOptions';

export const CourseSourceKindIcon = ({ kind }: { kind: CourseGenerationSourceKind }) => {
    const mode = sourceModes.find(sourceMode => sourceMode.kind === kind);
    const Icon = mode?.Icon || Link2;
    return <Icon className="h-4 w-4" />;
};
