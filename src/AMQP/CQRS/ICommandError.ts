
export default ICommandError;
interface ICommandError<Type extends string> {
	type: Type;
}
