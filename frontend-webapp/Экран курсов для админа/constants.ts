
import { Course, CourseStatus } from './types';

export const INITIAL_COURSES: Course[] = [
  {
    id: '1',
    title: 'Telegram Mastery 101',
    description: 'Master the art of building community on Telegram.',
    modules: 12,
    status: CourseStatus.PUBLISHED,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0EXZb3C9N3cqkQtk5WxmP4Rz-Uce546YmHHdptVq-z_bh5yyR1_LE6QXMm6mw-_QQQPSa6g-UdvRveEr05PRhOQcVHSGzCJGTBBtq3bu195uNxYqviiRCAN5JCaVyAQrvFBA0z65eTT-WS7RBruGhCD79uAZVdvI0mYtha6Zd4mYuoJ_ox44ejyrqXvMb7Y03AE8uRMqKXIYPHRZ-LpgwAD3jZq7L5DVw3nzzRK1Hm86XT2bSG0cV-QrgyT8d4tfr_-q4nZIAVxGZ'
  },
  {
    id: '2',
    title: 'Growth Hacking Secrets',
    description: 'Advanced strategies for rapid user acquisition.',
    modules: 8,
    status: CourseStatus.DRAFT,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfQA9TqoigIKZluzQm8VgLr-CCVKE51h1u02XiOH6DWRTH1QEV_KxPzA6ctrOTgtI7PQfL7-hnhNj_nk5Dz-X9QKJBUT9PoGxs7hL40k1qiUxv1rvHqEP6G3Qhs9ToUtgBeVZb0kXLC9FkiyFK3Enx86BVXPURTJxESEFQHAJAOo1IKgrmk4paXrG36qG0tq6QsLJ-gTW3keOIJjNSkTdnmNaz2zGM0wZuJ_JrY-xzHM11_rmw_9AwJjEEjBpMyOLMZMikSW7zcE5N'
  },
  {
    id: '3',
    title: 'Monetization 101',
    description: 'How to turn your community into a business.',
    modules: 5,
    status: CourseStatus.PUBLISHED,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDG0-9OcQB2DBQXKoAg5jysb8UuVEY9ytkUGftHubZSAalL4FGsXU8ee2W8HjYRmhsQ6axgc2e3kVqRqDE8wsDpHVq_fqFx9s-twGWubZBT46W2JpvZGDRGSPqjGMCCTiuSvvzpPhmYCAetdJCbs-J1swO3bEQ9gXDtcQpsqyHbpqHnEBQa9C0bREUAj0wmSWyGdRrMWgLYWKlEH29gN82fpgXvJGUqYuKGikKmFbCePnGfZOBhUeFR5vf2iIxayhWd-DxF5hPJxDg'
  }
];
