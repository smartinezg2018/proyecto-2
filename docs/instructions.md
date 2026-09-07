## Información sobre el proyecto: 
La administración de un edificio implica la gestión de múltiples procesos que requieren un control constante, como el inventario de activos, el mantenimiento de equipos, la administración de pólizas de seguro, la facturación de cuotas, el seguimiento de la cartera, la planificación presupuestal y la ejecución de proyectos. Cuando estos procesos se realizan de manera manual o mediante herramientas independientes, es frecuente que la información se encuentre dispersa, dificultando su actualización, consulta y seguimiento, lo que puede generar inconsistencias, retrasos en las operaciones y una menor capacidad para tomar decisiones oportunas.

## Solución Propuesta
La solución consiste en implementar un sistema de gestión administrativa que centralice la información y automatice los principales procesos del edificio. La plataforma permitirá registrar, consultar y actualizar los activos, gestionar los mantenimientos y las pólizas de seguro, generar y controlar la facturación y los pagos, administrar el presupuesto anual y realizar el seguimiento de proyectos desde su planificación hasta su finalización. De esta manera, se mejora la organización de la información, se facilita la trazabilidad de las operaciones y se optimiza la eficiencia en la administración del edificio.

Adicionalmente, si el alcance y el tiempo de desarrollo lo permiten, se buscará implementar funcionalidades complementarias orientadas a la gestión del presupuesto (incluyendo gastos de personal y de la copropiedad), la facturación, la administración de cartera y el registro de ingresos de caja, con el fin de ofrecer una solución más completa para la gestión financiera del edificio.

## Arquitectura 
El sistema será desarrollado bajo una arquitectura monolítica, en la que tanto la lógica de negocio como el acceso a datos estarán integrados en una única aplicación. Para la interfaz de usuario se utilizará React, permitiendo una experiencia web dinámica e interactiva para el administrador del edificio. El backend será implementado con Node.js, encargado de procesar las solicitudes, aplicar las reglas de negocio y gestionar la comunicación con la base de datos. Para el almacenamiento de la información se empleará MySQL, una base de datos relacional que permitirá gestionar de forma estructurada e íntegra los datos relacionados con activos, mantenimientos, seguros, facturación, presupuestos y demás módulos del sistema. En cuanto al hardware, la aplicación se ejecutará sobre un servidor capaz de alojar el backend y la base de datos, mientras que el usuario accederá al sistema mediante un computador con un navegador web y conexión a Internet, sin requerir dispositivos o infraestructura especializada.

## Descripción de los componentes
1. Cliente y Navegador
Nombre: Dispositivo Local / Navegador Web (Chrome/Firefox)
Función: Es el punto de entrada del usuario final. Ejecuta el entorno donde interactúa el usuario y gestiona el envío de solicitudes (HTTP Requests) hacia la aplicación web, así como la recepción e interpretación de las respuestas (HTTP Responses).
Tecnología utilizada: Navegador web (Google Chrome, Mozilla Firefox, etc.) en el dispositivo local (localhost).
2. Frontend (Capa de Interfaz de Usuario)
Nombre: React.js
Función: Encargado de renderizar los elementos visuales (UI Components) y gestionar el estado local de la interfaz (State Management). Envía y recibe datos en formato JSON mediante peticiones HTTP asíncronas hacia el servidor de Backend.
Tecnología utilizada: React.js (desplegado localmente en el puerto localhost:3000).
3. Backend (Capa de Lógica y API)
Nombre: Node.js + Express
Función: Servidor web que define los puntos de acceso (REST API Endpoints) y las rutas de la aplicación (como /api/items y /api/users). Recibe las peticiones JSON del Frontend, ejecuta la lógica de negocio y realiza las operaciones necesarias sobre la base de datos.
Tecnología utilizada: Node.js, Express.js (desplegado localmente en el puerto localhost:5000).
4. Base de Datos (Capa de Persistencia)
Nombre: MySQL Server
Función: Sistema de almacenamiento persistente encargado de guardar y recuperar los datos del sistema organizados en tablas y relaciones (Tables, Rows). Atiende las peticiones de lectura y escritura (CRUD Operations y consultas SQL) enviadas por el Backend, garantizando la integridad transaccional (propiedades ACID).
Tecnología utilizada: MySQL (Base de datos Relacional, ejecutada en localhost:3306).