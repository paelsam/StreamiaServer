import amqp, { ConsumeMessage } from "amqplib";
import Rating from "../models/Rating";
import { config } from "../config";

export const initConsumers = async () => {
  const connection = await amqp.connect(config.rabbitmqUrl);
  const channel = await connection.createChannel();

  const exchange = "domain.events";
  await channel.assertExchange(exchange, "topic", { durable: true });

  const q = await channel.assertQueue("", { exclusive: true });

  await channel.bindQueue(q.queue, exchange, "user.deleted");
  await channel.bindQueue(q.queue, exchange, "movie.deleted");

  channel.prefetch(10);

  channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const event = msg.fields.routingKey;
    const data = JSON.parse(msg.content.toString());

    switch (event) {
      case "user.deleted":
        await Rating.deleteMany({ userId: data.userId });
        break;

      case "movie.deleted":
        await Rating.deleteMany({ movieId: data.movieId });
        break;
    }

    channel.ack(msg);
  });

  console.log("🎧 Rating Service listening to domain events");
};