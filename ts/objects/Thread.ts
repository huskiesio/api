/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {SiObject, SiQuery} from "@element-ts/silicon";
import {IHCAPIThread} from "@huskiesio/types";
import {User, UserProps} from "./User";
import {convertSiObjectToIHCAPIObject, IHCAPIAble} from "./IHCAPIAble";

/**
 * The type definition for a Thread's prop object.
 */
export interface ThreadProps extends IHCAPIThread {
	name: string;
	description: string;
	memberIds: string[];
}

/**
 * A class representing a Thread built with @element-ts/silicon.
 */
export class Thread extends SiObject<ThreadProps> implements IHCAPIAble<IHCAPIThread> {

	/**
	 * Create a new Thread instance.
	 */
	public constructor() {

		super("thread");

	}

	public getIHCAPIObject(): IHCAPIThread {
		return convertSiObjectToIHCAPIObject<IHCAPIThread, ThreadProps>(this, {
			name: this.props.name,
			description: this.props.description,
			memberIds: this.props.memberIds
		});
	}

	public async getMembers(): Promise<User[]> {

		const memberIds: string[] | undefined = this.props.memberIds;
		if (memberIds === undefined) return [];

		const members: User[] = [];

		for (const id of memberIds) {
			const user: User | undefined = await SiQuery.getObjectForId(User, id);
			if (user !== undefined) members.push(user);
		}

		return members;

	}

	public hasMember(member: User | string): boolean {

		const memberIds: string[] | undefined = this.props.memberIds;
		if (memberIds === undefined) return false;
		const memberId: string | undefined = (typeof member === "string") ? member : member.getId();
		if (memberId === undefined) return false;

		return memberIds.indexOf(memberId) !== -1;

	}


}