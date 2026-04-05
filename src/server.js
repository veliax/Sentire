import express from 'express'
import db from './database/db_setup.js'
import authRoute from '../src/routes/authRoute.js'
import authMiddleware from '../src/middleWares/authMiddleware.js'
import userRoute from '../src/routes/userRoute.js'
import { CronJob } from 'cron'


const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())

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
