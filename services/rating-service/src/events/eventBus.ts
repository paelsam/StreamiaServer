import amqp from "amqplib";
import { config } from "../config";

let channel: amqp.Channel | null = null;

export const initEventBus = async () => {
  const connection = await amqp.connect(config.rabbitmqUrl);
  channel = await connection.createChannel();

  await channel.assertExchange("domain.events", "topic", { durable: true });

  console.log("🐰 Rating Service connected to RabbitMQ");
};

export const publishEvent = async (event: string, payload: any) => {
  if (!channel) {
    throw new Error("EventBus not initialized");
  }

  channel.publish(
    "domain.events",
    event,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
};