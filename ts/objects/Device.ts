/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {SiObject} from "@element-ts/silicon";
import {IHCAPIDevice} from "@huskiesio/types";

/**
 * The type definition for a Device's prop object.
 */
export interface DeviceProps extends IHCAPIDevice {
	userId: string;
	name: string;
	publicKey: Buffer;
}

/**
 * A class representing a Device built with @element-ts/silicon.
 */
export class Device extends SiObject<DeviceProps> {

	/**
	 * Create a new Device instance.
	 */
	public constructor() {

		super("device");

	}

}