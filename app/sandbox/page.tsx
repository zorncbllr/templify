import Editor from './components/Editor';
import { PLAN_LIMITS } from '@/lib/config/pricing';

export default function SandboxPage() {
  return (
    <Editor
      maxRows={PLAN_LIMITS.free.maxRows}
      maxPhotoColumns={PLAN_LIMITS.free.maxPhotoColumns}
    />
  );
}
