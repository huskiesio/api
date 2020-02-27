/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {SiObject} from "@element-ts/silicon";
import {IHCAPIDirectoryContact} from "@huskiesio/types";

/**
 * The type definition for a DirectoryContact's prop object.
 */
export interface DirectoryContactProps extends IHCAPIDirectoryContact {
	username: string;
	firstName: string;
	lastName: string;
}

/**
 * A class representing a DirectoryContact built with @element-ts/silicon.
 */
export class DirectoryContact extends SiObject<DirectoryContactProps> {

	/**
	 * Create a new DirectoryContact instance.
	 */
	public constructor() {

		super("directoryContact");

	}

}