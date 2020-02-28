const BookmarksService = {
    getAllBookmarks(knexInstance) {
        return knexInstance
            .select('*')
            .from('bookmarks_table')
    },
    getById(knexInstance, id) {
        return knexInstance
            .from('bookmarks_table')
            .select('*')
            .where('id', id)
            .first()
    },
    insertBookmark(knexInstance, newBookmark) {
        return knexInstance
            .insert(newBookmark)
            .into('bookmarks_table')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    deleteBookmark(knex, id) {
        return knex('bookmarks_table')
            .where({ id })
            .delete()
    },
}

module.exports = BookmarksService