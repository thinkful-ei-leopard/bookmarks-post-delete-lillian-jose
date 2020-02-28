const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmark.fixtures')



describe.only('Bookmarks Endpoints', function() {
    let knexInstance

    before('make knex instance before tests', () => {
        knexInstance = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('knexInstance', knexInstance)
    })

    after('disconnect from knex Instance after testing', () => knexInstance.destroy())

    before('clean the bookmark table before testing', () => { 
        return knexInstance('bookmarks_table').truncate() })

    afterEach('clean the bookmarks table of data', () => { 
        return knexInstance('bookmarks_table').truncate() })
    
    describe(`GET /api/bookmarks`, () => {

        context(`Given no bookmarks`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, [])
            })
        })

        context(`Given there are bookmarks in the database.`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return knexInstance
                    .into('bookmarks_table')
                    .insert(testBookmarks)
            })

            it(`GET /api/bookmarks responds with 200 and all bookmarks are returned`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, testBookmarks)
            })
        })
    })


    describe(`GET /api/bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .expect(404, { error: { message: `bookmark doesn't exist` } })
            })
        })
        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return knexInstance
                    .into('bookmarks_table')
                    .insert(testBookmarks)
            })

            it(`Get /api/bookmarks/:id responds with 200 and the specified bookmark`, () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .expect(200, expectedBookmark)
            })
        })

        context(`Given an xss attack bookmark`, () => {
            const maliciousBookmark = {
                id: 911,
                title: `Naughty naughty very naughty <script>alert("xss");</script>`,
                url: "www.naughty.com",
                description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                rating: 1
            }

            beforeEach(`insert malicious bookmark`, () => {
                return knexInstance
                    .into('bookmarks_table')
                    .insert([maliciousBookmark])
            })

            it('removes xss attack content', () => {
                return supertest(app)
                        .get(`/api/bookmarks/${maliciousBookmark.id}`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                            expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
                        })
            })
        })
    })

    describe(`Post /api/bookmarks`, () => {
        it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
            this.retries(3)
            const newBookmark = {
                title: "twitter",
                url: "www.twitter.com",
                description: "for funsies",
                rating: 5
            }

            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                    .get(`/api/bookmarks/${postRes.body.id}`)
                    .expect(postRes.body)
                    )
        })

        // Testing required fields
        const requiredFields = ['title', 'url', 'rating']

        //looping through required fields array and removing each field once?
        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'grailed',
                url: "www.grailed.com",
                rating: 5
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newBookmark[field]

                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `missing ${field} in request body` }
                    })
            })
        })

        // Rating Test
        it(`rsponds with 400 and an error message when the rating is not between 1-5`, () => {
            const newBookmark = {
                title: "apple",
                url: "www.apple.com",
                description: "idk",
                rating: 7
            }

            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .expect(400, {
                    error: { message: `number must be between 1-5` }
                })
        })
    })

    describe(` DELETE /api/bookmarks/:id`, () => {
        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return knexInstance
                    .into('bookmarks_table')
                    .insert(testBookmarks)
            })

            it(`responds with a 204 and removes bookmark`, () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)

                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get('/api/bookmarks')
                        .expect(expectedBookmarks)
                    )
            })
        })

        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                .delete(`/api/bookmarks/${bookmarkId}`)
                .expect(404, {error: { message: `bookmark doesn't exist` } })
            })
        })
    })

    describe(`PATCH /api/bookmarks/id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .expect(404, { error: { message: `bookmark doesn't exist` } })
            })
        })

        context(`Given there are articles in the database`, () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks into bookmarks_table', () => {
                return knexInstance
                    .into('bookmarks_table')
                    .insert(testBookmarks)
            })

            it(`responds with 204 and updates the bookmark`, () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated bookmark title',
                    url: 'www.updated.com',
                    description: 'updated bookmark',
                    rating: 5
                }

                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .expect(expectedBookmark)
                            )
            })
            // Test to see if required fields were not supplied
            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({ irrelevantField: 'Foo' })
                    .expect(400, {
                        error: {
                            message: `request body must contain either 'title', 'url', or 'rating'`
                        }
                    })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated bookmark title',
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .expect(expectedBookmark)
                    )
            })
        })
    })

})


