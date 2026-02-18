import express from 'express'
import db from '../database/db_setup.js'

const router = express.Router()
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

router.get('/profile', (req,res) => {
    const user_id = req.userId
    if(!user_id) {
	return res.status(400).json({error: 'Missing user_id'})
    }

    try { 
	const getUserInfo = db.prepare(`SELECT email, name, age, occupation FROM Users WHERE id = ?`)
	const result = getUserInfo.get(user_id)

	if(!result) {
	    return res.status(404).json({error: 'Failed to get user info'})
	} else {
	    return res.status(200).json(result)
	}

    } catch (err) { 
	console.error(err)
	return res.status(500).json({error: 'Server error'})
    }
})

export default router

