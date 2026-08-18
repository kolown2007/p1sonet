import {
	Realtime,
	type ClientOptions,
	type RealtimeChannel,
	type InboundMessage
} from 'ably';

export interface SocketClientOptions {
	authUrl?: string;
	key?: string;
	channel: string;
	clientId?: string;
}

export interface SocketMessage<T = unknown> {
	type: string;
	payload?: T;
}

export type SocketMessageHandler<T = unknown> = (message: SocketMessage<T>) => void;

type EventHandler = () => void;
type ErrorHandler = (error: Error) => void;

export class SocketClient {
	private readonly options: SocketClientOptions;
	private readonly messageHandlers: Set<SocketMessageHandler> = new Set();
	private readonly openHandlers: Set<EventHandler> = new Set();
	private readonly closeHandlers: Set<EventHandler> = new Set();
	private readonly errorHandlers: Set<ErrorHandler> = new Set();
	private realtime: Realtime | null = null;
	private channel: RealtimeChannel | null = null;

	public constructor(options: SocketClientOptions) {
		this.options = options;
	}

	public connect(): void {
		if (typeof window === 'undefined') {
			return;
		}

		this.createAblyClient();
	}

	public disconnect(): void {
		this.channel?.unsubscribe();
		this.realtime?.close();
		this.realtime = null;
		this.channel = null;
	}

	public send<T = unknown>(message: SocketMessage<T>): void {
		if (!this.channel) {
			return;
		}

		this.channel.publish(message.type, message.payload).catch((error) => {
			this.errorHandlers.forEach((handler) => handler(error));
		});
	}

	public onMessage(handler: SocketMessageHandler): void {
		this.messageHandlers.add(handler);
	}

	public offMessage(handler: SocketMessageHandler): void {
		this.messageHandlers.delete(handler);
	}

	public onOpen(handler: EventHandler): void {
		this.openHandlers.add(handler);
	}

	public onClose(handler: EventHandler): void {
		this.closeHandlers.add(handler);
	}

	public onError(handler: ErrorHandler): void {
		this.errorHandlers.add(handler);
	}

	private createAblyClient(): void {
		if (this.realtime) {
			return;
		}

const clientOptions: ClientOptions = {
			clientId: this.options.clientId
		};

		if (this.options.authUrl) {
			clientOptions.authUrl = this.options.authUrl;
		} else if (this.options.key) {
			clientOptions.key = this.options.key;
		} else {
			throw new Error('SocketClient requires either authUrl or key for Ably authentication.');
		}

		this.realtime = new Realtime(clientOptions);

		this.realtime.connection.on('connected', () => {
			this.openHandlers.forEach((handler) => handler());
		});

		this.realtime.connection.on('closed', () => {
			this.closeHandlers.forEach((handler) => handler());
		});

		this.realtime.connection.on('failed', (state: any) => {
			this.errorHandlers.forEach((handler) => handler(new Error(state.reason ?? 'Ably connection failed')));
		});

		this.channel = this.realtime.channels.get(this.options.channel);
		this.channel.subscribe((message: InboundMessage) => {
			this.handleMessage(message);
		});
	}

	private handleMessage(message: InboundMessage): void {
		const payload = message.data as unknown;
		const socketMessage: SocketMessage = {
			type: message.name ?? 'message',
			payload
		};
		this.messageHandlers.forEach((handler) => handler(socketMessage));
	}
}
