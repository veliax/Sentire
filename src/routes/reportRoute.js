import express from 'express'
import path from 'path'
import { spawn } from 'child_process'
import puppeteer from 'puppeteer'
import db from '../database/db_setup.js'

const router = express.Router()

// --- Helper: spawn report.py and parse its JSON output -----------------------

function runReportScript(videoDir, videoId, videoName, location) {
    return new Promise((resolve, reject) => {
        const python = spawn('./venv/bin/python', [
            'src/pipeline/report.py',
            videoDir,
            videoId.toString(),
            videoName || `Video ${videoId}`,
            location || '',
        ])

        let stdout = ''
        let stderr = ''

        python.stdout.on('data', (data) => { stdout += data.toString() })
        python.stderr.on('data', (data) => {
            const text = data.toString()
            stderr += text
            process.stderr.write(`[report.py] ${text}`)
        })

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`report.py exited with code ${code}: ${stderr}`))
                return
            }
            const lines = stdout.trim().split('\n').filter(Boolean)
            const last = lines[lines.length - 1] || ''
            try {
                resolve(JSON.parse(last))
            } catch (err) {
                reject(new Error(`Failed to parse report.py output: ${last.slice(0, 200)}`))
            }
        })
    })
}

// --- Helper: load video + its events for the current user --------------------

function loadVideoWithEvents(videoId, userId) {
    const video = db.prepare(`
        SELECT Id, Name, File_path, Processed_path, Location, Duration, Status, Time_start, Time_end
        FROM Videos
        WHERE Id = ? AND User_id = ?
    `).get(videoId, userId)

    if (!video) return null

    const events = db.prepare(`
        SELECT Sequence_number, Severity, Description, Event_start, Event_end, Duration
        FROM Events
        WHERE Video_id = ?
        ORDER BY Sequence_number ASC
    `).all(videoId)

    return { ...video, events }
}

// --- POST /api/video/:id/report — generate (or regenerate) the report -------

router.post('/:id/report', async (req, res) => {
    try {
        const userId = req.userId
        const videoId = parseInt(req.params.id, 10)
        const video = loadVideoWithEvents(videoId, userId)
        if (!video) return res.status(404).json({ error: 'Video not found' })

        if (video.Status !== 'done') {
            return res.status(409).json({
                error: `Video is not ready for reporting (status=${video.Status})`,
            })
        }

        const videoDir = path.dirname(video.File_path)
        const result = await runReportScript(
            videoDir,
            videoId,
            video.Name,
            video.Location ?? '',
        )

        // Upsert: one report per video (Video_id has UNIQUE constraint).
        db.prepare(`
            INSERT INTO Reports (Video_id, Narrative, Stats_json)
            VALUES (?, ?, ?)
            ON CONFLICT(Video_id) DO UPDATE SET
                Narrative = excluded.Narrative,
                Stats_json = excluded.Stats_json,
                Generated_at = CURRENT_TIMESTAMP
        `).run(videoId, result.narrative, JSON.stringify(result.stats))

        const saved = db.prepare(`
            SELECT Id, Video_id, Narrative, Stats_json, Generated_at
            FROM Reports WHERE Video_id = ?
        `).get(videoId)

        return res.status(200).json({
            ...saved,
            Stats: JSON.parse(saved.Stats_json),
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: err.message || 'Server error' })
    }
})

// --- GET /api/video/:id/report — fetch the cached report -------------------

router.get('/:id/report', (req, res) => {
    try {
        const userId = req.userId
        const videoId = parseInt(req.params.id, 10)
        const video = loadVideoWithEvents(videoId, userId)
        if (!video) return res.status(404).json({ error: 'Video not found' })

        const report = db.prepare(`
            SELECT Id, Video_id, Narrative, Stats_json, Generated_at
            FROM Reports WHERE Video_id = ?
        `).get(videoId)

        if (!report) return res.status(404).json({ error: 'No report generated yet' })

        return res.status(200).json({
            ...report,
            Stats: JSON.parse(report.Stats_json),
            Video: {
                Id: video.Id,
                Name: video.Name,
                Location: video.Location,
                Duration: video.Duration,
                Time_start: video.Time_start,
                Time_end: video.Time_end,
            },
            Events: video.events,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Server error' })
    }
})

// --- GET /api/video/:id/report/pdf — render the report as a PDF -------------

function renderReportHtml({ video, report, events, stats }) {
    const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '—'
    const severityColor = { high: '#dc2626', medium: '#d97706', low: '#16a34a' }

    const eventRows = events.map((ev) => `
        <tr>
            <td>${ev.Sequence_number}</td>
            <td><span class="sev sev-${ev.Severity}">${ev.Severity.toUpperCase()}</span></td>
            <td>${formatDate(ev.Event_start)}</td>
            <td>${formatDate(ev.Event_end)}</td>
            <td>${ev.Duration ?? 0}s</td>
            <td>${escapeHtml(ev.Description ?? '')}</td>
        </tr>
    `).join('')

    const objectRows = Object.entries(stats.object_class_counts || {}).map(
        ([cls, n]) => `<tr><td>${escapeHtml(cls)}</td><td>${n}</td></tr>`
    ).join('') || '<tr><td colspan="2" class="muted">No detections</td></tr>'

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sentire Report — ${escapeHtml(video.Name)}</title>
<style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #111;
        line-height: 1.5;
        font-size: 11pt;
        margin: 0;
    }
    header {
        border-bottom: 2px solid #111;
        padding-bottom: 12pt;
        margin-bottom: 18pt;
    }
    header .brand {
        font-size: 9pt;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #6b7280;
    }
    header h1 {
        font-size: 22pt;
        margin: 4pt 0 2pt;
    }
    header .subtitle {
        color: #4b5563;
        font-size: 10pt;
    }
    h2 {
        font-size: 13pt;
        margin: 18pt 0 6pt;
        padding-bottom: 4pt;
        border-bottom: 1px solid #e5e7eb;
    }
    .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6pt 18pt;
        font-size: 10pt;
    }
    .meta-grid .label {
        color: #6b7280;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }
    .meta-grid .value { font-weight: 500; }
    .narrative {
        white-space: pre-wrap;
        text-align: justify;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5pt;
        margin-top: 6pt;
    }
    th, td {
        text-align: left;
        padding: 6pt 8pt;
        border-bottom: 1px solid #e5e7eb;
        vertical-align: top;
    }
    th {
        background: #f9fafb;
        font-weight: 600;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #374151;
    }
    .sev {
        display: inline-block;
        padding: 2pt 6pt;
        border-radius: 3pt;
        font-size: 8.5pt;
        font-weight: 600;
        color: white;
    }
    .sev-high   { background: ${severityColor.high}; }
    .sev-medium { background: ${severityColor.medium}; }
    .sev-low    { background: ${severityColor.low}; }
    .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10pt;
        margin-top: 6pt;
    }
    .stat-card {
        border: 1px solid #e5e7eb;
        border-radius: 4pt;
        padding: 8pt 10pt;
    }
    .stat-card .label {
        font-size: 8pt;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }
    .stat-card .value {
        font-size: 18pt;
        font-weight: 600;
        margin-top: 2pt;
    }
    .stat-card.high   .value { color: ${severityColor.high}; }
    .stat-card.medium .value { color: ${severityColor.medium}; }
    .stat-card.low    .value { color: ${severityColor.low}; }
    .muted { color: #9ca3af; }
    footer {
        margin-top: 24pt;
        padding-top: 10pt;
        border-top: 1px solid #e5e7eb;
        font-size: 8.5pt;
        color: #6b7280;
        text-align: center;
    }
</style>
</head>
<body>
    <header>
        <div class="brand">Sentire · Surveillance Incident Report</div>
        <h1>${escapeHtml(video.Name)}</h1>
        <div class="subtitle">
            Generated ${formatDate(report.Generated_at)}
        </div>
    </header>

    <h2>Video metadata</h2>
    <div class="meta-grid">
        <div><div class="label">Location</div><div class="value">${escapeHtml(video.Location ?? '—')}</div></div>
        <div><div class="label">Duration</div><div class="value">${video.Duration ?? 0} seconds</div></div>
        <div><div class="label">Recording start</div><div class="value">${formatDate(video.Time_start)}</div></div>
        <div><div class="label">Recording end</div><div class="value">${formatDate(video.Time_end)}</div></div>
    </div>

    <h2>Statistics</h2>
    <div class="stats-row">
        <div class="stat-card">
            <div class="label">Frames analyzed</div>
            <div class="value">${stats.total_frames_analyzed ?? 0}</div>
        </div>
        <div class="stat-card high">
            <div class="label">High severity</div>
            <div class="value">${stats.severity_counts?.high ?? 0}</div>
        </div>
        <div class="stat-card medium">
            <div class="label">Medium severity</div>
            <div class="value">${stats.severity_counts?.medium ?? 0}</div>
        </div>
        <div class="stat-card low">
            <div class="label">Low severity</div>
            <div class="value">${stats.severity_counts?.low ?? 0}</div>
        </div>
    </div>

    <h2>Object detections</h2>
    <table>
        <thead><tr><th>Class</th><th>Detections</th></tr></thead>
        <tbody>${objectRows}</tbody>
    </table>

    <h2>Narrative summary</h2>
    <div class="narrative">${escapeHtml(report.Narrative)}</div>

    <h2>Event log</h2>
    <table>
        <thead>
            <tr>
                <th>#</th><th>Severity</th><th>Start</th><th>End</th><th>Duration</th><th>Description</th>
            </tr>
        </thead>
        <tbody>
            ${eventRows || '<tr><td colspan="6" class="muted">No events detected.</td></tr>'}
        </tbody>
    </table>

    <footer>
        Sentire Event-Driven Detection System &middot; Confidential
    </footer>
</body>
</html>`
}

function escapeHtml(str) {
    if (str == null) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

router.get('/:id/report/pdf', async (req, res) => {
    let browser
    try {
        const userId = req.userId
        const videoId = parseInt(req.params.id, 10)
        const video = loadVideoWithEvents(videoId, userId)
        if (!video) return res.status(404).json({ error: 'Video not found' })

        const report = db.prepare(`
            SELECT Id, Video_id, Narrative, Stats_json, Generated_at
            FROM Reports WHERE Video_id = ?
        `).get(videoId)
        if (!report) return res.status(404).json({ error: 'No report generated yet' })

        const stats = JSON.parse(report.Stats_json)
        const html = renderReportHtml({
            video,
            report,
            events: video.events,
            stats,
        })

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
        })
        await browser.close()
        browser = null

        const safeName = (video.Name || `report_${videoId}`).replace(/[^a-z0-9_\-]/gi, '_')
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.pdf"`)
        return res.end(pdfBuffer)
    } catch (err) {
        console.error(err)
        if (browser) {
            try { await browser.close() } catch {}
        }
        return res.status(500).json({ error: err.message || 'Server error' })
    }
})

// --- GET /api/reports — list all reports for the current user ---------------

router.get('/', (req, res) => {
    try {
        const userId = req.userId
        const rows = db.prepare(`
            SELECT
                r.Id, r.Video_id, r.Generated_at,
                v.Name, v.Location, v.Duration, v.Time_start
            FROM Reports r
            JOIN Videos v ON v.Id = r.Video_id
            WHERE v.User_id = ?
            ORDER BY r.Generated_at DESC
        `).all(userId)
        return res.status(200).json(rows)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Server error' })
    }
})

export default router
