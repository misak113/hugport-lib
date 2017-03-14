
import * as Policy from 'amqp10/lib/policies/policy';
export interface ReceiverLinkAttach extends Policy.ReceiverLinkAttach {
	manually?: boolean;
}
