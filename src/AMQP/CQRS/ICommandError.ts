
export default ICommandError;
interface ICommandError<TErrorType extends string = string> {
	type: TErrorType;
}
