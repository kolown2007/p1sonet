export interface CompactContent {
	videos?: string[];
	gifs?: string[];
	images?: string[];
}

export interface FeedScene {
	type: 'videoScene' | 'GifScene';
	id: string;
	src: string;
	objectFit?: 'cover' | 'none' | 'contain' | 'fill' | 'scale-down';
	loop?: boolean;
	muted?: boolean;
}

export const normalizeMediaUrl = (value: string): string => {
	const trimmed = value.trim();
	const match = trimmed.match(/https?:\/\/[^\s)]+/);

	if (match?.[0]) {
		return match[0].replace(/[)>]+$/, '');
	}

	return trimmed.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, '');
};

export const buildScenes = (content: CompactContent): FeedScene[] => {
	const videos = (content.videos ?? []).map(normalizeMediaUrl).filter(Boolean);
	const gifs = (content.gifs ?? [])
		.concat(content.images ?? [])
		.map(normalizeMediaUrl)
		.filter(Boolean);

	return [
		...videos.map((src, index) => ({
			type: 'videoScene' as const,
			id: `video-${index + 1}`,
			src,
			loop: true,
			muted: true
		})),
		...gifs.map((src, index) => ({
			type: 'GifScene' as const,
			id: `gif-${index + 1}`,
			src,
			objectFit: 'cover' as const
		}))
	];
};

export const fetchWalaykatapusanContent = async (): Promise<CompactContent> => {
	const response = await fetch('https://kolown.net/api/get_walaykatapusan');

	if (!response.ok) {
		throw new Error(`Failed to load Walaykatapusan content: ${response.status}`);
	}

	return (await response.json()) as CompactContent;
};

export const collectMediaUrls = (content: CompactContent): string[] => {
	return [...(content.videos ?? []), ...(content.gifs ?? []), ...(content.images ?? [])]
		.map(normalizeMediaUrl)
		.filter(Boolean);
};
