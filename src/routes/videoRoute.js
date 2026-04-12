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

function runDetection(filePath, videoId) {
    return new Promise((resolve, reject) => {
        const python = spawn('./venv/bin/python', [
            'src/pipeline/detect.py',
            filePath,
            videoId.toString()
        ])

        let output = ''

        python.stdout.on('data', (data) => {
            output += data.toString()
        })

        python.stderr.on('data', (data) => {
            console.error('Detection stderr:', data.toString())
        })

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Detection process exited with code ${code}`))
                return
            }
            try {
                const result = JSON.parse(output)
                resolve(result)
            } catch (err) {
                reject(new Error('Failed to parse detection output'))
            }
        })
    })
}

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

        // Run detection in background
        db.prepare(`UPDATE Videos SET Status = 'processing' WHERE Id = ?`).run(video_id)

        runDetection(filePath, video_id)
            .then((result) => {
                console.log(`Detection complete for video ${video_id}`)
                db.prepare(`UPDATE Videos SET Processed_path = ?, Status = 'done' WHERE Id = ?`)
                    .run(result.processed_video, video_id)
                console.log(`Processed video saved: ${result.processed_video}`)
            })
            .catch((err) => {
                console.error(`Detection failed for video ${video_id}:`, err)
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
            SELECT Sequence_number, Severity, Description, Event_start, Event_end
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
