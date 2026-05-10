import 'dotenv/config'
import express from 'express'
import db from './database/db_setup.js'
import authRoute from '../src/routes/authRoute.js'
import authMiddleware from '../src/middleWares/authMiddleware.js'
import userRoute from '../src/routes/userRoute.js'
import reportRoute from './routes/reportRoute.js'
import { CronJob } from 'cron'
import videoRoute from './routes/videoRoute.js'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

console.log('GEMINI key loaded:', process.env.GEMINI_API_KEY ? 'yes' : 'no')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:3000'
}))

app.use(express.json())

// Serve video files statically
app.use('/Videos', express.static(path.join(__dirname, '../Videos')))
// User Endpoints
app.get('/', (req, res) => {
    res.send('<h1>homepage</h1>')
})
app.get('/login', (req, res) => {
    res.send('<h1>login</h1>')
})
app.get('/signup', (req, res) => {
    res.send('<h1>signup</h1>')
})

// Api Endpoints
app.use('/api/auth', authRoute)
app.use('/api/user', authMiddleware, userRoute)
app.use('/api/video', authMiddleware, videoRoute)
app.use('/api/video', authMiddleware, reportRoute)   // POST/GET /api/video/:id/report, GET /api/video/:id/report/pdf
app.use('/api/reports', authMiddleware, reportRoute) // GET /api/reports (list)

const deleteFromDb = CronJob.from({
    cronTime: '0 0 0 * * *',
    onTick: function () {
        console.log('CronJob: Deleting users')
        const check_deleted = db.prepare(`
            SELECT Id FROM Users 
            WHERE Is_deleted = 1 AND Date_deleted <= DATETIME('now', '-1 year')
        `).all()
        if (check_deleted.length === 0) {
            console.log('CronJob: No users to delete')
            return;
        }
        const deleteTransaction = db.transaction((users) => {
            const deleteUser = db.prepare(`DELETE FROM Users WHERE Id = ?`)
            for (const { Id } of users) {
                deleteUser.run(Id)
                console.log('Deleted user: ' + Id)
            }
        })
        try {
            deleteTransaction(check_deleted)
        } catch (error) {
            console.error(error)
        }
    },
    start: true,
})

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
})
