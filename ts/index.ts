/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {CommandSocketServer} from "@command-socket/server";
import {CommandRegistry, CommandSocketError, CommandSocket} from "@command-socket/core";
import {HCCSServerCommands, HCCSBotCommands, IHCAPIUser, IHCAPIThread, IHCAPIMessage} from "@huskiesio/types";
import {User, UserProps} from "./objects/User";
import {Registration} from "./objects/Registration";
import * as Crypto from "crypto";
// import * as Mailgun from "ts-mailgun";
import {KrBcrypt, KrBcryptCreatePasswordReturn, KrRSA} from "@element-ts/krypton";
import {Device} from "./objects/Device";
import {SiQuery, SiDatabase} from "@element-ts/silicon";
import {Thread, ThreadProps} from "./objects/Thread";
import {Message, MessageProps} from "./objects/Message";

(async (): Promise<void> => {

	await SiDatabase.init({
		address: "mongodb://localhost:27017",
		database: "huskiesio",
		verbose: true
	});

	type SocketProps = {
		userId: string;
		deviceId: string;
		isAuthorized: boolean;
		signature: {
			unsigned?: Buffer,
			signed?: Buffer
		}
	};
	type Socket = CommandSocket<HCCSServerCommands, HCCSBotCommands, SocketProps>;

	const commandRegistry: CommandRegistry<HCCSServerCommands> = new CommandRegistry<HCCSServerCommands>();
	const server: CommandSocketServer<HCCSServerCommands, HCCSBotCommands, SocketProps> = new CommandSocketServer<HCCSServerCommands, HCCSBotCommands, SocketProps>(3000, commandRegistry);
	const socketsRegistryForUser: Map<string, string[]> = new Map<string, string[]>();

	server.getEvents().CONNECTION_OPENED.subscribe((socket: Socket): void => {

		console.log("New Socket with id!!! " + socket.getID());

	});

	const verifySocketIsAuthorized: (socket: Socket) => string = (socket: Socket): string => {
		if (socket.getMetadata().isAuthorized !== true) {
			throw new CommandSocketError("You must first call sign in.");
		}
		const userId: string | undefined = socket.getMetadata().userId;
		if (userId === undefined) throw new CommandSocketError("Your userId is not defined. Please sign in.");

		return userId;

	};

	const verifyAndGetUser: (socket: Socket) => Promise<User> = async(socket: Socket): Promise<User> => {

		const userId: string = verifySocketIsAuthorized(socket);
		const user: User | undefined = await SiQuery.getObjectForId(User, userId);
		if (user === undefined) throw new CommandSocketError("Your user object does not exist.");

		return user;

	};

	async function verifyAndGetUserAndThread(socket: Socket, threadId: string): Promise<{user: User, thread: Thread}> {

		const user: User = await verifyAndGetUser(socket);
		const thread: Thread | undefined = await SiQuery.getObjectForId(Thread, threadId);
		if (thread === undefined) throw new CommandSocketError("The thread you are referencing does not exist.");
		if (!thread.hasMember(user)) throw new CommandSocketError("You do not belong in the thread you are trying to fetch.");

		return {user, thread};

	}

	function getSocketsFromSocketIds(socketIds: string[]): Socket[] {

		const sockets: Socket[] = [];

		for (const socketId of socketIds) {

			const socket: Socket | undefined = server.getConnectionForID(socketId);
			if (socket === undefined) continue;

			sockets.push(socket);

		}

		return sockets;

	}

	commandRegistry.addCommand("signUp start", async(param: {
		email: string,
		password: string,
		userPublicKey: string,
		devicePublicKey: string,
		firstName: string,
		lastName: string,
		deviceName: string
	}): Promise<string> => {

		const indexOfLastAt: number = param.email.lastIndexOf("@");
		if (indexOfLastAt === -1) throw new CommandSocketError("You must specify a valid email address.");
		const qualifiedDomain: string = "@mtu.edu";
		const substringOfAddress: string = param.email.substr(indexOfLastAt, qualifiedDomain.length);
		if (substringOfAddress !== qualifiedDomain) throw new CommandSocketError("You must use an @mtu.edu email address.");
		const username: string = param.email.slice(0, indexOfLastAt);

		const user: User | undefined = await User.getForUsername(username);
		if (user) throw new CommandSocketError("A user already exists for this MTU account.");

		const codeBytes: Buffer = Crypto.randomBytes(3);
		const codeString: string = codeBytes.toString("hex");
		const code: string = codeString.toUpperCase();

		const hash: KrBcryptCreatePasswordReturn = await KrBcrypt.createPassword(param.password);
		const password: Buffer = hash.password;
		const salt: Buffer = hash.salt;

		const registration: Registration = new Registration();
		registration.props.username = username;
		registration.props.userPublicKey = Buffer.from(param.userPublicKey, "hex");
		registration.props.devicePublicKey = Buffer.from(param.devicePublicKey, "hex");
		registration.props.password = password;
		registration.props.salt = salt;
		registration.props.code = code;
		registration.props.firstName = param.firstName;
		registration.props.lastName = param.lastName;
		registration.props.deviceName = param.deviceName;
		await registration.create();

		// const mailer: Mailgun.NodeMailgun = new Mailgun.NodeMailgun();
		// mailer.apiKey = EnvironmentKeys.getSession().keys.mailgun;
		// mailer.domain = "snow.huskies.io";
		// mailer.fromEmail = "no-reply@mail.huskies.io";
		// mailer.fromTitle = "HuskyChat";
		// mailer.init();
		// await mailer.send(param.email, "HuskyChat Verification", `Hello ${param.firstName},\n\nYour verification code is ${code}.\n\n- Blizzard`);

		console.log(`Hello ${param.firstName},\n\nYour verification code is ${code}.\n\n- Blizzard`);

		const registrationId: string | undefined = registration.getId();
		if (registrationId === undefined) throw new CommandSocketError("Registration did not have id.");

		return registrationId;

	});

	commandRegistry.addCommand("signUp finish", async(param: {code: string, token: string}): Promise<string> => {

		try {
			console.log(param.token);
			const registration: Registration | undefined = await SiQuery.getObjectForId(Registration, param.token);
			if (registration === undefined) throw new CommandSocketError("Registration not found. Call 'signUp start' first.");
			if (registration.props.code !== param.code) throw new CommandSocketError("Registration code not valid. Try again.");

			const user: User = new User();
			user.props.firstName = registration.props.firstName;
			user.props.lastName = registration.props.lastName;
			user.props.username = registration.props.username;
			user.props.salt = registration.props.salt;
			user.props.password = registration.props.password;
			user.props.publicKey = registration.props.userPublicKey;
			await user.create();

			const device: Device = new Device();
			device.props.publicKey = registration.props.devicePublicKey;
			device.props.name = registration.props.deviceName;
			device.props.userId = user.getId();
			await device.create();

			await registration.delete();

			const deviceId: string | undefined = device.getId();
			if (deviceId === undefined) throw new CommandSocketError("Device id just created is undefined");

			return deviceId;

		} catch (e) {

			console.error(e);

		}

		return "";

	});

	commandRegistry.addCommand("signIn start",
		async(param: {username: string, password: string, deviceId: string, devicePublicKey?: string, needsUserPrivateKey?: boolean}, socket: Socket): Promise<string> => {

			try {
				const user: User | undefined = await User.getForUsername(param.username);
				const emailPasswordError: CommandSocketError = new CommandSocketError("Incorrect username or password.");
				if (user === undefined) throw emailPasswordError;
				if (!await user.isPasswordCorrect(param.password)) throw emailPasswordError;

				const device: Device | undefined = await SiQuery.getObjectForId(Device, param.deviceId);
				if (!device) throw new CommandSocketError("Device for id does not exist.");

				const unsigned: Buffer = Crypto.randomBytes(32);
				socket.getMetadata().userId = user.getId();
				socket.getMetadata().deviceId = device.getId();
				socket.getMetadata().signature = { unsigned };

				return unsigned.toString("hex");
			} catch (e) {
				console.error(e);
			}

			return "";

		});

	commandRegistry.addCommand("signIn finish", async(param: {signature: string}, socket: Socket): Promise<boolean> => {

		try {
			const deviceId: string | undefined = socket.getMetadata().deviceId;
			if (!deviceId) throw new CommandSocketError("Device id not found, call 'signIn start' first.");
			const device: Device | undefined = await SiQuery.getObjectForId(Device, deviceId);
			if (!device) throw new CommandSocketError("Device not found.");
			const devicePublicKey: Buffer | undefined = device.props.publicKey;
			if (!devicePublicKey) throw new CommandSocketError("Public key does not exist for device.");

			const signedData: Buffer = Buffer.from(param.signature, "hex");
			let verifiedData: Buffer;

			try {
				verifiedData = KrRSA.verify(signedData, Buffer.from(devicePublicKey));
			} catch (e) {
				throw new CommandSocketError("Failed to verify device signature.");
			}

			const unsignedSignature: Buffer | undefined = socket.getMetadata().signature?.unsigned;
			if (unsignedSignature === undefined) throw new CommandSocketError("No unsigned signature. You must call 'signIn start' first.");
			if (!Buffer.from(unsignedSignature).equals(verifiedData)) throw new CommandSocketError("Failed device signature.");

			socket.getMetadata().signature = { signed: signedData, unsigned: unsignedSignature };
			socket.getMetadata().isAuthorized = true;

			const userId: string | undefined = device.props.userId;
			if (userId === undefined) throw new CommandSocketError("Device does not contain a userId.");
			let socketsForUser: string[] | undefined = socketsRegistryForUser.get(userId);
			if (socketsForUser === undefined) socketsForUser = [];
			socketsForUser.push(socket.getID());
			socketsRegistryForUser.set(userId, socketsForUser);
		} catch (e) {
			console.error(e);
		}

		return true;

	});

	commandRegistry.addCommand("user me", async(param: boolean, socket: Socket): Promise<IHCAPIUser> => {

		const user: User = await verifyAndGetUser(socket);

		console.log(user.props.publicKey);

		return user.getIHCAPIObject();

	});

	commandRegistry.addCommand("user me avatar get", async(param: boolean, socket: Socket): Promise<string | undefined> => {

		const user: User = await verifyAndGetUser(socket);
		return user.getProfilePicture()?.toString("hex");

	});

	commandRegistry.addCommand("user me avatar set", async(data: string, socket: Socket): Promise<boolean> => {

		const user: User = await verifyAndGetUser(socket);
		user.setProfilePicture(Buffer.from(data, "hex"));
		return true;

	});

	commandRegistry.addCommand("user search username", async(username: string, socket: Socket): Promise<IHCAPIUser | undefined> => {

		verifySocketIsAuthorized(socket);

		return (await User.getForUsername(username))?.getIHCAPIObject();

	});

	commandRegistry.addCommand("user search id", async(id: string, socket: Socket): Promise<IHCAPIUser | undefined> => {

		verifySocketIsAuthorized(socket);

		return (await SiQuery.getObjectForId(User, id))?.getIHCAPIObject();

	});

	commandRegistry.addCommand("user search query", async(q: string, socket: Socket): Promise<IHCAPIUser[]> => {

		verifySocketIsAuthorized(socket);

		const query: SiQuery<User, UserProps> = new SiQuery<User, UserProps>(User, {
			// @ts-ignore
			$usernameQuery: { $search: q }
		});

		query.setLimit(20);
		return (await query.getAll()).map((user: User): IHCAPIUser => { return user.getIHCAPIObject(); });

	});

	commandRegistry.addCommand("chat thread keys", async(threadId: string, socket: Socket): Promise<{[userId: string]: string}> => {

		const objects: {user: User, thread: Thread} = await verifyAndGetUserAndThread(socket, threadId);
		const user: User = objects.user;
		const userId: string | undefined = user.getId();
		if (userId === undefined) throw new CommandSocketError("User does not have id.");
		const thread: Thread = objects.thread;

		const members: User[] = await thread.getMembers();
		const keys: { [userId: string]: string } = {};

		for (const member of members) {

			const id: string | undefined = member.getId();
			const publicKey: Buffer | undefined = member.props.publicKey;
			if (id === undefined || publicKey === undefined) continue;

			keys[id] = publicKey.toString("hex");

		}

		return keys;

	});

	commandRegistry.addCommand("chat send", async(param: {threadId: string, payload: {[userId: string]: string}}, socket: Socket): Promise<boolean> => {

		const objects: {user: User, thread: Thread} = await verifyAndGetUserAndThread(socket, param.threadId);
		const user: User = objects.user;
		const userId: string | undefined = user.getId();
		if (userId === undefined) throw new CommandSocketError("User does not have id.");
		const thread: Thread = objects.thread;

		const members: User[] = await thread.getMembers();

		for (const member of members) {

			const memberId: string | undefined = member.getId();
			if (memberId === undefined) continue;
			const socketIds: string[] = socketsRegistryForUser.get(memberId) ?? [];
			const sockets: Socket[] = getSocketsFromSocketIds(socketIds);
			const payloadForUser: string | undefined = param.payload[memberId];
			if (payloadForUser === undefined) continue;

			for (const socket of sockets) {
				await socket.invoke("chat message received", {
					threadId: param.threadId,
					senderId: userId,
					payload: payloadForUser,
					timestamp: Date.now()
				});
			}

			const message: Message = new Message();
			message.props.threadId = param.threadId;
			message.props.payload = Buffer.from(payloadForUser, "hex");
			message.props.senderId = userId;
			await message.create();

		}

		return true;

	});

	commandRegistry.addCommand("chat thread create", async(params: {members: string[], name: string, description: string}, socket: Socket): Promise<string> => {

		const user: User = await verifyAndGetUser(socket);
		const userId: string | undefined = user.getId();
		if (userId === undefined) throw new CommandSocketError("User does not have an id.");

		const thread: Thread = new Thread();
		thread.props.memberIds = params.members;
		thread.props.name = params.name;
		thread.props.description = params.description;

		return await thread.create();

	});

	commandRegistry.addCommand("chat thread", async(threadId: string, socket: Socket): Promise<IHCAPIThread | undefined> => {

		const user: User = await verifyAndGetUser(socket);
		const userId: string | undefined = user.getId();
		if (userId === undefined) throw new CommandSocketError("User does not have an id.");

		const thread: Thread | undefined = await SiQuery.getObjectForId(Thread, threadId);
		if (thread === undefined) return undefined;
		if (!thread.hasMember(user)) throw new CommandSocketError("You do not belong in the thread you are trying to fetch.");

		return thread.getIHCAPIObject();

	});

	commandRegistry.addCommand("chat thread member add", async(params: {threadId: string, userId: string}, socket: Socket): Promise<boolean> => {

		const objects: {user: User, thread: Thread} = await verifyAndGetUserAndThread(socket, params.threadId);

		if (!objects.thread.hasMember(params.userId)) {
			objects.thread.props.memberIds?.push(params.userId);
			await objects.thread.update("memberIds");
		}

		return true;

	});

	commandRegistry.addCommand("chat thread member remove", async(params: {threadId: string, userId: string}, socket: Socket): Promise<boolean> => {

		const objects: {user: User, thread: Thread} = await verifyAndGetUserAndThread(socket, params.threadId);

		if (objects.thread.hasMember(params.userId)) {
			const memberIds: string[] | undefined = objects.thread.props.memberIds;
			if (memberIds === undefined) throw new CommandSocketError("LOL");
			const index: number = memberIds.indexOf(params.userId);
			memberIds.splice(index, 1);
			objects.thread.props.memberIds = memberIds;
			await objects.thread.update("memberIds");
		}

		return true;

	});

	commandRegistry.addCommand("chat thread my", async(param: boolean, socket: Socket): Promise<IHCAPIThread[]> => {

		const user: User = await verifyAndGetUser(socket);
		const userId: string | undefined = user.getId();
		if (userId === undefined) throw new CommandSocketError("The user does not have an id.");

		const query: SiQuery<Thread, ThreadProps> = new SiQuery<Thread, ThreadProps>(Thread, {
			memberIds: userId
		});

		return (await query.getAll()).map((thread: Thread): IHCAPIThread => { return thread.getIHCAPIObject(); });

	});

	commandRegistry.addCommand("chat history", async(param: {messageId: string, relativeHistory: number}, socket: Socket): Promise<IHCAPIMessage[]> => {

		const user: User = await verifyAndGetUser(socket);
		const userId: string | undefined = user.getId();
		if (userId === undefined) throw new CommandSocketError("The user does not have an id.");
		if (param.relativeHistory > 100) throw new CommandSocketError("You can only fetch 100 messages at a time.");
		const message: Message | undefined = await SiQuery.getObjectForId(Message, param.messageId);
		if (message === undefined) throw new CommandSocketError("The message you are referencing does not exist.");
		const threadId: string | undefined = message.props.threadId;
		if (threadId === undefined) throw new CommandSocketError("The message you are referencing does not have an id");
		const thread: Thread | undefined = await SiQuery.getObjectForId(Thread, threadId);
		if (thread === undefined) throw new CommandSocketError("The thread does not exist.");

		const query: SiQuery<Message, MessageProps> = new SiQuery<Message, MessageProps>(Message, {
			threadId,
			updatedAt: { $lt: message.getUpdatedAt() }
		});

		query.addSort("updatedAt", "$asc");
		query.setLimit(param.relativeHistory);

		return (await query.getAll()).map((message: Message): IHCAPIMessage => { return message.getIHCAPIObject(); });

	});

})().then((): void => {}).catch((e: any): void => console.error(e));