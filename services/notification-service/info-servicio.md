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

