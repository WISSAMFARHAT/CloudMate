import through = require('through2');
import vinyl = require('vinyl');

module.exports = function (isDeclaration?: Boolean) {
	if (isDeclaration === undefined) isDeclaration = false;

	return through.obj(function (vinylFile: vinyl, encoding: string, callback: Function) {
		const transformedFile = vinylFile.clone();

		let content = transformedFile.contents.toString();

		if (!isDeclaration) content = 'var exports = {};\n' + content;

		content = CloudMateWebCleanJS.cleanLines(content);

		if (!isDeclaration) {
			content = CloudMateWebCleanJS.cleanPrefixes(content);

			const lines = content.split('\n');

			const removables_Requires = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				if (line.indexOf(' require(') === -1) continue;

				removables_Requires.push(line);

				const prefix = line.split(' ')[1];

				if (prefix.indexOf('_') !== -1) removables_Requires.push(prefix + '.');
			}

			removables_Requires.forEach(function (value) {
				if (value.indexOf('=') === 0) return;

				if (value.indexOf('=') !== -1) content = content.replace(value, '');
				else content = content.replace(new RegExp(value.trim(), 'gi'), '');
			});
		}

		transformedFile.contents = new Buffer(content);

		// 3. pass along transformed file for use in next `pipe()`
		callback(null, transformedFile);
	});
};

class CloudMateWebCleanJS {
	static cleanLines(content: string): string {
		const startWithValues = ['import '];

		let result = '';

		for (const line of content.split('\n')) {
			let safe = true;

			for (const startWith of startWithValues) if (line.startsWith(startWith)) safe = false;

			if (safe) result += line + '\n';
		}

		return result;
	}

	static cleanPrefixes(content: string): string {
		const prefixesValues = ['export default ', 'export '];

		for (const prefix of prefixesValues) content = content.replace(new RegExp('^(' + prefix + ')|[[:blank:]]+(' + prefix + ')', 'gmi'), '');

		return content;
	}
}
