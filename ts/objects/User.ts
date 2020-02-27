/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {SiObject, SiQuery} from "@element-ts/silicon";
import {IHCAPIUser} from "@huskiesio/types";
import {KrBcrypt} from "@element-ts/krypton";
import {CommandSocketError} from "@command-socket/core";
import {convertSiObjectToIHCAPIObject, IHCAPIAble} from "./IHCAPIAble";
import * as Path from "path";
import * as FS from "fs";

/**
 * The type definition for a User's prop object.
 */
export interface UserProps extends IHCAPIUser {
	firstName: string;
	lastName: string;
	username: string;
	salt: Buffer;
	password: Buffer;
	publicKey: Buffer;
}

/**
 * A class representing a User built with @element-ts/silicon.
 */
export class User extends SiObject<UserProps> implements IHCAPIAble<IHCAPIUser> {

	/**
	 * Create a new User instance.
	 */
	public constructor() {

		super("user");

	}

	public getIHCAPIObject(): IHCAPIUser {
		return convertSiObjectToIHCAPIObject<IHCAPIUser, UserProps>(this, {
			firstName: this.props.firstName,
			lastName: this.props.lastName,
			username: this.props.username,
			publicKey: this.props.publicKey
		});
	}

	public getProfilePicture(): Buffer | undefined {

		const id: string | undefined = this.getId();
		if (id === undefined) return undefined;

		const path: string = Path.resolve("../profile-pictures/" + id);
		if (!FS.existsSync(path)) return undefined;

		return FS.readFileSync(path);

	}

	public setProfilePicture(data: Buffer): void {

		const id: string | undefined = this.getId();
		if (id === undefined) return undefined;

		const path: string = Path.resolve("../profile-pictures/" + id);
		FS.writeFileSync(path, data);

	}

	public async isPasswordCorrect(password: string): Promise<boolean> {

		if (this.props.password === undefined || this.props.salt === undefined) throw new CommandSocketError("Password or salt is undefined.");
		return await KrBcrypt.verifyPassword(password, this.props.password, this.props.salt);
	}

	public static async getForUsername(username: string): Promise<User | undefined> {

		const query: SiQuery<User, UserProps> = new SiQuery<User, UserProps>(User, {username});

		return query.getFirst();

	}

}