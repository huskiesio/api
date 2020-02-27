/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {SiObject} from "@element-ts/silicon";
import {IHCAPIMessage} from "@huskiesio/types";
import {convertSiObjectToIHCAPIObject, IHCAPIAble} from "./IHCAPIAble";

/**
 * The type definition for a Message's prop object.
 */
export interface MessageProps extends IHCAPIMessage {
	threadId: string;
	senderId: string;
	payload: Buffer;
}

/**
 * A class representing a Message built with @element-ts/silicon.
 */
export class Message extends SiObject<MessageProps> implements IHCAPIAble<IHCAPIMessage> {

	/**
	 * Create a new Message instance.
	 */
	public constructor() {

		super("message");

	}

	public getIHCAPIObject(): IHCAPIMessage {
		return convertSiObjectToIHCAPIObject<IHCAPIMessage, MessageProps>(this, {
			threadId: this.props.threadId,
			senderId: this.props.senderId,
			payload: this.props.payload
		});
	}

}