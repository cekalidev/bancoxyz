# BancoXYZ

Aplicación móvil de banca hecha con Expo y React Native: inicio de sesión, consulta del saldo, transferencias
(también programadas a una fecha futura) y listado de transferencias con búsqueda y filtros.

## Requisitos

- Node.js 26 y npm 11 (verificado con Node 26.10.0 y npm 11.19.1).
- JDK 17 o superior para compilar en Android (verificado con OpenJDK 25).
- Android Studio con el SDK de Android y un emulador, o un dispositivo Android con la depuración USB activada.
- Para los flujos funcionales: Maestro y un JDK 17 o 21 (se detalla en «Pruebas»).

## Instalación

```bash
npm ci
```

## Ejecución

Servidor de desarrollo de Expo:

```bash
npx expo start
```

Compilación de debug, que se instala y se abre en el emulador o en el dispositivo Android conectado (también
con `npm run android`):

```bash
npx expo run:android
```

Con la compilación instalada, `npx expo start` sirve el código y basta con abrir la app en el emulador o el
dispositivo.

## Credenciales de prueba

Las cuentas de prueba de la API:

| ID  | Nombre        | Email             | Contraseña |
| --- | ------------- | ----------------- | ---------- |
| 1   | Gabriel Topaz | gabriel@topaz.com | 1111       |
| 2   | Alejo Topaz   | alejo@topaz.com   | 2222       |
| 3   | Wilson Topaz  | wilson@topaz.com  | 3333       |

## Pruebas

Comprobaciones de calidad, en este orden:

```bash
npm run typecheck      # tipos con TypeScript estricto
npx expo lint          # ESLint, también las reglas de capas y de negocio
npm run format:check   # formato con Prettier
npm test               # tests unitarios y de integración con Jest
npm run test:coverage  # tests con cobertura; falla por debajo del 80 %
```

`npm run test:coverage` exige un 80 % de líneas, ramas, funciones y sentencias, y deja el informe en `coverage/`.

### Flujos funcionales con Maestro

Los flujos de `.maestro/` recorren la app en un emulador o dispositivo Android.

1. Instalar Maestro, que recomienda Java 17 o 21:

   ```bash
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   ```

   Con versiones más recientes (por ejemplo, Java 25) funciona, aunque muestra avisos de `sun.misc.Unsafe`. Solo si
   falla, apuntar `JAVA_HOME` a un JDK 21 al ejecutar Maestro: `JAVA_HOME=/ruta/al/jdk-21 maestro test .maestro/`.

2. Instalar la compilación release en el emulador o dispositivo conectado:

   ```bash
   npx expo run:android --variant release
   ```

3. Ejecutar todos los flujos con un solo comando:

   ```bash
   maestro test .maestro/
   ```

Los flujos usan la API real, así que necesitan conexión a internet. Cada flujo empieza sin sesión e inicia la suya
con las credenciales de prueba, y ninguno envía transferencias: el de transferencia llega a la confirmación y vuelve
atrás.

## Estructura de carpetas

El código está organizado por funcionalidades: cada una vive en su carpeta de `src/features/`.

```text
src/
├── app/          rutas de Expo Router; solo reexportan la pantalla de una funcionalidad
├── features/     una carpeta por funcionalidad, con sus pantallas, componentes, hooks y lógica pura
│   ├── auth/           inicio y cierre de sesión
│   ├── home/           Inicio con el saldo
│   ├── shell/          arranque de la app, fuentes y navegación
│   ├── transfers/      nueva transferencia, confirmación y resultado
│   └── transfer-list/  listado de transferencias con búsqueda y filtros
├── services/     cliente de la API (un archivo por endpoint) y almacenamiento cifrado
├── components/   componentes de interfaz reutilizables, sin lógica de negocio
├── hooks/        hooks genéricos
├── utils/        funciones puras de moneda, fechas y textos
├── theme/        colores, tipografía, espaciados y demás tokens de diseño
├── types/        declaraciones globales de tipos
└── test/         utilidades compartidas de los tests
```

Las reglas de dependencias entre capas están en `eslint/` y las comprueba `npx expo lint`.

## Funcionalidades

- **Inicio de sesión**: correo y contraseña validados antes de enviar, con sesión guardada en el almacenamiento
  cifrado para no volver a entrar en cada apertura, y cierre de sesión con confirmación desde la cabecera.
- **Inicio**: saldo de la cuenta con el formato de la moneda y un botón de ojo para ocultarlo ante miradas ajenas;
  carga con skeletons y avisos claros si algo falla.
- **Nueva transferencia**: destinatario por documento, valor con tope en el saldo y fecha de hoy o programada a una
  fecha futura. Antes de enviar se muestra una pantalla de confirmación, y hay protección contra duplicados: si en
  los últimos minutos se envió una transferencia igual, se avisa y se pide confirmar de nuevo; si la respuesta no
  llega, el resultado queda como incierto y no se reintenta solo.
- **Listado de transferencias**: transferencias de la cuenta con búsqueda y filtros por nombre, valor y fecha,
  combinables entre sí, con un contador de resultados.

## Decisiones técnicas

- **Stack**: Expo SDK 58 con Expo Router, React Native 0.88 y TypeScript estricto; Jest con React Native Testing
  Library para los tests, ESLint y Prettier para el código.
- **Arquitectura por funcionalidades**: cada funcionalidad expone un índice público y las capas siguen el orden
  ruta → pantalla → hook → servicio → dominio puro. El lint rechaza los imports que se saltan ese orden.
- **Estado**: Zustand solo para el estado compartido entre pantallas (la sesión y las transferencias enviadas). Los
  formularios, los filtros y las peticiones usan estado local y hooks.
- **Pruebas**: pirámide con comprobaciones estáticas (tipos y lint), muchas pruebas unitarias, pruebas de integración
  de pantallas con la red simulada y pocos flujos funcionales con Maestro. Las entradas críticas se prueban con
  particiones de equivalencia y valores límite, también en los caminos de error.
- **Destinatario por documento**: la API de transferencias solo recibe `payeerDocument`, no un nombre, así que la app
  identifica al destinatario solo por su documento (CPF de 11 dígitos o CNPJ de 14, validando únicamente la
  longitud). El nombre del destinatario aparece en el listado porque lo devuelve la API.
- **API simulada**: la API de la prueba no guarda las transferencias, así que el saldo y el listado no cambian tras
  transferir; la app muestra el resultado del envío y vuelve a pedir los datos a la API, sin inventar movimientos.

## Plataformas

- Android: verificada en el emulador (Android 17, API 37) con la compilación release.
- iOS: solo configurada, sin verificar en un dispositivo.

## Licencia

Licencia MIT © 2026 Cesar Avendaño

El texto completo está en `LICENSE`. Las tipografías Montserrat y Cabin se distribuyen con la licencia SIL Open
Font License, incluida en `assets/fonts/licenses/`.
