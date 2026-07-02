import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LessonContent } from '../../../types/course';
import { LessonVideoPlayer } from './LessonVideoPlayer';

vi.mock('../../../admin/components/editor/MuxPlayer', () => ({
    default: ({ playbackId }: { playbackId: string }) => (
        <div data-testid="mux-player">Mux playback: {playbackId}</div>
    ),
}));

const baseLesson: LessonContent = {
    id: 'lesson-1',
    title: 'Первый урок',
};

describe('LessonVideoPlayer', () => {
    it('renders the mux player when a playback id is available', async () => {
        render(
            <LessonVideoPlayer
                lesson={{
                    ...baseLesson,
                    video_provider: 'mux',
                    mux_playback_id: 'playback-1',
                    mux_status: 'ready',
                }}
            />
        );

        expect(await screen.findByTestId('mux-player')).toHaveTextContent('playback-1');
    });

    it('shows a clear error state for failed mux processing', () => {
        render(
            <LessonVideoPlayer
                lesson={{
                    ...baseLesson,
                    video_provider: 'mux',
                    mux_status: 'errored',
                }}
            />
        );

        expect(screen.getByText('Видео не загрузилось')).toBeInTheDocument();
        expect(screen.getByText('Файл не удалось обработать. Сообщите администратору курса.')).toBeInTheDocument();
    });

    it('renders a YouTube iframe for unlisted YouTube lessons', () => {
        render(
            <LessonVideoPlayer
                lesson={{
                    ...baseLesson,
                    video_provider: 'youtube_unlisted',
                    video_id: 'youtube-1',
                }}
            />
        );

        const frame = screen.getByTitle('Первый урок');
        expect(frame).toHaveAttribute('src', 'https://www.youtube.com/embed/youtube-1');
    });

    it('renders nothing when the lesson has no playable video', () => {
        const { container } = render(<LessonVideoPlayer lesson={baseLesson} />);

        expect(container).toBeEmptyDOMElement();
    });
});
