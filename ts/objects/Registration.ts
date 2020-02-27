/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {SiObject, SiQuery} from "@element-ts/silicon";

/**
 * The type definition for a Registration's prop object.
 */
export interface RegistrationProps {
	username: string;
	code: string;
	userPublicKey: Buffer;
	devicePublicKey: Buffer;
	salt: Buffer;
	password: Buffer;
	connectionId: string;
	firstName: string;
	lastName: string;
	deviceName: string;
}

/**
 * A class representing a Registration built with @element-ts/silicon.
 */
export class Registration extends SiObject<RegistrationProps> {

	/**
	 * Create a new Registration instance.
	 */
	public constructor() {

		super("registration");

	}

}