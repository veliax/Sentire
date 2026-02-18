import jwt from 'jsonwebtoken'

function authMiddleware (req, res, next) {
    const authHeader = req.headers['authorization']

    if(!authHeader) {
	return res.status(401).json({message: "No token provided"})
    }

    const token =  authHeader.split(' ')[1]

    if (!token) {
	return res.status(401).json({message: "Malformed token"})
    }

    try{
	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
	    if (err) {return res.status(401).json({message: "Invalid token"})}
	    req.userId = decoded.id
	    next()
	})
    } catch (err) {
	console.error(err)
	return res.status(500).json({message: "Server error"})
    }
}

export default authMiddleware

