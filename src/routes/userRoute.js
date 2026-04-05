import express from 'express'
import db from '../database/db_setup.js'
const router = express.Router()
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

router.get('/profile', (req, res) => {
    const user_id = req.userId
    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id' })
    }
    try {
        const getUserInfo = db.prepare(`SELECT email, name, age, occupation FROM Users WHERE id = ?`)
        const result = getUserInfo.get(user_id)
        if (!result) {
            return res.status(404).json({ error: 'Failed to get user info' })
        } else {
            return res.status(200).json(result)
        }
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Server error' })
    }
})

// Redundant as the users account is created within /register
router.post('/profile', (req, res) => {
    res.status(405).json({ error: 'Method not allowed' })
})

router.put('/profile', (req, res) => {
    const user_id = req.userId
    if (!user_id) {
        return res.status(400).json({ error: 'Missing user_id' })
    }

    const { email, name, age, occupation } = req.body
    const missingFields = []

    // Fix 1: was missing.Fields (typo) — now missingFields
    if (!email) { missingFields.push("email") }
    if (!name) { missingFields.push("name") }
    if (age === undefined || age === null || age === '') { missingFields.push("age") }
    if (!occupation) { missingFields.push("occupation") }

    if (missingFields.length) {
        return res.status(400).json({ error: 'Missing fields', fields: missingFields })
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
    }

    // Fix 3: validate age is a positive number
    if (isNaN(age) || Number(age) <= 0) {
        return res.status(400).json({ error: 'Invalid age' })
    }

    try {
        const emailExists = db.prepare(
            `SELECT email FROM Users WHERE email = ? AND Id != ?`
        ).get(email, user_id)

        if (emailExists) {
            return res.status(409).json({ error: 'Email already exists' })
        }

        const updateUserInfo = db.prepare(
            `UPDATE Users SET email = ?, name = ?, age = ?, occupation = ? WHERE id = ?`
        )
        const result = updateUserInfo.run(email, name, age, occupation, user_id)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Failed to update' })
        }

        return res.status(200).json({ success: 'User has been updated' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: 'Server error' })
    }
})

export default router
