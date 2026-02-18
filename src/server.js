import express from 'express'
import db from './database/db_setup.js'
import authRoute from '../src/routes/authRoute.js'
import authMiddleware from '../src/middleWares/authMiddleware.js'
import userRoute from '../src/routes/userRoute.js'


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


app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
})
