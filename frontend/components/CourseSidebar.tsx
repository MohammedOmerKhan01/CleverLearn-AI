'use client';
import { useRouter } from 'next/navigation';
import { useSidebarStore } from '@/stores/sidebarStore';

interface Props {
  subjectId: string;
  currentVideoId: string;
}

export function CourseSidebar({ subjectId, currentVideoId }: Props) {
  const { tree } = useSidebarStore();
  const router = useRouter();

  if (!tree) return null;

  function handleVideoClick(videoId: string, locked: boolean) {
    if (locked) return;
    router.push(`/learn/${subjectId}?videoId=${videoId}`);
  }

  return (
    <aside className="w-80 shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-sm text-gray-300 truncate">{tree.title}</h2>
      </div>
      <div className="py-2">
        {tree.sections.map((section) => (
          <div key={section.id}>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </div>
            {section.videos.map((video) => {
              // Trust lock status from backend — no client-side recomputation
              const locked: boolean = (video as { locked?: boolean }).locked ?? false;
              const completed: boolean = (video as { is_completed?: boolean }).is_completed ?? false;
              const isCurrent = video.id === currentVideoId;

              return (
                <button
                  key={video.id}
                  onClick={() => handleVideoClick(video.id, locked)}
                  disabled={locked}
                  title={locked ? (video as { unlock_reason?: string }).unlock_reason : undefined}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors
                    ${isCurrent ? 'bg-indigo-900/40 border-l-2 border-indigo-500' : 'hover:bg-gray-800'}
                    ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className="mt-0.5 shrink-0 text-base">
                    {completed ? '✅' : locked ? '🔒' : '▶️'}
                  </span>
                  <span className="text-sm leading-snug">{video.title}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
