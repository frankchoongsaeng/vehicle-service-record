type EmailAction = {
    label: string
    url: string
}

type RenderEmailLayoutInput = {
    previewText: string
    categoryLabel: string
    title: string
    intro: string
    bodyHtml: string
    action?: EmailAction
    actionHint?: string
    brandImageUrl?: string
    footerNote: string
}

const EMAIL_COLORS = {
    background: '#f3f7fb',
    surface: '#ffffff',
    foreground: '#253247',
    muted: '#66758a',
    border: '#d8e1ea',
    primary: '#37c978',
    primaryDark: '#21995a',
    primaryTint: '#eaf9f0',
    secondaryTint: '#edf4fb',
    shadow: '0 18px 45px rgba(37, 50, 71, 0.12)'
} as const

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function buildParagraphBlock(lines: string[]): string {
    return lines
        .map(
            line =>
                `<p style="margin:0 0 14px; font-size:16px; line-height:1.7; color:${
                    EMAIL_COLORS.foreground
                };">${escapeHtml(line)}</p>`
        )
        .join('')
}

export function buildCalloutCard(title: string, lines: string[]): string {
    const content = lines
        .map(
            line =>
                `<p style="margin:0 0 10px; font-size:14px; line-height:1.6; color:${
                    EMAIL_COLORS.foreground
                };">${escapeHtml(line)}</p>`
        )
        .join('')

    return [
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0; border-collapse:separate; border-spacing:0; background:${EMAIL_COLORS.secondaryTint}; border:1px solid ${EMAIL_COLORS.border}; border-radius:18px;">`,
        '<tr>',
        `<td style="padding:18px 20px;">`,
        `<p style="margin:0 0 12px; font-size:12px; line-height:1.4; letter-spacing:0.12em; text-transform:uppercase; font-weight:700; color:${
            EMAIL_COLORS.muted
        };">${escapeHtml(title)}</p>`,
        content,
        '</td>',
        '</tr>',
        '</table>'
    ].join('')
}

export function buildBulletList(items: string[]): string {
    return [
        `<ul style="margin:16px 0 0; padding:0 0 0 20px; color:${EMAIL_COLORS.foreground};">`,
        ...items.map(item => `<li style="margin:0 0 10px; font-size:15px; line-height:1.6;">${escapeHtml(item)}</li>`),
        '</ul>'
    ].join('')
}

function normalizeOrigin(origin: string): string {
    return origin.replace(/\/+$/, '')
}

function tryBuildBrandImageUrl(origin: string): string | null {
    try {
        return new URL('/duralog_logo_traced.svg', normalizeOrigin(origin)).toString()
    } catch {
        return null
    }
}

function resolveBrandImageUrl(input: RenderEmailLayoutInput): string | null {
    if (input.brandImageUrl) {
        return input.brandImageUrl
    }

    const configuredOrigin = process.env.APP_ORIGIN?.trim()
    if (configuredOrigin) {
        return tryBuildBrandImageUrl(configuredOrigin)
    }

    if (input.action?.url) {
        try {
            return tryBuildBrandImageUrl(new URL(input.action.url).origin)
        } catch {
            return null
        }
    }

    return null
}

export function renderEmailLayout(input: RenderEmailLayoutInput): string {
    const brandImageUrl = resolveBrandImageUrl(input)
    const actionMarkup = input.action
        ? [
              '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">',
              '<tr>',
              `<td align="center" bgcolor="${EMAIL_COLORS.primary}" style="border-radius:999px;">`,
              `<a href="${escapeHtml(
                  input.action.url
              )}" style="display:inline-block; padding:14px 24px; font-size:15px; font-weight:700; line-height:1; color:#ffffff; text-decoration:none;">${escapeHtml(
                  input.action.label
              )}</a>`,
              '</td>',
              '</tr>',
              '</table>'
          ].join('')
        : ''

    const brandMarkMarkup = brandImageUrl
        ? [
              `<div style="display:inline-block; padding:12px; border-radius:20px; background:${EMAIL_COLORS.primaryTint}; border:1px solid ${EMAIL_COLORS.border};">`,
              `<img src="${escapeHtml(
                  brandImageUrl
              )}" alt="Duralog" width="64" height="64" style="display:block; width:64px; height:64px; object-fit:contain;" />`,
              '</div>'
          ].join('')
        : `<div style="width:42px; height:42px; border-radius:14px; background:${EMAIL_COLORS.primary}; color:#ffffff; font-size:20px; font-weight:800; line-height:42px; text-align:center;">D</div>`

    const actionHintMarkup =
        input.action && input.actionHint
            ? `<p style="margin:18px 0 0; font-size:13px; line-height:1.7; color:${EMAIL_COLORS.muted};">${escapeHtml(
                  input.actionHint
              )}</p>`
            : ''

    const fallbackLinkMarkup = input.action
        ? [
              `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0; border-collapse:separate; border-spacing:0; background:${EMAIL_COLORS.primaryTint}; border:1px solid ${EMAIL_COLORS.border}; border-radius:16px;">`,
              '<tr>',
              `<td style="padding:16px 18px;">`,
              `<p style="margin:0 0 8px; font-size:12px; line-height:1.4; letter-spacing:0.08em; text-transform:uppercase; font-weight:700; color:${EMAIL_COLORS.primaryDark};">Button not working?</p>`,
              `<p style="margin:0; font-size:13px; line-height:1.7; word-break:break-word;"><a href="${escapeHtml(
                  input.action.url
              )}" style="color:${EMAIL_COLORS.primaryDark}; text-decoration:underline;">${escapeHtml(
                  input.action.url
              )}</a></p>`,
              '</td>',
              '</tr>',
              '</table>'
          ].join('')
        : ''

    return [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `<title>${escapeHtml(input.title)}</title>`,
        '</head>',
        `<body style="margin:0; padding:0; background:${EMAIL_COLORS.background}; font-family:'IBM Plex Sans','Segoe UI','Helvetica Neue',Arial,sans-serif; color:${EMAIL_COLORS.foreground};">`,
        `<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">${escapeHtml(
            input.previewText
        )}</span>`,
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7fb;">',
        '<tr>',
        '<td align="center" style="padding:32px 16px;">',
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; border-collapse:separate; border-spacing:0;">`,
        '<tr>',
        `<td style="padding:0 0 18px; font-size:14px; line-height:1.4; color:${EMAIL_COLORS.muted};">`,
        `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`,
        '<tr>',
        `<td style="padding:0 12px 0 0; vertical-align:middle;">`,
        brandMarkMarkup,
        '</td>',
        '<td style="vertical-align:middle;">',
        `<div style="font-size:20px; line-height:1.2; font-weight:800; color:${EMAIL_COLORS.foreground};">Duralog</div>`,
        `<div style="margin-top:4px; font-size:12px; line-height:1.4; letter-spacing:0.1em; text-transform:uppercase; color:${EMAIL_COLORS.muted};">vehicle service records</div>`,
        '</td>',
        '</tr>',
        '</table>',
        '</td>',
        '</tr>',
        '<tr>',
        `<td style="background:${EMAIL_COLORS.surface}; border:1px solid ${EMAIL_COLORS.border}; border-radius:28px; box-shadow:${EMAIL_COLORS.shadow}; overflow:hidden;">`,
        `<div style="height:8px; background:linear-gradient(90deg, ${EMAIL_COLORS.primary} 0%, #8ae8b0 100%);"></div>`,
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">',
        '<tr>',
        '<td style="padding:32px 32px 12px;">',
        `<div style="display:inline-block; margin:0 0 18px; padding:8px 12px; border-radius:999px; background:${
            EMAIL_COLORS.secondaryTint
        }; color:${
            EMAIL_COLORS.muted
        }; font-size:12px; line-height:1; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">${escapeHtml(
            input.categoryLabel
        )}</div>`,
        `<h1 style="margin:0 0 14px; font-size:32px; line-height:1.2; font-weight:800; color:${
            EMAIL_COLORS.foreground
        };">${escapeHtml(input.title)}</h1>`,
        `<p style="margin:0; font-size:17px; line-height:1.7; color:${EMAIL_COLORS.muted};">${escapeHtml(
            input.intro
        )}</p>`,
        '</td>',
        '</tr>',
        '<tr>',
        '<td style="padding:0 32px 32px;">',
        input.bodyHtml,
        actionMarkup,
        actionHintMarkup,
        fallbackLinkMarkup,
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0; border-collapse:separate; border-spacing:0; border-top:1px solid ${EMAIL_COLORS.border};">`,
        '<tr>',
        `<td style="padding:22px 0 0; font-size:13px; line-height:1.8; color:${EMAIL_COLORS.muted};">${escapeHtml(
            input.footerNote
        )}</td>`,
        '</tr>',
        '</table>',
        '</td>',
        '</tr>',
        '</table>',
        '</td>',
        '</tr>',
        '<tr>',
        `<td style="padding:18px 20px 0; text-align:center; font-size:12px; line-height:1.7; color:${EMAIL_COLORS.muted};">Duralog keeps your maintenance history, reminders, and vehicle details in one place.</td>`,
        '</tr>',
        '</table>',
        '</td>',
        '</tr>',
        '</table>',
        '</body>',
        '</html>'
    ].join('')
}
