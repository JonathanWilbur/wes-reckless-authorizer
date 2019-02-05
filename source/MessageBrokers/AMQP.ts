import ConfigurationSource from "../ConfigurationSource";
import MessageBroker from "../MessageBroker";
import { Message, Channel, ConsumeMessage, Options } from 'amqplib';
const amqp = require("amqplib/callback_api");
const uuidv4 : () => string = require("uuid/v4");

// TODO: Add content_type
// TODO: Add expiration, plus setTimeout to fire the events to remove the event handlers.

export default
class AMQPMessageBroker implements MessageBroker {

    public readonly id : string = `urn:uuid:${uuidv4()}`;
    public readonly creationTime : Date = new Date();
    
    private readonly server_host! : string;
    private readonly server_port! : number;
    private connection! : any;
    private channel! : Channel;

    constructor (
        readonly configuration : ConfigurationSource
    ) {
        this.server_host = configuration.queue_server_hostname;
        this.server_port = configuration.queue_server_tcp_listening_port;
        amqp.connect(`amqp://${this.server_host}:${this.server_port}`, (err : Error, connection : any) => {
            if (err) { console.log(err); return; }
            this.connection = connection;

            connection.createChannel((err : Error, channel : Channel) => {
                if (err) { console.log(err); return; }
                this.channel = channel;

                channel.assertExchange("events", "topic", { durable: true });
                channel.assertQueue("events.authorization", { durable: false });
                channel.bindQueue("events.authorization", "events", "authorization");

                channel.assertQueue("authorization", { durable: false });
                channel.assertQueue("authorization.responses", { durable: false });

                channel.consume("authorization", (message : ConsumeMessage | null) => {
                    if (!message) return;
                    if (!message.properties.correlationId) return;
                    const authorizationRequest : any = JSON.parse(message.content.toString());
                    authorizationRequest["authorized"] = true;
                    this.channel.sendToQueue("authorization.responses",
                        Buffer.from(JSON.stringify(authorizationRequest)), {
                        correlationId: message.properties.correlationId
                    });
                }, { noAck: true });
            });
        });
    }

    public publishEvent (topic : string, message : object) : void {
        this.channel.publish("events", topic, Buffer.from(JSON.stringify(message)));
    }

    public close () : void {
        this.channel.close();
        this.connection.close();
    }

}