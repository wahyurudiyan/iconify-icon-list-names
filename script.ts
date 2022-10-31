import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { pascalCase } from 'pascal-case';

const main = async () => {
	await cleanTypesDirectory();
	const collectionFileNames = await listAllCollections();
	const collections = collectionFileNames.map(stripExtension);
	const typesFileNames = await Promise.all(collections.map(generateIconNamesFromCollection));
	await createBarrel(typesFileNames);
};
const cleanTypesDirectory = async () => {
	await rm('./types', { recursive: true, force: true });
	await mkdir('./types');
};

const stripExtension = (fileName: string) => fileName.replace('.json', '');
const listAllCollections = () => readdir('./node_modules/@iconify/json/json');

const importCollection = async (collectionName: string) => {
	const collection = await import(`@iconify/json/json/${collectionName}.json`, {
		assert: { type: 'json' },
	});
	return collection.default;
};

const attachPrefix = (prefix: string) => (icon: string) => `${prefix}:${icon}`;

const generateIconNamesFromCollection = async (collectionName: string) => {
	const { prefix, icons } = await importCollection(collectionName);
	const name = pascalCase(collectionName);

	const iconNames = Object.keys(icons).map(attachPrefix(prefix)).join("'|'");
	const type = `export type ${name} = '${iconNames}'`;
	await writeFile(`./types/${name}.d.ts`, type);

	return name;
};

const createBarrel = async (collections: string[]) => {
	const iconImports = collections
		.map((collection) => `import type { ${collection} } from './types/${collection}'; \n`)
		.join('');

	const iconExports = `export { ${collections.join(', ')} } \n`;
	const collectionsNameExport = `export type Collections = '${collections.join("'|'")}'; \n`;
	const allIconsExport = `export type AllIcons = ${collections.join('|')} ; \n`;
	const content = iconImports + iconExports + collectionsNameExport + allIconsExport;

	await writeFile('./index.ts', content);
};

main();
