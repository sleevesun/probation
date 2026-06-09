const PRD_ROOT_PATH = '/prd'

function normalizeHeadingText(text: string) {
  return text.replace(/\[\d+\]/g, ' ').trim()
}

export function getPrdHeadingAnchor(text: string) {
  return normalizeHeadingText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export function getPrdSectionHref(heading: string) {
  return `${PRD_ROOT_PATH}#${getPrdHeadingAnchor(heading)}`
}

export function getAnnotationPagePath(id: number) {
  if ([1, 2, 3, 4].includes(id)) return '/employee/dashboard'
  if ([5, 6].includes(id)) return '/employee/goals'
  if ([7, 8].includes(id)) return '/employee/self-eval'
  if ([9, 10, 11, 12, 121].includes(id)) return '/manager/team'
  if ([13, 14, 15, 16].includes(id)) return '/hrbp/panorama'
  if ([17, 18].includes(id)) return '/approver/center'
  if (id === 19) return '/email-demo'
  if (id === 20) return '/dashboard'
  return '/'
}

export function getAnnotationPageHref(id: number) {
  const path = getAnnotationPagePath(id)
  return `${path}?prd=${id}`
}

export function extractAnnotationIds(text: string) {
  return Array.from(text.matchAll(/\[(\d+)\]/g)).map((match) => Number(match[1]))
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderHeadingWithLinks(level: number, text: string, headingAnchor?: string) {
  const anchor = headingAnchor ?? getPrdHeadingAnchor(text)
  const html = escapeHtml(text).replace(/\[(\d+)\]/g, (_, idText: string) => {
    const id = Number(idText)
    return `<a class="prd-ref-link" href="${getAnnotationPageHref(id)}">[${id}]</a>`
  })
  return `<h${level} id="${anchor}">${html}</h${level}>`
}
