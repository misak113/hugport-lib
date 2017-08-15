
export const MyAction = 'My.MyAction';
export interface MyAction {
	type: typeof MyAction;
	do: 'ever';
}

export const YourAction = 'My.YourAction';
export interface YourAction {
	type: typeof YourAction;
	does: 'never';
}
