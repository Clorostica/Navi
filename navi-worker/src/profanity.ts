const BLOCKLIST = [
	// English
	'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'whore', 'slut',
	'nigger', 'nigga', 'faggot', 'retard', 'cock', 'wanker', 'motherfucker',
	// German
	'scheisse', 'scheiße', 'arschloch', 'hurensohn', 'fotze', 'wichser', 'schlampe', 'missgeburt', 'spast', 'nutte',
	// Spanish
	'mierda', 'puta', 'puto', 'gilipollas', 'cabron', 'cabrón', 'joder', 'pendejo', 'coño', 'chinga', 'verga', 'maricon', 'maricón', 'zorra',
];

const LEET_MAP: Record<string, string> = {
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'7': 't',
	'@': 'a',
	'$': 's',
};

function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[01345$@]/g, (char) => LEET_MAP[char] ?? char);
}

const BLOCKLIST_PATTERN = new RegExp(`\\b(?:${BLOCKLIST.map((word) => normalize(word)).join('|')})\\w*`, 'i');

export function containsProfanity(text: string): boolean {
	return BLOCKLIST_PATTERN.test(normalize(text));
}

const SPAM_DRUG_PHRASES = [
	// Drug sale slang (English)
	'cocaine', 'heroin', 'crystal meth', 'crack cocaine', 'mdma', 'molly', 'ecstasy pills', 'weed for sale', 'drugs for sale', 'selling drugs',
	// German
	'kokain kaufen', 'gras kaufen', 'drogen kaufen', 'drogen verkaufen', 'koks kaufen',
	// Spanish
	'cocaína', 'vendo droga', 'compro droga', 'droga en venta', 'venta de droga',
	// Spam / solicitation
	'dm me', 'dm to buy', 'whatsapp me', 'telegram me', 'contact me on', 'call now to', 'click here', 'visit my website', 'follow me on', 'subscribe to my channel', 'link in bio',
];

const SPAM_PATTERN = new RegExp(`\\b(?:${SPAM_DRUG_PHRASES.map((phrase) => normalize(phrase)).join('|')})`, 'i');

// Raw-text checks (not leet-normalized, since normalize() rewrites digits into letters).
const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/i;
const MESSAGING_LINK_PATTERN = /\b(?:wa\.me|t\.me|bit\.ly)\/\S+/i;
const PHONE_LIKE_PATTERN = /(?:\d[\s.-]?){7,}\d/;

export function containsSpamOrDrugContent(text: string): boolean {
	if (URL_PATTERN.test(text) || MESSAGING_LINK_PATTERN.test(text) || PHONE_LIKE_PATTERN.test(text)) {
		return true;
	}
	return SPAM_PATTERN.test(normalize(text));
}
