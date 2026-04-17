const CONF = {
	port: 8080,
	https: {
		enable: 0,
	},
	static: 'public/',
}

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
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

const cl = console.log
const browserSync = _browserSync.create()

const bs = () => {
	const opts = {
		host: '0.0.0.0',
		port: CONF.port,
		server: {
			baseDir: CONF.static,
		},
		ui: false,
		open: false,
	}
	if (CONF.https.enable) {
		opts.https = {
			cert: CONF.https.cert,
			key: CONF.https.key,
		}
	}
	browserSync.init(opts)
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
		.pipe(dest(CONF.static + 'js/'))
}

const js_scss_dir = 'js/**/*.scss'
const js_scssw = () => { watch(js_scss_dir, series(js_scssc, bsr)) }
const js_scssc = () => {
	return src(js_scss_dir)
		.pipe(plumber())
		.pipe(sass({ outputStyle: 'expanded', silenceDeprecations: [ 'legacy-js-api' ] }))
		.pipe(cleanCSS())
		.pipe(rename({ extname: '.min.css' }))
		.pipe(dest(CONF.static + 'js/'));
}

const scss_dir = 'scss/**/[^_]*.scss'
const scssw = () => { watch(scss_dir, series(scssc, bsr)) }
const scssc = () => {
	return src(scss_dir)
		.pipe(plumber())
		.pipe(sass({ outputStyle: 'expanded', silenceDeprecations: [ 'legacy-js-api' ] }).on('error', sass.logError))
		.pipe(cleanCSS())
		.pipe(rename({ extname: '.min.css' }))
		.pipe(dest(CONF.static + 'css/'));
}

const htmlEscape = html => html.replace(/[&'`"<>]/g, m => {
	return {
		'&': '&amp;',
		"'": '&#x27;',
		'`': '&#x60;',
		'"': '&quot;',
		'<': '&lt;',
		'>': '&gt;',
	}[m]
})
const pug_dir = [ 'pug/**/*.pug', '!pug/_layout/*.pug' ]
const pugw = () => { watch(pug_dir, series(pugc, bsr)) }
const pugc = () => {
	return src(pug_dir)
		.pipe(plumber())
		.pipe(pug({
			pretty: true,
			filters: {
				html: data => htmlEscape(data),
				scss: data => _sass.compileString(data).css
			},
		}))
		.pipe(rename({ extname: '.html' }))
		.pipe(dest(CONF.static))
}

const pug_include_dir = [ 'pug/_layout/*.pug' ]
function pug_include_w(cb) { watch(pug_include_dir, series(pugc, bsr)); cb() }

export default parallel(bs, jsw, js_scssw, scssw, pugw, pug_include_w)

const ls = (dir, ret) => {
	if (!ret) { ret = [] }
	fs.readdirSync(dir).forEach(file => {
		let p = path.join(dir, file)
		if (fs.lstatSync(p).isDirectory()) {
			ls(p, ret)
		}
		else {
			ret.push(p)
		}	
	})
	return ret
}

const fileExists = file => {
	try {
		if (fs.existsSync(file)) {
			return true
		}
	}
	catch(err) {
		return false
	}
}

const d = console.log

const checkIgnore = (regs, str) => {
	for (let re of regs) {
		if ((new RegExp(re)).test(str)) {
			return true
		}
	}
	return false
}

const exec = cmd => cl(cmd, execSync(cmd).toString())

const rmTrash = (dir, ext, toDir) => {
	const ignore = [ '^public/js/select-pure/' ]
	const files = ls(dir).map(f => path.basename(f).split('.')[0])
	for (let f of ls(toDir)) {
		const ff = path.basename(f).split('.')[0]
		if (checkIgnore(ignore, f)) { continue }
		if (!files.includes(ff)) {
			exec(`rm ${f}`)
		}
	}
}

const cu = {
	html: cb => {
		const ignore = [ '^css/', '^js/', '^fonts/', 'favicon.ico' ]
		const files = ls('pug').map(x => x.replace(/pug\//, ''))
		for (let f of ls(CONF.static)) {
			f = f.replace(CONF.static, '')
			if (checkIgnore(ignore, f)) { continue }
			const ff = f.replace('.html', `.pug`)
			if (!files.includes(ff)) {
				exec(`rm ${CONF.static}${f}`)
			}
		}
		cb()
	},
	js: cb => {
		rmTrash('js', '.js', `${CONF.static}js`)
		cb()
	},
	css: cb => {
		rmTrash('scss', '.scss', `${CONF.static}css`)
		cb()
	},
	empty: cb => {
		execSync(`find ${CONF.static} -type d -empty`).toString().split("\n").forEach(f => {
			if (f) {
				exec(`rm -r ${f}`)
			}
		})
		cb()
	},
}

export const clean = series(parallel(cu.html, cu.js, cu.css), cu.empty)
