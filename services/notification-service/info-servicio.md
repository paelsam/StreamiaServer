## Puerto: 3006

## Descripción
Servicio dedicado al envio de notificaciones por email. Es un consumidor puro de eventos, no expone API REST publica.

## Responsabilidades
* Alertas
* Restablecer contraseña
* Bienvenida
* Correos

## Arquitectura
* NO recibe de API Gateway layer
* NO tiene base de datos
* Recibe del Message Broker RabbitMQ
* Envía al SMTP server

## Flujo de Eventos con RabbitMQ
User Service -> user.events Exchange -> notifications.queue -> Notification Service

## Diagrama de flujo
* User Service y Movie Service
* notification.send_emai
* RabbitMQ: notifications.queue
* Servicio: Event Consumer -> Email Service  -> Templates / External: SMTP Server

## Configuracion de Docker Compose
### Archivo: infrastructure/docker-compose.yml

```yaml
  notification-service:
    build:
      context: ..
      dockerfile: services/notification-service/Dockerfile
    container_name: streamia-notification-service
    restart: unless-stopped
    ports:
      - "3006:3006"
    environment:
      NODE_ENV: development
      PORT: 3006
      MONGODB_URI: mongodb://streamia:streamia_secret@mongodb:27017/streamia_{db_name}?authSource=admin
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://streamia:streamia@rabbitmq:5672
      # Variables adicionales segun servicio
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - streamia-network
```

## Eventos (definidos en shared)
```
// Notification Events
  NOTIFICATION_SEND_EMAIL: 'notification.send_email',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',

// Notification queues
  NOTIFICATIONS_QUEUE: 'notifications.queue',
```