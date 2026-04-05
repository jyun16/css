const conf = {
	host: '0.0.0.0',
	port: 8080,
	documentRoot: './public',
}

import { series, parallel, watch, src, dest } from 'gulp'
import _browserSync from 'browser-sync'
import plumber from 'gulp-plumber'
import rename from 'gulp-rename'
import uglify from 'gulp-uglify'
import pug from 'gulp-pug'
import gulpSass from 'gulp-sass'
import * as _sass from 'sass'
const sass = gulpSass(_sass)
import cleanCSS from 'gulp-clean-css'

const browserSync = _browserSync.create()

const bs = () => {
	browserSync.init({
		host: conf.host,
		port: conf.port,
		server: {
			baseDir: conf.documentRoot,
		},
		ui: false,
		open: false,
	})
}

const bsr = cb => {
	browserSync.reload()
	cb()
}

const js_dir = [ 'js/**/*.js', '!js/**/*.min.js' ]
const jsw = () => { watch(js_dir, series(jsc, bsr)) }
const jsc = () => {
	return src(js_dir)
		.pipe(plumber())	
		.pipe(uglify())	
		.pipe(rename({ extname: '.min.js' }))	
		.pipe(dest(conf.documentRoot + '/js/'))
}

const js_scss_dir = 'js/**/*.scss'
const js_scssw = () => { watch(js_scss_dir, series(js_scssc, bsr)) }
const js_scssc = () => {
	return src(js_scss_dir)
    .pipe(plumber())
    .pipe(sass({ outputStyle: 'expanded', silenceDeprecations: [ 'legacy-js-api' ] }))
		.pipe(cleanCSS())
		.pipe(rename({ extname: '.min.css' }))
		.pipe(dest(conf.documentRoot + '/js/'));
}

const scss_dir = 'scss/**/[^_]*.scss'
const scssw = () => { watch(scss_dir, series(scssc, bsr)) }
const scssc = () => {
	return src(scss_dir)
		.pipe(plumber())
		.pipe(sass({ outputStyle: 'expanded', silenceDeprecations: [ 'legacy-js-api' ] }).on('error', sass.logError))
		.pipe(cleanCSS())
		.pipe(rename({ extname: '.min.css' }))
		.pipe(dest(conf.documentRoot + '/css/'));
}

const pug_dir = [ 'pug/**/*.pug', '!pug/_layout/*.pug' ]
const pugw = () => { watch(pug_dir, series(pugc, bsr)) }
const pugc = () => {
  return src(pug_dir)
    .pipe(plumber())
    .pipe(pug({
			pretty: true,
			filters: {
				scss: data => _sass.renderSync({ data, silenceDeprecations: [ 'legacy-js-api' ] }).css.toString(),
			},
		}))
    .pipe(rename({ extname: '.html' }))
    .pipe(dest(conf.documentRoot))
}

const pug_include_dir = [ 'pug/_layout/*.pug' ]
function pug_include_w(cb) { watch(pug_include_dir, series(pugc, bsr)); cb() }

export default parallel(bs, jsw, js_scssw, scssw, pugw, pug_include_w)
