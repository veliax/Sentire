import express from 'express'
import db from './database/db_setup.js'


const app = express()
const PORT = process.env.PORT || 5000


app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
})
