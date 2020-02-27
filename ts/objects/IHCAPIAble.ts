/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import {IHCAPIBase} from "@huskiesio/types";
import { SiObject } from "@element-ts/silicon";
import {CommandSocketError} from "@command-socket/core";

export interface IHCAPIAble<T extends IHCAPIBase> {
	getIHCAPIObject(): T;
}



type ChildType<T> = Omit<T, "id" | "updatedAt" | "createdAt">;
export const convertSiObjectToIHCAPIObject: <T extends IHCAPIBase, P extends object>(siObject: SiObject<P>, keys: { [K in keyof ChildType<T>]: ChildType<T>[K] | undefined } ) => T = <T extends IHCAPIBase, P extends object>(siObject: SiObject<P>, keys: { [K in keyof ChildType<T>]: ChildType<T>[K] | undefined } ): T => {

	const id: string | undefined = siObject.getId();
	const updatedAt: number | undefined = siObject.getUpdatedAt();
	const createdAt: number | undefined = siObject.getCreatedAt();

	if (createdAt === undefined ||
		updatedAt === undefined ||
		id === undefined) throw new CommandSocketError("User has undefined properties.");

	for (const k of Object.keys(keys)) {

		const key: keyof P = k as (keyof P);
		if (siObject.props[key] === undefined) throw new CommandSocketError(`${key} is undefined on user.`);


	}

	// @ts-ignore
	keys["id"] = id;
	// @ts-ignore
	keys["updatedAt"] = updatedAt;
	// @ts-ignore
	keys["createdAt"] = createdAt;

	// @ts-ignore
	return keys;

};