# AuraDerma - Cliente Web

Sitio web de e-commerce para AuraDerma, marca especializada en productos dermatológicos de alta calidad.

## 🌸 Características

- **Catálogo de Productos**: Visualización elegante de productos con carrusel de imágenes
- **Chatbot IA**: Asistente virtual powered by Google Gemini para consultas y recomendaciones
- **Blog de Skincare**: Artículos educativos sobre cuidado de la piel
- **Carrito de Compras**: Sistema completo de gestión de pedidos
- **Integración WhatsApp**: Envío directo de pedidos a WhatsApp Business
- **Diseño Responsivo**: Optimizado para móviles, tablets y desktop

## 🚀 Tecnologías

- **React 19** - Framework de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Styling (vía CDN)
- **Firebase Firestore** - Base de datos en tiempo real
- **Google Gemini AI** - Chatbot inteligente
- **Font Awesome** - Iconografía

## 📋 Prerequisitos

- Node.js 20.x o superior
- npm 10.x o superior

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/proyectosdfvr/aura_derm_client.git
cd aura_derm_client
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear archivo `.env.local` con:
```env
GEMINI_API_KEY=tu_api_key_aqui
```

4. Ejecutar en desarrollo:
```bash
npm run dev
```

5. Build para producción:
```bash
npm run build
```

## 🌐 Deployment

### Render

El proyecto está configurado para deployment automático en Render:

1. Conectar el repositorio de GitHub a Render
2. Render detectará automáticamente `render.yaml`
3. Configurar la variable de entorno `GEMINI_API_KEY` en Render
4. El sitio se desplegará automáticamente

### Variables de Entorno en Producción

- `GEMINI_API_KEY`: API Key de Google Gemini AI

## 📁 Estructura del Proyecto

```
aura_derm_client/
├── public/
│   └── favicon.png          # Icono de la marca
├── src/
│   ├── index.html           # HTML principal
│   └── index.tsx            # Componente principal React
├── .env.local               # Variables de entorno (no commitear)
├── .gitignore              # Archivos ignorados por git
├── package.json            # Dependencias
├── tsconfig.json           # Configuración TypeScript
├── vite.config.ts          # Configuración Vite
└── render.yaml             # Configuración Render

```

## 🎨 Paleta de Colores

- **Rosa Principal**: #FF6B9D
- **Rosa Secundario**: #C74375
- **Fondos**: Degradados de rosa suave

## 📱 Características del Chatbot

- Consultas sobre productos
- Recomendaciones personalizadas según tipo de piel
- Información sobre ingredientes
- Generación de pedidos directos
- Integración con WhatsApp para finalizar compras

## 🛒 Flujo de Compra

1. Explorar catálogo de productos
2. Agregar productos al carrito
3. Revisar carrito
4. Consultar con chatbot (opcional)
5. Enviar pedido por WhatsApp
6. Confirmación y pago con el vendedor

## 🔐 Firebase Configuration

El proyecto usa Firebase Firestore para:
- Gestión de productos
- Inventario en tiempo real
- Sincronización con panel de administración

## 👥 Contribuir

Este es un proyecto privado. Para contribuciones, contactar al equipo de desarrollo.

## 📄 Licencia

Propietario - Todos los derechos reservados © 2025 AuraDerma

## 📞 Soporte

Para soporte técnico o consultas:
- WhatsApp: +57 301 772 7626
- Email: soporte@auraderma.com

---

Desarrollado con ❤️ para AuraDerma
