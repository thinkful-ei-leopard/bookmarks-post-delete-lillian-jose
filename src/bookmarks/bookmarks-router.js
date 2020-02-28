const path = require('path')
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
                res.status(201).location(path.posix.join(req.originalUrl + `/${bookmark.id}`)).json(bookmark)
            })
            .catch(next)
    })

bookmarkRouter
    .route('/:id')
    .all((req, res, next) => {
        BookmarksService.getById(
            req.app.get('knexInstance'),
            req.params.id
        )
        .then(bookmark => {
            if (!bookmark) {
                return res.status(404).json({
                    error: { message: `bookmark doesn't exist` }
                })
            }
            res.bookmark = bookmark
            next()
        })
        .catch(next)
    })
    .get((req, res, next) => {
        res.json({
            id: res.bookmark.id,
            title: xss(res.bookmark.title),
            url: res.bookmark.url,
            description: xss(res.bookmark.description),
            rating: res.bookmark.rating
        })
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('knexInstance')

        BookmarksService.deleteBookmark(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
                    return res.status(404).json({
                        error: { message: `bookmark doesn't exist` }
                    })
                }
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, rating, description} = req.body
        const bookmarkToUpdate = { title, url, rating, description}

        BookmarksService.updateBookmark(
            req.app.get('knexInstance'),
            req.params.id,
            bookmarkToUpdate
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })

    module.exports = bookmarkRouter