import express from 'express'
import multer from 'multer'
import fs from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'
import { spawn } from 'child_process'
import db from '../database/db_setup.js'

const router = express.Router()
const execPromise = promisify(exec)

const upload = multer({
  dest: 'tmp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/mp4') {
      cb(null, true)
    } else {
      cb(new Error('Only MP4 files are supported'))
    }
  }
})

// --- Pipeline runners --------------------------------------------------------

function runPython(script, args) {
    return new Promise((resolve, reject) => {
        const python = spawn('./venv/bin/python', [script, ...args])

        let stdout = ''
        let stderr = ''

        python.stdout.on('data', (data) => { stdout += data.toString() })
        python.stderr.on('data', (data) => {
            const text = data.toString()
            stderr += text
            // Mirror python stderr to node stderr so logs line up while debugging
            process.stderr.write(`[${script}] ${text}`)
        })

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`${script} exited with code ${code}: ${stderr}`))
                return
            }
            // The python scripts print a single JSON object on the LAST line of stdout.
            // Use the last non-empty line so any earlier prints don't break parsing.
            const lines = stdout.trim().split('\n').filter(Boolean)
            const last = lines[lines.length - 1] || ''
            try {
                resolve(JSON.parse(last))
            } catch (err) {
                reject(new Error(`Failed to parse ${script} output: ${last.slice(0, 200)}`))
            }
        })
    })
}

function runDetection(filePath, videoId) {
    return runPython('src/pipeline/detect.py', [filePath, videoId.toString()])
}

function runVlm(filePath, videoId) {
    return runPython('src/pipeline/vlm.py', [filePath, videoId.toString()])
}

// --- Helpers -----------------------------------------------------------------

/**
 * Convert an "MM:SS" offset string + ISO base timestamp into an ISO timestamp.
 * Falls back to the base timestamp on parse failure.
 */
function offsetToIso(mmss, baseIso) {
    if (typeof mmss !== 'string') return baseIso
    const m = /^(\d{1,2}):(\d{2})$/.exec(mmss.trim())
    if (!m) return baseIso
    const seconds = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
    return new Date(new Date(baseIso).getTime() + seconds * 1000).toISOString()
}

function insertEvents(videoId, events, videoTimeStart) {
    if (!events || events.length === 0) return 0

    const insert = db.prepare(`
        INSERT INTO Events (Video_id, Sequence_number, Severity, Description, Event_start, Event_end, Duration)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction((rows) => {
        for (const ev of rows) {
            const startIso = offsetToIso(ev.event_start, videoTimeStart)
            const endIso   = offsetToIso(ev.event_end, videoTimeStart)
            const duration = Math.max(
                0,
                Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000)
            )
            insert.run(
                videoId,
                ev.sequence_number,
                ev.severity,
                ev.description,
                startIso,
                endIso,
                duration,
            )
        }
    })

    tx(events)
    return events.length
}

// --- Routes ------------------------------------------------------------------

router.post('/upload', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
    }
    try {
        const user_id = req.userId
        const time_start = new Date().toISOString()

        const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${req.file.path}"`
        )
        const duration = Math.round(parseFloat(stdout))
        const time_end = new Date(Date.now() + duration * 1000).toISOString()

        const insert = db.prepare(`
            INSERT INTO Videos (User_id, Name, File_path, Location, Duration, Status, Time_start, Time_end)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `)
        const result = insert.run(user_id, null, null, null, duration, time_start, time_end)
        const video_id = result.lastInsertRowid

        const date = new Date().toISOString().split('T')[0]
        const videoName = `Video_${video_id}`
        const parentDir = `Videos/video_${video_id}_${date}`
        const filePath = `${parentDir}/${videoName}.mp4`

        fs.mkdirSync(`${parentDir}/directory2`, { recursive: true })
        fs.mkdirSync(`${parentDir}/directory3`, { recursive: true })
        fs.renameSync(req.file.path, filePath)

        db.prepare(`UPDATE Videos SET Name = ?, File_path = ? WHERE Id = ?`)
            .run(videoName, filePath, video_id)

        // Send response immediately
        res.status(200).json({
            success: 'Video uploaded, processing started',
            video_id,
            name: videoName,
            file_path: filePath,
            duration,
            time_start,
            time_end
        })

        // --- Background pipeline: detect -> vlm -> insert events ---
        db.prepare(`UPDATE Videos SET Status = 'processing' WHERE Id = ?`).run(video_id)

        runDetection(filePath, video_id)
            .then(async (detectResult) => {
                console.log(`Detection complete for video ${video_id}`)
                db.prepare(`UPDATE Videos SET Processed_path = ? WHERE Id = ?`)
                    .run(detectResult.processed_video, video_id)

                // Run VLM stage. We send the original (raw) video — Gemini doesn't
                // need the burned-in boxes; it gets grounding from llm_input.json.
                const vlmResult = await runVlm(filePath, video_id)
                const inserted = insertEvents(video_id, vlmResult.events, time_start)
                console.log(`VLM complete for video ${video_id}: ${inserted} events inserted`)

                db.prepare(`UPDATE Videos SET Status = 'done' WHERE Id = ?`).run(video_id)
            })
            .catch((err) => {
                console.error(`Pipeline failed for video ${video_id}:`, err)
                db.prepare(`UPDATE Videos SET Status = 'error' WHERE Id = ?`).run(video_id)
            })

    } catch (err) {
        console.error(err)
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path)
        }
        return res.status(500).json({ error: 'Server error' })
    }
})

router.get('/', async (req, res) => {
    try {
        const user_id = req.userId
        const videos = db.prepare(`
            SELECT Id, Name, File_path, Processed_path, Location, Duration, Status, Time_start, Time_end 
            FROM Videos
            WHERE User_id = ?
            ORDER BY Time_start DESC
        `).all(user_id)
        return res.status(200).json(videos)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Server error' })
    }
})

router.get('/:id', async (req, res) => {
    try {
        const user_id = req.userId
        const video = db.prepare(`
            SELECT Id, Name, File_path, Processed_path, Location, Duration, Status, Time_start, Time_end 
            FROM Videos
            WHERE Id = ? AND User_id = ?
        `).get(req.params.id, user_id)

        if (!video) return res.status(404).json({ error: 'Video not found' })

        const events = db.prepare(`
            SELECT Sequence_number, Severity, Description, Event_start, Event_end, Duration
            FROM Events
            WHERE Video_id = ?
            ORDER BY Sequence_number ASC
        `).all(req.params.id)

        return res.status(200).json({ ...video, events })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Server error' })
    }
})

export default router
