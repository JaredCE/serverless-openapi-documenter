'use strict'

module.exports = {
    recursive: true,
    reporter: 'spec',
    spec: 'test/unit/*.spec.js',
    watch: false,
    'watch-files': ['src/**/*.js', 'test/**/*.spec.js'],
}
