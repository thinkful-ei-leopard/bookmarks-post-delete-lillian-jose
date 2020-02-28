require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV} = require('./config')
const bookmarkRouter = require('./bookmarks/bookmarks-router')

const app = express()

const morganOption = (NODE_ENV === 'production')
? 'tiny'
: 'common';

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())

// AUTH MIDDLEWARE NOT IN USE BELOW

// app.use(function validateBearerToken(req, res, next) {
//     const apiToken = process.env.API_TOKEN
//     const authToken = req.get('Authorization')

//     if(!authToken || authToken.split(' ')[1] !== apiToken) {
//         logger.error(`Unauth request to path: ${req.path}`)
//         return res.status(401).json({ error: 'unauth access' })
//     }

//     next()
// })

//Route
app.use('/api/bookmarks', bookmarkRouter)


app.get('/', (req, res) => {
    res.send('Hello, World!')
})

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.log(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
})

module.exports = app