import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../database/db_setup.js'

const router = express.Router()

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined")
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

router.post("/register", (req, res) => {
    const { email, name, age, occupation, password } = req.body

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" })
    }

    try {
        const existing = db.prepare(`
            SELECT email FROM Users WHERE Email = ?
        `).get(email)

        if (existing) {
            return res.status(409).json({ error: 'User already exists' })
        }

        const hashedPassword = bcrypt.hashSync(password, 10)

        const insertUser = db.prepare(`
            INSERT INTO Users (Email, Name, Age, Occupation, Password_hash)
            VALUES (?, ?, ?, ?, ?)
        `)

        const result = insertUser.run(email, name, age, occupation, hashedPassword)

        const token = jwt.sign(
            { id: result.lastInsertRowid },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        )


        res.json({ token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Server error' })
    }
})

router.post("/login", (req, res) => {
    const { email, password } = req.body

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
    }

    try {
        const user = db.prepare(`
            SELECT * FROM Users WHERE Email = ?
        `).get(email)

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const passwordIsValid = bcrypt.compareSync(password, user.Password_hash)

        if (!passwordIsValid) {
            return res.status(401).json({ message: "Invalid password" })
        }


        const token = jwt.sign(
            { id: user.Id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        )

        res.json({ token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router

