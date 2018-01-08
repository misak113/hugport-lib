
import { createAmqpConnection } from '../../src/AMQP/amqpConnectionFactory';
const parameters = require('../../config/parameters');

export const amqpConnection = createAmqpConnection(parameters.amqpDsn);
