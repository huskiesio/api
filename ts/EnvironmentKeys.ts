/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as FS from "fs";
import * as Path from "path";

export interface IEnvironmentKeys {
	mailgun: string;
}

export class EnvironmentKeys {

	public keys: IEnvironmentKeys;
	private static session: EnvironmentKeys | undefined;

	private constructor() {

		const path: string = Path.resolve("./environment.json");
		if (!FS.existsSync(path)) throw new Error("Could not find key file at: " + path);

		const fileData: Buffer = FS.readFileSync(path);
		const fileString: string = fileData.toString("utf8");
		let file: object | undefined;

		try {
			file = JSON.parse(fileString);
		} catch (e) {
			throw new Error("Could not parse key file at: " + path);
		}

		this.keys = file as IEnvironmentKeys;

	}

	public static getSession(): EnvironmentKeys {

		if (this.session === undefined) this.session = new EnvironmentKeys();
		return this.session;

	}

}