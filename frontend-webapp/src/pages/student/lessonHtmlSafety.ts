import { externalLinkRel } from '../../lib/externalLinks';
import { isSafeLessonMediaAlign, isSafeLessonMediaWidth } from '../../lib/lessonMedia';

const ALLOWED_TAGS = new Set([
    'a',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'hr',
    'i',
    'iframe',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'span',
    'strong',
    'u',
    'ul',
]);

const DROP_WITH_CONTENT_TAGS = new Set([
    'base',
    'embed',
    'form',
    'iframe-placeholder',
    'input',
    'link',
    'meta',
    'object',
    'script',
    'style',
    'svg',
    'template',
]);

const GLOBAL_ATTRIBUTES = new Set([
    'aria-label',
    'data-lesson-id',
    'data-mux-playback-id',
    'data-youtube-video',
    'title',
]);

const MEDIA_DATA_ATTRIBUTES = new Set([
    'data-caption',
    'data-media-align',
    'data-media-width',
]);

const MEDIA_DATA_TAGS = new Set(['div', 'iframe', 'img']);

const ATTRIBUTES_BY_TAG: Record<string, Set<string>> = {
    a: new Set(['href', 'rel', 'target']),
    iframe: new Set(['allow', 'allowfullscreen', 'frameborder', 'height', 'src', 'title', 'width']),
    img: new Set(['alt', 'height', 'loading', 'src', 'title', 'width']),
};

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'tg:']);
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);
const SAFE_FRAME_ORIGINS = new Set(['https://www.youtube.com', 'https://www.youtube-nocookie.com']);

const isSafeDataImage = (url: string) => (
    /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,/i.test(url)
);

const parseUrl = (url: string) => {
    try {
        return new URL(url.replace(/\s+/g, ''), window.location.origin);
    } catch {
        return null;
    }
};

const isSafeLinkUrl = (url: string) => {
    const parsedUrl = parseUrl(url);
    return parsedUrl ? SAFE_LINK_PROTOCOLS.has(parsedUrl.protocol) : false;
};

const isSafeImageUrl = (url: string) => {
    if (isSafeDataImage(url)) return true;

    const parsedUrl = parseUrl(url);
    return parsedUrl ? SAFE_IMAGE_PROTOCOLS.has(parsedUrl.protocol) : false;
};

const isSafeFrameUrl = (url: string) => {
    const parsedUrl = parseUrl(url);
    return parsedUrl
        ? SAFE_FRAME_ORIGINS.has(parsedUrl.origin) && parsedUrl.pathname.startsWith('/embed/')
        : false;
};

const unwrapElement = (element: Element) => {
    const parent = element.parentNode;
    if (!parent) return;

    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
};

const isAllowedAttribute = (tagName: string, attributeName: string) => (
    GLOBAL_ATTRIBUTES.has(attributeName)
    || ATTRIBUTES_BY_TAG[tagName]?.has(attributeName) === true
    || (MEDIA_DATA_TAGS.has(tagName) && MEDIA_DATA_ATTRIBUTES.has(attributeName))
);

const hasControlCharacter = (value: string) => (
    Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 && !['\t', '\n', '\r'].includes(character);
    })
);

const isSafeMediaAttributeValue = (attributeName: string, value: string) => {
    if (attributeName === 'data-media-width') {
        return isSafeLessonMediaWidth(value);
    }

    if (attributeName === 'data-media-align') {
        return isSafeLessonMediaAlign(value);
    }

    if (attributeName === 'data-caption') {
        return value.length > 0 && value.length <= 512 && !hasControlCharacter(value);
    }

    return false;
};

const sanitizeAttributes = (element: Element, tagName: string) => {
    for (const attribute of Array.from(element.attributes)) {
        const attributeName = attribute.name.toLowerCase();
        if (attributeName.startsWith('on') || !isAllowedAttribute(tagName, attributeName)) {
            element.removeAttribute(attribute.name);
            continue;
        }

        if (MEDIA_DATA_ATTRIBUTES.has(attributeName) && !isSafeMediaAttributeValue(attributeName, attribute.value)) {
            element.removeAttribute(attribute.name);
        }
    }

    if (tagName === 'a') {
        const href = element.getAttribute('href');
        if (href && !isSafeLinkUrl(href)) {
            element.removeAttribute('href');
        }

        const target = element.getAttribute('target');
        if (target === '_blank') {
            element.setAttribute('rel', externalLinkRel);
        } else if (target && target !== '_self') {
            element.removeAttribute('target');
        }
    }

    if (tagName === 'img') {
        const src = element.getAttribute('src');
        if (!src || !isSafeImageUrl(src)) {
            element.remove();
        }
    }

    if (tagName === 'iframe') {
        const src = element.getAttribute('src');
        if (!src || !isSafeFrameUrl(src)) {
            element.remove();
        }
    }
};

const sanitizeNode = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.COMMENT_NODE) {
            child.remove();
            continue;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) {
            continue;
        }

        const element = child as Element;
        const tagName = element.tagName.toLowerCase();

        if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
            element.remove();
            continue;
        }

        sanitizeNode(element);

        if (!ALLOWED_TAGS.has(tagName)) {
            unwrapElement(element);
            continue;
        }

        sanitizeAttributes(element, tagName);
    }
};

export const sanitizeLessonHtml = (html: string) => {
    if (!html.trim()) return '';

    const document = new DOMParser().parseFromString(html, 'text/html');
    sanitizeNode(document.body);

    return document.body.innerHTML;
};
