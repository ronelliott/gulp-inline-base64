const
	UriRegExp = /url\([ '"]?(.*?)[ '"]?(|\,(.*?))\)/g,
	_ = require('lodash'),
	es = require('event-stream')
	fs = require('fs'),
	mime = require('mime'),
	path = require('path'),
	url = require('url'),
	util = require('gulp-util');

function clean_url(raw) {
	let uri = raw.slice(4, raw.length - 1);
	uri = uri.startsWith("'") || uri.startsWith('"') ? uri.slice(1, uri.length) : uri;
	uri = uri.endsWith("'") || uri.endsWith('"') ? uri.slice(0, uri.length - 1) : uri;
	return uri;
}

function get_base64_data(includes, uri) {
	let
		parsed = url.parse(uri),
		file_path = (includes || [])
			.map(include => {
				let full_path = path.join(include, parsed.pathname);
				return fs.existsSync(full_path) ? full_path : false;
			})
			.filter(i => i)[0];

	return file_path ? fs.readFileSync(file_path).toString('base64') : null;
}

module.exports = opts => {
	opts = Object.assign({
		include: [ process.cwd() ],
	}, opts || {});

	return es.map((file, callback) => {
		let file_data = file.contents.toString();

		file_data
			.match(UriRegExp)
			.forEach(match => {
				let uri = clean_url(match);

				if (uri.startsWith('http://') || uri.startsWith('https://')) {
					util.log(
						'gulp-inlinebase64:',
						util.colors.red('skipping: ') +
						util.colors.gray(uri));
					return;
				}

				let base64_data = get_base64_data(opts.includes, uri);

				if (!base64_data) {
					util.log(
						'gulp-inlinebase64:',
						util.colors.red('cannot find file, skipping: ') +
						util.colors.gray(uri));
				} else {
					file_data = file_data
						.replace(match, `url('data:${mime.lookup(uri)};base64,${base64_data})`);
				}
			});

		file.contents = new Buffer(file_data);
		callback(null, file);
	});
};
