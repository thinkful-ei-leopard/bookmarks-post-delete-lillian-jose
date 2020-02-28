const express = require('express')
const xss = require('xss')
const uuid = require('uuid/v4')
const logger = require('../logger')
const { bookmarks } = require('../store')
const BookmarksService = require('./BookmarksService')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

bookmarkRouter
    .route('/')
    .get((req, res, next) => {
        //retrieving property from app object
        const knexInstance = req.app.get('knexInstance')

        //Using bookmarks service to retrieve list of books.
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks)
            })
            .catch(next)
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body
        const newBookmark = { title, url, rating, description}

        for(const [key, value] of Object.entries(newBookmark)) {
            if(value == null) {
                return res.status(400).json({
                    error: { message: `missing ${key} in request body` }
                })
            }
        }

        if(url.length < 5) {
            return res
                    .status(400)
                    .json({
                        error: { message: `url length must be at least 5 characters in length`}
                    })
        }

        if(Math.floor(rating) > 5 || Math.floor(rating) < 0) {
            return res
                .status(400)
                .json({
                    error: { message: `number must be between 1-5` }
                })
        }

        BookmarksService.insertBookmark(
            req.app.get('knexInstance'),
            newBookmark
        )
            .then(bookmark => {
                res.status(201).location(`/bookmarks/${bookmark.id}`).json(bookmark)
            })
            .catch(next)
    })

bookmarkRouter
    .route('/:id')
    .get((req, res, next) => {
        const knexInstance = req.app.get('knexInstance')    
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
                    return res.status(404).json({
                        error: { message: `bookmark doesn't exist` }
                    })
                }
                res.json({
                    id: bookmark.id,
                    title: xss(bookmark.title),
                    url: xss(bookmark.url),
                    description: xss(bookmark.description),
                    rating: bookmark.rating
                })
            })
            .catch(next)
    })
    .delete((req, res) => {
        const { id } = req.params

        const bookmarkIndex = bookmarks.findIndex( bookmark => bookmark.id == id)

        if(bookmarkIndex === -1) {
            logger.error(`bookmark with id ${id} not found`)
            return res.status(404).send('bookmark not found')
        }

        bookmarks.splice(bookmarkIndex, 1)

        logger.info(`bookmark with id ${id} deleted`)
        res.status(204).end()
    })

    module.exports = bookmarkRouter