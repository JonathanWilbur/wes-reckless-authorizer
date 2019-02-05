"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib/callback_api");
const uuidv4 = require("uuid/v4");
class AMQPMessageBroker {
    constructor(configuration) {
        this.configuration = configuration;
        this.id = `urn:uuid:${uuidv4()}`;
        this.creationTime = new Date();
        this.server_host = configuration.queue_server_hostname;
        this.server_port = configuration.queue_server_tcp_listening_port;
        amqp.connect(`amqp://${this.server_host}:${this.server_port}`, (err, connection) => {
            if (err) {
                console.log(err);
                return;
            }
            this.connection = connection;
            connection.createChannel((err, channel) => {
                if (err) {
                    console.log(err);
                    return;
                }
                this.channel = channel;
                channel.assertExchange("events", "topic", { durable: true });
                channel.assertQueue("events.authorization", { durable: false });
                channel.bindQueue("events.authorization", "events", "authorization");
                channel.assertQueue("authorization", { durable: false });
                channel.assertQueue("authorization.responses", { durable: false });
                channel.consume("authorization", (message) => {
                    if (!message)
                        return;
                    if (!message.properties.correlationId)
                        return;
                    const authorizationRequest = JSON.parse(message.content.toString());
                    authorizationRequest["authorized"] = true;
                    this.channel.sendToQueue("authorization.responses", Buffer.from(JSON.stringify(authorizationRequest)), {
                        correlationId: message.properties.correlationId
                    });
                }, { noAck: true });
            });
        });
    }
    publishEvent(topic, message) {
        this.channel.publish("events", topic, Buffer.from(JSON.stringify(message)));
    }
    close() {
        this.channel.close();
        this.connection.close();
    }
}
exports.default = AMQPMessageBroker;
//# sourceMappingURL=AMQP.js.map