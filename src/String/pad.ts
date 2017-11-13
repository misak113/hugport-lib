
export function padLeft(string: string, length: number, character: string) {
	return Array(length - string.length + 1).join(character) + string;
}
