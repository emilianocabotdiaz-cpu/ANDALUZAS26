# ANDALUZAS26 - TOP55

Aplicacion web para gestionar el seguimiento de VOTs en jornada electoral.

## Funciones

- Panel de control general.
- Acceso por perfiles: panel de control, interactor y responsable.
- Registro de entradas por referencia.
- Vista de responsables con sus VOTs asignados.
- Alta manual de VOTs, responsables e interactores.
- Importacion desde Excel.

## Formato Excel

El archivo debe incluir estas columnas:

```text
referencia | nombre | telefono | responsable
```

## Claves de prueba

- Panel de control: `17052026`
- Responsable: `juan` / `1234`
- Interactor: `interactor1` / `1234`

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue

Vercel debe detectar este proyecto como Vite. El comando de build es:

```bash
npm run build
```
